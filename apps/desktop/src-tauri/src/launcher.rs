//! Desktop Launcher commands — local sidecar start, remote connect, mDNS browse, recent hosts.

use std::net::{IpAddr, Ipv4Addr};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use mdns_sd::{ServiceDaemon, ServiceEvent};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

use crate::{
    append_sidecar_file_log, append_sidecar_log, assert_node_path_usable, check_health_at,
    check_health_at_timeout, format_sidecar_failure, nav_url, path_for_node, startup_failure_message,
    UI_PORT, HEALTHCHECK_INTERVAL, SERVER_ENTRY_REL, STARTUP_TIMEOUT,
};

const RECENT_CAP: usize = 5;
const MDNS_BROWSE_MS: u64 = 2_500;
const MDNS_TOTAL_BUDGET_MS: u64 = 4_000;
const SERVICE_TYPE: &str = "_stagesync._tcp.local.";
const VERSION_MISMATCH_PREFIX: &str = "VERSION_MISMATCH:";
const RECENT_HEALTH_TIMEOUT_MS: u64 = 1_500;

#[derive(Default)]
pub struct SidecarRuntime {
    pub child: Mutex<Option<CommandChild>>,
    pub log_tail: Mutex<String>,
    pub log_path: Mutex<Option<PathBuf>>,
    pub starting: Mutex<bool>,
    /// Surfaced once on next Launcher bootstrap (e.g. mid-session sidecar crash).
    pub pending_error: Mutex<Option<String>>,
}

impl SidecarRuntime {
    /// Stop the managed local host (no-op if none). Safe to call from exit / window-close paths.
    pub fn kill_child(&self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(child) = guard.take() {
                let _ = child.kill();
            }
        }
        if let Ok(mut g) = self.starting.lock() {
            *g = false;
        }
    }
}

/// Origin URL of the bundled Launcher (captured at setup before any navigate).
#[derive(Default)]
pub struct LauncherNav {
    pub url: Mutex<Option<String>>,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherBootstrap {
    pub has_sidecar: bool,
    pub stagesync_url: Option<String>,
    pub expected_version: String,
    pub last_error: Option<String>,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredHost {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub version: Option<String>,
    pub url: String,
    pub hostname: Option<String>,
    pub project: Option<String>,
    pub status: Option<String>,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentHost {
    pub url: String,
    pub label: String,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct LauncherStatusPayload {
    message: String,
    error: bool,
}

fn emit_status(app: &AppHandle, message: impl Into<String>, error: bool) {
    let _ = app.emit(
        "launcher-status",
        LauncherStatusPayload {
            message: message.into(),
            error,
        },
    );
}

fn recent_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let data = dir.join("StageSync");
    let _ = std::fs::create_dir_all(&data);
    Ok(data.join("launcher-recent.json"))
}

fn normalize_origin(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("Podaj adres hosta (np. http://192.168.1.10:4000)".into());
    }
    let with_scheme = if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("http://{trimmed}")
    };
    let parsed = url::Url::parse(&with_scheme).map_err(|e| format!("Nieprawidłowy URL: {e}"))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("Dozwolone tylko http:// lub https://".into());
    }
    let host = parsed.host_str().ok_or("Brak hosta w URL")?;
    let port = parsed.port_or_known_default().unwrap_or(80);
    Ok(format!("{}://{}:{}", parsed.scheme(), host, port))
}

fn admin_url(origin: &str) -> String {
    format!("{}/admin", origin.trim_end_matches('/'))
}

fn sanitize_recent_list(raw: Vec<RecentHost>) -> Vec<RecentHost> {
    let mut out: Vec<RecentHost> = Vec::new();
    for item in raw {
        let Ok(url) = normalize_origin(&item.url) else {
            continue;
        };
        if out.iter().any(|h| h.url == url) {
            continue;
        }
        let label = item.label.trim();
        out.push(RecentHost {
            url,
            label: if label.is_empty() {
                "StageSync".into()
            } else {
                label.to_string()
            },
        });
        if out.len() >= RECENT_CAP {
            break;
        }
    }
    out
}

fn load_recent(app: &AppHandle) -> Vec<RecentHost> {
    let Ok(path) = recent_path(app) else {
        return Vec::new();
    };
    let list: Vec<RecentHost> = std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    sanitize_recent_list(list)
}

fn push_recent(app: &AppHandle, url: &str, label: &str) -> Result<(), String> {
    let path = recent_path(app)?;
    let mut list = load_recent(app);
    list.retain(|h| h.url != url);
    list.insert(
        0,
        RecentHost {
            url: url.to_string(),
            label: label.to_string(),
        },
    );
    list.truncate(RECENT_CAP);
    let json = serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| {
        let lower = e.to_string().to_ascii_lowercase();
        if lower.contains("permission") || lower.contains("eacces") || lower.contains("access is denied") {
            "Brak uprawnień do zapisu listy ostatnich hostów.".into()
        } else {
            e.to_string()
        }
    })
}

fn fallback_launcher_url() -> String {
    #[cfg(dev)]
    {
        return "http://127.0.0.1:1420/".into();
    }
    #[cfg(not(dev))]
    {
        if cfg!(windows) || cfg!(target_os = "android") {
            "http://tauri.localhost/".into()
        } else {
            "tauri://localhost/".into()
        }
    }
}

fn navigate_to_launcher(app: &AppHandle, nav: &LauncherNav) -> Result<(), String> {
    let stored = nav
        .url
        .lock()
        .ok()
        .and_then(|g| g.clone())
        .filter(|s| !s.trim().is_empty());
    let target = stored.unwrap_or_else(fallback_launcher_url);
    let window = app
        .get_webview_window("main")
        .ok_or("Brak okna głównego")?;
    window
        .navigate(target.parse().map_err(|e| format!("{e}"))?)
        .map_err(|e| e.to_string())
}

/// Prefer private LAN IPv4; skip loopback / link-local; deprioritize Docker bridge `172.17/16`.
pub(crate) fn pick_mdns_ipv4<'a, I>(addrs: I) -> Option<String>
where
    I: IntoIterator<Item = &'a IpAddr>,
{
    let mut usable: Vec<Ipv4Addr> = Vec::new();
    let mut fallback: Vec<Ipv4Addr> = Vec::new();
    for addr in addrs {
        let IpAddr::V4(v4) = addr else {
            continue;
        };
        if v4.is_unspecified() || v4.is_multicast() || v4.is_broadcast() {
            continue;
        }
        if v4.is_loopback() || v4.is_link_local() {
            fallback.push(*v4);
            continue;
        }
        usable.push(*v4);
    }
    let pool = if !usable.is_empty() { usable } else { fallback };
    if pool.is_empty() {
        return None;
    }
    let mut ranked = pool;
    ranked.sort_by_key(|ip| {
        let docker = ip.octets()[0] == 172 && ip.octets()[1] == 17;
        let private = ip.is_private();
        (docker, !private)
    });
    ranked.first().map(|ip| ip.to_string())
}

#[tauri::command]
pub fn get_launcher_bootstrap(
    app: AppHandle,
    runtime: State<'_, Arc<SidecarRuntime>>,
) -> Result<LauncherBootstrap, String> {
    let expected_version = app.package_info().version.to_string();
    let resource_dir = app.path().resource_dir().ok();
    let has_sidecar = resource_dir
        .as_ref()
        .map(|rd| {
            path_for_node(&rd.join("resources").join("sidecar").join("server").join(SERVER_ENTRY_REL))
                .exists()
        })
        .unwrap_or(false);
    let stagesync_url = std::env::var("STAGESYNC_URL").ok().filter(|s| !s.trim().is_empty());
    let last_error = runtime
        .pending_error
        .lock()
        .ok()
        .and_then(|mut g| g.take());
    Ok(LauncherBootstrap {
        has_sidecar,
        stagesync_url,
        expected_version,
        last_error,
    })
}

#[tauri::command]
pub fn launcher_list_recent(app: AppHandle) -> Result<Vec<RecentHost>, String> {
    Ok(load_recent(&app))
}

#[tauri::command]
pub fn get_sidecar_log_tail(runtime: State<'_, Arc<SidecarRuntime>>) -> Result<String, String> {
    let guard = runtime.log_tail.lock().map_err(|e| e.to_string())?;
    Ok(guard.clone())
}

#[tauri::command]
pub async fn cancel_local_host(runtime: State<'_, Arc<SidecarRuntime>>) -> Result<(), String> {
    runtime.kill_child();
    Ok(())
}

/// Kill local sidecar (if any) and navigate WebView back to the bundled Launcher.
#[tauri::command]
pub async fn return_to_launcher(
    app: AppHandle,
    runtime: State<'_, Arc<SidecarRuntime>>,
    nav: State<'_, Arc<LauncherNav>>,
) -> Result<(), String> {
    runtime.kill_child();
    navigate_to_launcher(&app, nav.as_ref())
}

#[tauri::command]
pub async fn discover_lan_hosts() -> Result<Vec<DiscoveredHost>, String> {
    let browse = tokio::task::spawn_blocking(|| {
        let daemon = ServiceDaemon::new().map_err(|e| format!("mDNS: {e}"))?;
        let receiver = daemon
            .browse(SERVICE_TYPE)
            .map_err(|e| format!("mDNS browse: {e}"))?;
        let deadline = Instant::now() + Duration::from_millis(MDNS_BROWSE_MS);
        let mut out: Vec<DiscoveredHost> = Vec::new();
        while Instant::now() < deadline {
            let wait = deadline.saturating_duration_since(Instant::now());
            if wait.is_zero() {
                break;
            }
            match receiver.recv_timeout(wait) {
                Ok(ServiceEvent::ServiceResolved(info)) => {
                    let host = info.get_hostname().trim_end_matches('.').to_string();
                    let port = info.get_port();
                    let props = info.get_properties();
                    let txt = |key: &str| -> Option<String> {
                        props
                            .iter()
                            .find(|p| p.key() == key)
                            .map(|p| p.val_str().to_string())
                            .filter(|s| !s.trim().is_empty())
                    };
                    let version = txt("version");
                    let hostname = txt("hostname");
                    let project = txt("project");
                    let status = txt("status");
                    let ip = pick_mdns_ipv4(info.get_addresses().iter())
                        .unwrap_or_else(|| host.clone());
                    let url = format!("http://{ip}:{port}");
                    if out.iter().any(|h| h.url == url) {
                        continue;
                    }
                    out.push(DiscoveredHost {
                        name: info.get_fullname().to_string(),
                        host: ip,
                        port,
                        version,
                        url,
                        hostname,
                        project,
                        status,
                    });
                }
                Ok(_) => {}
                Err(flume::RecvTimeoutError::Timeout) => break,
                Err(_) => break,
            }
        }
        // Avoid daemon.shutdown() — can block indefinitely on some platforms.
        drop(receiver);
        drop(daemon);
        Ok(out)
    });

    match tokio::time::timeout(Duration::from_millis(MDNS_TOTAL_BUDGET_MS), browse).await {
        Ok(Ok(result)) => result,
        Ok(Err(join_err)) => Err(format!("mDNS task: {join_err}")),
        Err(_) => Err("Skan mDNS przekroczył limit czasu.".into()),
    }
}

/// Quick online probe for Launcher "Ostatnio używane" (1.5 s). Errors → offline.
#[tauri::command]
pub async fn probe_host_health(url: String) -> Result<bool, String> {
    let origin = match normalize_origin(&url) {
        Ok(o) => o,
        Err(_) => return Ok(false),
    };
    let parsed = match url::Url::parse(&origin) {
        Ok(u) => u,
        Err(_) => return Ok(false),
    };
    let host = match parsed.host_str() {
        Some(h) => h.to_string(),
        None => return Ok(false),
    };
    let port = parsed.port_or_known_default().unwrap_or(80) as u16;
    let timeout = Duration::from_millis(RECENT_HEALTH_TIMEOUT_MS);
    match check_health_at_timeout(&host, port, timeout).await {
        Ok(Some(_)) => Ok(true),
        _ => Ok(false),
    }
}

#[tauri::command]
pub async fn connect_remote_host(
    app: AppHandle,
    url: String,
    force: Option<bool>,
) -> Result<(), String> {
    let origin = normalize_origin(&url)?;
    let parsed = url::Url::parse(&origin).map_err(|e| e.to_string())?;
    let host = parsed.host_str().ok_or("Brak hosta")?.to_string();
    let port = parsed.port_or_known_default().unwrap_or(80);
    emit_status(&app, format!("Sprawdzam {origin}…"), false);

    let health = check_health_at(&host, port as u16)
        .await
        .map_err(|e| format!("Nie można połączyć z {origin}: {e}"))?;
    let Some(health) = health else {
        return Err(format!(
            "Host {origin} nie odpowiada na /api/health (HTTP ≠ 200)."
        ));
    };

    let expected = app.package_info().version.to_string();
    if health.version != expected && !force.unwrap_or(false) {
        return Err(format!(
            "{VERSION_MISMATCH_PREFIX}{}:{}",
            health.version, expected
        ));
    }

    let label = format!("StageSync {}", health.version);
    let _ = push_recent(&app, &origin, &label);

    let target = admin_url(&origin);
    let window = app
        .get_webview_window("main")
        .ok_or("Brak okna głównego")?;
    window
        .navigate(target.parse().map_err(|e| format!("{e}"))?)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn start_local_host(
    app: AppHandle,
    runtime: State<'_, Arc<SidecarRuntime>>,
) -> Result<(), String> {
    {
        let mut starting = runtime.starting.lock().map_err(|e| e.to_string())?;
        if *starting {
            return Err("Lokalny host już się uruchamia…".into());
        }
        *starting = true;
    }

    let result = start_local_host_inner(app.clone(), runtime.inner().clone()).await;

    if let Ok(mut starting) = runtime.starting.lock() {
        *starting = false;
    }
    result
}

async fn start_local_host_inner(
    app: AppHandle,
    runtime: Arc<SidecarRuntime>,
) -> Result<(), String> {
    // Kill previous managed child, then any orphaned stagesync-host still on :4000
    // (Force Quit / crash leaves PPID 1 and blocks the next local start).
    runtime.kill_child();
    let reclaimed = crate::reclaim_ui_port_orphan();
    if reclaimed > 0 {
        emit_status(
            &app,
            format!("Zatrzymano porzucony lokalny host (port {UI_PORT})…"),
            false,
        );
    }
    if let Ok(mut log) = runtime.log_tail.lock() {
        log.clear();
    }
    if let Ok(mut err) = runtime.pending_error.lock() {
        *err = None;
    }

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Brak katalogu resources: {e}"))?;
    let static_dir = path_for_node(&resource_dir.join("resources").join("sidecar").join("web"));
    let seed_dir = path_for_node(&resource_dir.join("resources").join("sidecar").join("seed"));
    let server_dir = path_for_node(&resource_dir.join("resources").join("sidecar").join("server"));
    let server_entry = server_dir.join(SERVER_ENTRY_REL);

    if !server_entry.exists() {
        return Err(
            "Brak bundla lokalnego hosta. W trybie deweloperskim połącz się ręcznie do uruchomionego serwera."
                .into(),
        );
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Brak app_data_dir: {e}"))?;
    let data_dir = path_for_node(&app_data_dir.join("StageSync"));
    if let Err(e) = std::fs::create_dir_all(&data_dir) {
        let lower = e.to_string().to_ascii_lowercase();
        if lower.contains("permission") || lower.contains("eacces") || lower.contains("access is denied") {
            return Err(
                "Brak uprawnień do katalogu danych StageSync. Sprawdź uprawnienia folderu aplikacji."
                    .into(),
            );
        }
        return Err(format!("Nie można utworzyć katalogu danych: {e}"));
    }
    let logs_dir = data_dir.join("logs");
    let _ = std::fs::create_dir_all(&logs_dir);
    let sidecar_log_path = logs_dir.join("sidecar.log");
    if let Ok(mut p) = runtime.log_path.lock() {
        *p = Some(sidecar_log_path.clone());
    }

    assert_node_path_usable(&server_dir, "server_dir")?;
    assert_node_path_usable(&static_dir, "static_dir")?;
    assert_node_path_usable(&seed_dir, "seed_dir")?;
    assert_node_path_usable(&data_dir, "data_dir")?;

    let expected_version = app.package_info().version.to_string();
    emit_status(&app, "Uruchamiam lokalny host…", false);

    let (mut rx, child) = app
        .shell()
        .sidecar("stagesync-host")
        .and_then(|cmd| {
            cmd.args([SERVER_ENTRY_REL])
                .current_dir(&server_dir)
                .env("PORT", UI_PORT.to_string())
                .env(
                    "STAGESYNC_STATIC_DIR",
                    static_dir.to_string_lossy().to_string(),
                )
                .env("STAGESYNC_DATA_DIR", data_dir.to_string_lossy().to_string())
                .env("STAGESYNC_SEED_DIR", seed_dir.to_string_lossy().to_string())
                .env("npm_package_version", expected_version.clone())
                .env("STAGESYNC_SHELL", "desktop")
                .spawn()
        })
        .map_err(|err| {
            let raw = err.to_string();
            let lower = raw.to_ascii_lowercase();
            if lower.contains("eacces")
                || lower.contains("permission denied")
                || lower.contains("access is denied")
            {
                return "Brak uprawnień do uruchomienia lokalnego hosta (stagesync-host). Sprawdź Secure / Defender i uprawnienia instalacji.".into();
            }
            format!(
                "Nie udało się uruchomić lokalnego hosta: {err}\nSprawdź czy stagesync-host nie jest blokowany przez Defender/SmartScreen."
            )
        })?;

    *runtime.child.lock().map_err(|e| e.to_string())? = Some(child);

    let deadline = Instant::now() + STARTUP_TIMEOUT;
    #[allow(unused_assignments)]
    let mut last_health_err = String::new();

    loop {
        match tokio::time::timeout(HEALTHCHECK_INTERVAL, rx.recv()).await {
            Ok(Some(event)) => match event {
                CommandEvent::Stdout(bytes) | CommandEvent::Stderr(bytes) => {
                    let chunk = String::from_utf8_lossy(&bytes);
                    if let Ok(mut log) = runtime.log_tail.lock() {
                        append_sidecar_log(&mut log, &chunk);
                    }
                    append_sidecar_file_log(&sidecar_log_path, &chunk);
                    continue;
                }
                CommandEvent::Error(err) => {
                    let chunk = format!("[shell] {err}");
                    if let Ok(mut log) = runtime.log_tail.lock() {
                        append_sidecar_log(&mut log, &chunk);
                    }
                    append_sidecar_file_log(&sidecar_log_path, &chunk);
                    continue;
                }
                CommandEvent::Terminated(payload) => {
                    let code = payload
                        .code
                        .map(|c| c.to_string())
                        .unwrap_or_else(|| "?".into());
                    let chunk = format!("[shell] sidecar exited (code {code})");
                    if let Ok(mut log) = runtime.log_tail.lock() {
                        append_sidecar_log(&mut log, &chunk);
                    }
                    append_sidecar_file_log(&sidecar_log_path, &chunk);
                    let log_tail = runtime
                        .log_tail
                        .lock()
                        .map(|g| g.clone())
                        .unwrap_or_default();
                    if let Ok(mut guard) = runtime.child.lock() {
                        let _ = guard.take();
                    }
                    return Err(startup_failure_message(
                        &log_tail,
                        Some(&format!("proces hosta zakończył się (kod {code})")),
                    ));
                }
                _ => continue,
            },
            Ok(None) => {
                let log_tail = runtime
                    .log_tail
                    .lock()
                    .map(|g| g.clone())
                    .unwrap_or_default();
                if let Ok(mut guard) = runtime.child.lock() {
                    let _ = guard.take();
                }
                return Err(startup_failure_message(
                    &log_tail,
                    Some("utracono połączenie ze strumieniem sidecara"),
                ));
            }
            Err(_elapsed) => {}
        }

        emit_status(&app, "Czekam na /api/health…", false);

        match check_health_at("127.0.0.1", UI_PORT).await {
            Ok(Some(health)) if health.version == expected_version => {
                let origin = format!("http://127.0.0.1:{UI_PORT}");
                let _ = push_recent(&app, &origin, &format!("Lokalny host {}", health.version));
                let window = app
                    .get_webview_window("main")
                    .ok_or("Brak okna głównego")?;
                window
                    .navigate(nav_url("/admin").parse().map_err(|e| format!("{e}"))?)
                    .map_err(|e| e.to_string())?;

                let log_path = sidecar_log_path.clone();
                let runtime_watch = runtime.clone();
                let app_watch = app.clone();
                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        match event {
                            CommandEvent::Stdout(bytes) | CommandEvent::Stderr(bytes) => {
                                append_sidecar_file_log(
                                    &log_path,
                                    &String::from_utf8_lossy(&bytes),
                                );
                            }
                            CommandEvent::Error(err) => {
                                append_sidecar_file_log(&log_path, &format!("[shell] {err}"));
                            }
                            CommandEvent::Terminated(payload) => {
                                let code = payload
                                    .code
                                    .map(|c| c.to_string())
                                    .unwrap_or_else(|| "?".into());
                                append_sidecar_file_log(
                                    &log_path,
                                    &format!("[shell] sidecar exited (code {code})"),
                                );
                                if let Ok(mut guard) = runtime_watch.child.lock() {
                                    let _ = guard.take();
                                }
                                let msg = format!(
                                    "Lokalny host zatrzymał się niespodziewanie (kod {code}). Uruchom ponownie albo sprawdź log."
                                );
                                if let Ok(mut pending) = runtime_watch.pending_error.lock() {
                                    *pending = Some(msg);
                                }
                                let nav = app_watch.state::<Arc<LauncherNav>>();
                                let _ = navigate_to_launcher(&app_watch, nav.as_ref());
                                break;
                            }
                            _ => {}
                        }
                    }
                });
                return Ok(());
            }
            Ok(Some(health)) => {
                let log_tail = runtime
                    .log_tail
                    .lock()
                    .map(|g| g.clone())
                    .unwrap_or_default();
                if let Ok(mut guard) = runtime.child.lock() {
                    if let Some(child) = guard.take() {
                        let _ = child.kill();
                    }
                }
                return Err(format_sidecar_failure(
                    "port 4000 jest zajęty przez inną wersję StageSync",
                    &format!(
                        "Działa host {found}, a ta aplikacja to {expected}.\nZamknij stare procesy StageSync i spróbuj ponownie.",
                        found = health.version,
                        expected = expected_version,
                    ),
                    &log_tail,
                ));
            }
            Ok(None) => {
                last_health_err = "odpowiedź HTTP bez statusu 200".into();
            }
            Err(e) => {
                last_health_err = e;
            }
        }

        if Instant::now() >= deadline {
            let log_tail = runtime
                .log_tail
                .lock()
                .map(|g| g.clone())
                .unwrap_or_default();
            if let Ok(mut guard) = runtime.child.lock() {
                if let Some(child) = guard.take() {
                    let _ = child.kill();
                }
            }
            let detail = (!last_health_err.is_empty()).then_some(last_health_err.as_str());
            return Err(startup_failure_message(&log_tail, detail));
        }
    }
}

#[cfg(test)]
mod pick_mdns_ipv4_tests {
    use super::*;
    use std::net::IpAddr;

    #[test]
    fn prefers_private_over_docker_bridge() {
        let addrs = [
            IpAddr::V4(Ipv4Addr::new(172, 17, 0, 2)),
            IpAddr::V4(Ipv4Addr::new(192, 168, 1, 20)),
        ];
        assert_eq!(
            pick_mdns_ipv4(addrs.iter()).as_deref(),
            Some("192.168.1.20")
        );
    }

    #[test]
    fn skips_loopback_and_link_local_when_lan_exists() {
        let addrs = [
            IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)),
            IpAddr::V4(Ipv4Addr::new(169, 254, 1, 1)),
            IpAddr::V4(Ipv4Addr::new(10, 0, 0, 5)),
        ];
        assert_eq!(pick_mdns_ipv4(addrs.iter()).as_deref(), Some("10.0.0.5"));
    }

    #[test]
    fn falls_back_to_link_local_when_no_lan() {
        let addrs = [IpAddr::V4(Ipv4Addr::new(169, 254, 10, 2))];
        assert_eq!(
            pick_mdns_ipv4(addrs.iter()).as_deref(),
            Some("169.254.10.2")
        );
    }
}
