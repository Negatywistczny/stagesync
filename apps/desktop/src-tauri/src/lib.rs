use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::UpdaterExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

const UI_PORT: u16 = 4000;
/// First Windows launch often waits on Defender scanning the Node sidecar tree.
#[cfg(target_os = "windows")]
const STARTUP_TIMEOUT: Duration = Duration::from_secs(120);
#[cfg(not(target_os = "windows"))]
const STARTUP_TIMEOUT: Duration = Duration::from_secs(45);
const HEALTHCHECK_INTERVAL: Duration = Duration::from_millis(250);
const SIDECAR_LOG_CAP: usize = 6_000;
/// Relative to sidecar `server/` cwd — avoids passing Win32 `\\?\` absolute paths as Node's main module.
const SERVER_ENTRY_REL: &str = "dist/index.js";

/// Strip Win32 extended-length / verbatim prefixes so Node can realpath the entry.
///
/// Tauri `resource_dir()` often yields `\\?\C:\…`. Passing that as Node argv makes
/// `realpathSync` collapse to bare `C:` → `EISDIR` (nodejs/node#62446, #60435).
/// Logic is OS-agnostic so unit tests cover it on macOS/Linux CI.
fn path_for_node(path: &Path) -> PathBuf {
    let s = path.to_string_lossy();
    const VERBATIM: &str = r"\\?\";
    if let Some(rest) = s.strip_prefix(VERBATIM) {
        if let Some(unc) = rest.strip_prefix(r"UNC\") {
            return PathBuf::from(format!(r"\\{unc}"));
        }
        return PathBuf::from(rest);
    }
    path.to_path_buf()
}

/// Reject bare drive roots (`C:`) that Node treats as a directory main module.
fn assert_node_path_usable(path: &Path, label: &str) -> Result<(), String> {
    let raw = path.to_string_lossy();
    let trimmed = raw.trim_end_matches(['\\', '/']);
    if trimmed.len() == 2 && trimmed.as_bytes()[1] == b':' {
        return Err(format!(
            "Nieprawidłowa ścieżka {label} dla Node: '{raw}' (goły dysk). Zgłoś bug z logiem instalacji."
        ));
    }
    if raw.is_empty() {
        return Err(format!("Pusta ścieżka {label} dla Node"));
    }
    Ok(())
}

#[cfg(test)]
mod path_for_node_tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn strips_windows_verbatim_prefix() {
        let input = Path::new(r"\\?\C:\Program Files\StageSync\resources\resources\sidecar\server");
        assert_eq!(
            path_for_node(input),
            PathBuf::from(r"C:\Program Files\StageSync\resources\resources\sidecar\server")
        );
    }

    #[test]
    fn strips_windows_verbatim_unc() {
        let input = Path::new(r"\\?\UNC\server\share\sidecar\server");
        assert_eq!(
            path_for_node(input),
            PathBuf::from(r"\\server\share\sidecar\server")
        );
    }

    #[test]
    fn leaves_normal_paths_alone() {
        let input = Path::new(r"C:\Program Files\StageSync\resources\sidecar\server");
        assert_eq!(path_for_node(input), input);
    }

    #[test]
    fn rejects_bare_drive() {
        assert!(assert_node_path_usable(Path::new(r"C:"), "entry").is_err());
        assert!(assert_node_path_usable(Path::new(r"C:\"), "entry").is_err());
        assert!(assert_node_path_usable(Path::new(r"C:\StageSync"), "entry").is_ok());
    }
}

#[derive(Clone)]
struct NavState {
    timeline_project_id: Arc<Mutex<Option<String>>>,
}

fn nav_url(path: &str) -> String {
    format!("http://127.0.0.1:{UI_PORT}{path}")
}

fn timeline_nav_url(state: &NavState) -> String {
    let id = state
        .timeline_project_id
        .lock()
        .ok()
        .and_then(|g| g.clone());
    match id {
        Some(id) if !id.is_empty() => nav_url(&format!("/timeline/{id}")),
        _ => nav_url("/admin"),
    }
}

/// Keep in sync with `apps/web/src/lib/docsLinks.ts`.
const DOCS_INSTALL_URL: &str =
    "https://github.com/Negatywistyczny/stagesync/blob/main/docs/INSTALL.md";
const DOCS_ISSUES_URL: &str = "https://github.com/Negatywistyczny/stagesync/issues";

fn navigate_main(app: &tauri::AppHandle, path: &str) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if let Ok(parsed) = nav_url(path).parse() {
        let _ = window.navigate(parsed);
    }
}

/// Phase A native menu: StageSync | Widok | Pomoc (ADR 0010 amendement).
fn install_desktop_menu(app: &tauri::AppHandle, nav_state: NavState) -> tauri::Result<()> {
    let about = MenuItem::with_id(app, "about", "O programie StageSync", true, None::<&str>)?;
    let check_updates = MenuItem::with_id(
        app,
        "check_updates",
        "Sprawdź aktualizacje...",
        true,
        None::<&str>,
    )?;
    let quit = PredefinedMenuItem::quit(app, Some("Zakończ"))?;
    let app_sep = PredefinedMenuItem::separator(app)?;
    let app_submenu = Submenu::with_items(
        app,
        "StageSync",
        true,
        &[&about, &check_updates, &app_sep, &quit],
    )?;

    let nav_admin = MenuItem::with_id(app, "nav_admin", "Admin", true, Some("CmdOrCtrl+1"))?;
    let nav_timeline =
        MenuItem::with_id(app, "nav_timeline", "Timeline", true, Some("CmdOrCtrl+2"))?;
    let nav_client = MenuItem::with_id(app, "nav_client", "Klient", true, Some("CmdOrCtrl+3"))?;

    let admin_songs =
        MenuItem::with_id(app, "admin_songs", "Utwory", true, Some("Alt+1"))?;
    let admin_set = MenuItem::with_id(app, "admin_set", "Setlista", true, Some("Alt+2"))?;
    let admin_stage = MenuItem::with_id(app, "admin_stage", "Scena", true, Some("Alt+3"))?;
    let admin_host = MenuItem::with_id(app, "admin_host", "Host", true, Some("Alt+4"))?;
    let admin_tabs = Submenu::with_items(
        app,
        "Zakładki Admina",
        true,
        &[&admin_songs, &admin_set, &admin_stage, &admin_host],
    )?;

    #[cfg(target_os = "macos")]
    let fullscreen_accel = Some("Cmd+Ctrl+F");
    #[cfg(not(target_os = "macos"))]
    let fullscreen_accel = Some("F11");
    let fullscreen =
        MenuItem::with_id(app, "fullscreen", "Pełny ekran", true, fullscreen_accel)?;
    let view_sep_1 = PredefinedMenuItem::separator(app)?;
    let view_sep_2 = PredefinedMenuItem::separator(app)?;

    let view_submenu = Submenu::with_items(
        app,
        "Widok",
        true,
        &[
            &nav_admin,
            &nav_timeline,
            &nav_client,
            &view_sep_1,
            &admin_tabs,
            &view_sep_2,
            &fullscreen,
        ],
    )?;

    let help_docs = MenuItem::with_id(
        app,
        "help_docs",
        "Dokumentacja StageSync online",
        true,
        None::<&str>,
    )?;
    let help_issues = MenuItem::with_id(
        app,
        "help_issues",
        "Zgłoś problem / Feedback",
        true,
        None::<&str>,
    )?;
    // Windows/Linux: duplicate About under Help (macOS keeps it in the app menu only).
    #[cfg(not(target_os = "macos"))]
    let help_about = MenuItem::with_id(
        app,
        "help_about",
        "O programie StageSync",
        true,
        None::<&str>,
    )?;
    #[cfg(not(target_os = "macos"))]
    let help_sep = PredefinedMenuItem::separator(app)?;
    #[cfg(not(target_os = "macos"))]
    let help_submenu = Submenu::with_items(
        app,
        "Pomoc",
        true,
        &[&help_docs, &help_issues, &help_sep, &help_about],
    )?;
    #[cfg(target_os = "macos")]
    let help_submenu = Submenu::with_items(app, "Pomoc", true, &[&help_docs, &help_issues])?;

    let menu = Menu::with_items(app, &[&app_submenu, &view_submenu, &help_submenu])?;
    app.set_menu(menu)?;

    let nav_for_events = nav_state;
    app.on_menu_event(move |app, event| {
        match event.id().0.as_str() {
            "about" | "help_about" => navigate_main(&app, "/admin?section=host"),
            "check_updates" => navigate_main(&app, "/admin?section=host&action=check-update"),
            "nav_admin" => navigate_main(&app, "/admin"),
            "nav_timeline" => {
                let Some(window) = app.get_webview_window("main") else {
                    return;
                };
                if let Ok(parsed) = timeline_nav_url(&nav_for_events).parse() {
                    let _ = window.navigate(parsed);
                }
            }
            "nav_client" => navigate_main(&app, "/client"),
            "admin_songs" => navigate_main(&app, "/admin?section=songs"),
            "admin_set" => navigate_main(&app, "/admin?section=set"),
            "admin_stage" => navigate_main(&app, "/admin?section=stage"),
            "admin_host" => navigate_main(&app, "/admin?section=host"),
            "fullscreen" => {
                if let Some(window) = app.get_webview_window("main") {
                    tauri::async_runtime::spawn(async move {
                        let _ = toggle_window_fullscreen(window).await;
                    });
                }
            }
            "help_docs" => {
                let _ = open_external_url(DOCS_INSTALL_URL.to_string());
            }
            "help_issues" => {
                let _ = open_external_url(DOCS_ISSUES_URL.to_string());
            }
            _ => {}
        }
    });

    Ok(())
}

fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn to_data_html_url(html: &str) -> String {
    // Encode as a data URL so we don't depend on local files for startup errors.
    let mut encoded = String::new();
    for &b in html.as_bytes() {
        let c = b as char;
        let is_unreserved = matches!(
            c,
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~'
        );
        if is_unreserved {
            encoded.push(c);
        } else {
            encoded.push_str(&format!("%{:02X}", b));
        }
    }
    format!("data:text/html;charset=utf-8,{}", encoded)
}

fn append_sidecar_log(log: &mut String, chunk: &str) {
    log.push_str(chunk);
    if !chunk.ends_with('\n') {
        log.push('\n');
    }
    if log.len() > SIDECAR_LOG_CAP {
        let keep = &log[log.len() - SIDECAR_LOG_CAP..];
        *log = format!("…\n{keep}");
    }
}

fn format_sidecar_failure(kind: &str, detail: &str, log_tail: &str) -> String {
    let mut msg = format!(
        "StageSync: {kind}\nhttp://127.0.0.1:{UI_PORT}\n\n{detail}"
    );
    let trimmed = log_tail.trim();
    if !trimmed.is_empty() {
        msg.push_str("\n\n— log hosta —\n");
        msg.push_str(trimmed);
    }
    msg
}

fn startup_failure_message(log_tail: &str, last_health_err: Option<&str>) -> String {
    let lower = log_tail.to_ascii_lowercase();
    if lower.contains("eaddrinuse") || lower.contains("address already in use") {
        return format_sidecar_failure(
            "port 4000 jest zajęty",
            "Zamknij inne instancje StageSync (albo proces na porcie 4000) i spróbuj ponownie.",
            log_tail,
        );
    }
    if lower.contains("err_module_not_found") || lower.contains("cannot find module") {
        return format_sidecar_failure(
            "lokalny host nie wczytał zależności",
            "Bundle sidecara wygląda na uszkodzony — przeinstaluj StageSync z najnowszego release.",
            log_tail,
        );
    }
    if !log_tail.trim().is_empty() {
        return format_sidecar_failure(
            "lokalny host nie wystartował",
            "Poniższy log pochodzi z procesu sidecara (często to prawdziwa przyczyna, nie zajęty port).",
            log_tail,
        );
    }
    let hint = last_health_err.unwrap_or("brak odpowiedzi na /api/health");
    format_sidecar_failure(
        "lokalny host nie odpowiedział w czasie",
        &format!(
            "{hint}\nNa Windows pierwsze uruchomienie może trwać dłużej (skan Defendera) — spróbuj jeszcze raz.\nJeśli problem wraca: sprawdź czy port {UI_PORT} jest wolny i czy SmartScreen/Defender nie blokuje stagesync-host."
        ),
        log_tail,
    )
}

async fn check_health(port: u16) -> Result<bool, String> {
    let addr = format!("127.0.0.1:{port}");
    let mut stream = TcpStream::connect(addr)
        .await
        .map_err(|e| format!("connect failed: {e}"))?;

    let req = format!(
        "GET /api/health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n"
    );
    stream
        .write_all(req.as_bytes())
        .await
        .map_err(|e| format!("write failed: {e}"))?;

    let mut buf = Vec::new();
    stream
        .read_to_end(&mut buf)
        .await
        .map_err(|e| format!("read failed: {e}"))?;

    let resp = String::from_utf8_lossy(&buf);
    Ok(resp.starts_with("HTTP/1.1 200") || resp.starts_with("HTTP/1.0 200"))
}

fn show_startup_error(
    window: &tauri::WebviewWindow,
    sidecar_child: &Arc<Mutex<Option<CommandChild>>>,
    msg: String,
) {
    let err_url = to_data_html_url(&format!("<pre>{}</pre>", escape_html(&msg)));
    let _ = window.navigate(err_url.parse().unwrap());
    if let Ok(mut guard) = sidecar_child.lock() {
        if let Some(child) = guard.take() {
            let _ = child.kill();
        }
    }
}

/// Standalone desktop: WebView loads UI after local StageSync server is healthy.
/// No musical clock / MIDI in this process (ADR 0010).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sidecar_child: Arc<Mutex<Option<CommandChild>>> = Arc::new(Mutex::new(None));
    let sidecar_child_setup = sidecar_child.clone();
    let sidecar_child_run = sidecar_child.clone();
    let nav_state = NavState {
        timeline_project_id: Arc::new(Mutex::new(None)),
    };
    let nav_state_setup = nav_state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(nav_state)
        .setup(move |app| {
            let _ = install_desktop_menu(app.handle(), nav_state_setup.clone());

            let Some(window) = app.get_webview_window("main") else {
                return Ok(());
            };

            // Provide visible feedback while the server starts.
            let start_url = to_data_html_url(
                "<!doctype html><meta charset=\"utf-8\"/><pre>StageSync: uruchamiam lokalny host…</pre>",
            );
            let _ = window.navigate(start_url.parse().unwrap());

            let Ok(resource_dir) = app.handle().path().resource_dir() else {
                let msg = "Brak katalogu resources (bundle misconfigured)".to_string();
                let err_url = to_data_html_url(&format!("<pre>{}</pre>", escape_html(&msg)));
                let _ = window.navigate(err_url.parse().unwrap());
                return Ok(());
            };

            // Join with OS separators (not a single "a/b/c" string) so Windows never
            // treats a segment as absolute / drive-relative.
            let static_dir = path_for_node(
                &resource_dir
                    .join("resources")
                    .join("sidecar")
                    .join("web"),
            );
            let seed_dir = path_for_node(
                &resource_dir
                    .join("resources")
                    .join("sidecar")
                    .join("seed"),
            );
            let server_dir = path_for_node(
                &resource_dir
                    .join("resources")
                    .join("sidecar")
                    .join("server"),
            );
            let server_entry = server_dir.join(SERVER_ENTRY_REL);

            // Dev fallback: if sidecar resources aren't bundled, keep the old thin-shell flow.
            if !server_entry.exists() {
                let url = std::env::var("STAGESYNC_URL")
                    .unwrap_or_else(|_| nav_url("/admin"));
                if let Ok(parsed) = url.parse() {
                    let _ = window.navigate(parsed);
                }
                return Ok(());
            }

            let Ok(app_data_dir) = app.handle().path().app_data_dir() else {
                let msg = "Brak katalogu aplikacji (app_data_dir)".to_string();
                let err_url = to_data_html_url(&format!("<pre>{}</pre>", escape_html(&msg)));
                let _ = window.navigate(err_url.parse().unwrap());
                return Ok(());
            };

            let data_dir = path_for_node(&app_data_dir.join("StageSync"));
            let _ = std::fs::create_dir_all(&data_dir);

            if let Err(msg) = assert_node_path_usable(&server_dir, "server_dir")
                .and_then(|_| assert_node_path_usable(&static_dir, "static_dir"))
                .and_then(|_| assert_node_path_usable(&seed_dir, "seed_dir"))
                .and_then(|_| assert_node_path_usable(&data_dir, "data_dir"))
            {
                let err_url = to_data_html_url(&format!("<pre>{}</pre>", escape_html(&msg)));
                let _ = window.navigate(err_url.parse().unwrap());
                return Ok(());
            }

            // Relative entry + cwd: Node never sees a `\\?\C:\…` absolute main path.
            let sidecar = app
                .handle()
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
                        .env(
                            "STAGESYNC_DATA_DIR",
                            data_dir.to_string_lossy().to_string(),
                        )
                        .env(
                            "STAGESYNC_SEED_DIR",
                            seed_dir.to_string_lossy().to_string(),
                        )
                        .env(
                            "npm_package_version",
                            app.package_info().version.to_string(),
                        )
                        .env("STAGESYNC_SHELL", "desktop")
                        .spawn()
                })
                .map_err(|err| {
                    format!(
                        "Nie udało się uruchomić lokalnego hosta: {err}\nSprawdź czy stagesync-host nie jest blokowany przez Defender/SmartScreen.\nentry={SERVER_ENTRY_REL}\ncwd={}",
                        server_dir.display()
                    )
                });

            let (mut rx, child) = match sidecar {
                Ok(pair) => pair,
                Err(msg) => {
                    let err_url =
                        to_data_html_url(&format!("<pre>{}</pre>", escape_html(&msg)));
                    let _ = window.navigate(err_url.parse().unwrap());
                    return Ok(());
                }
            };

            *sidecar_child_setup.lock().unwrap() = Some(child);

            let window_for_poll = window.clone();
            let sidecar_child_for_poll = sidecar_child_setup.clone();
            tauri::async_runtime::spawn(async move {
                let deadline = Instant::now() + STARTUP_TIMEOUT;
                let mut log_tail = String::new();
                #[allow(unused_assignments)]
                let mut last_health_err = String::new();

                loop {
                    // Drain sidecar stdout/stderr between health polls (and fail fast on exit).
                    match tokio::time::timeout(HEALTHCHECK_INTERVAL, rx.recv()).await {
                        Ok(Some(event)) => match event {
                            CommandEvent::Stdout(bytes) | CommandEvent::Stderr(bytes) => {
                                append_sidecar_log(
                                    &mut log_tail,
                                    &String::from_utf8_lossy(&bytes),
                                );
                                continue;
                            }
                            CommandEvent::Error(err) => {
                                append_sidecar_log(&mut log_tail, &format!("[shell] {err}"));
                                continue;
                            }
                            CommandEvent::Terminated(payload) => {
                                let code = payload
                                    .code
                                    .map(|c| c.to_string())
                                    .unwrap_or_else(|| "?".into());
                                append_sidecar_log(
                                    &mut log_tail,
                                    &format!("[shell] sidecar exited (code {code})"),
                                );
                                let msg = startup_failure_message(
                                    &log_tail,
                                    Some(&format!("proces hosta zakończył się (kod {code})")),
                                );
                                show_startup_error(
                                    &window_for_poll,
                                    &sidecar_child_for_poll,
                                    msg,
                                );
                                return;
                            }
                            _ => continue,
                        },
                        Ok(None) => {
                            let msg = startup_failure_message(
                                &log_tail,
                                Some("utracono połączenie ze strumieniem sidecara"),
                            );
                            show_startup_error(
                                &window_for_poll,
                                &sidecar_child_for_poll,
                                msg,
                            );
                            return;
                        }
                        Err(_elapsed) => {}
                    }

                    match check_health(UI_PORT).await {
                        Ok(true) => {
                            // Desktop = okno operatora (ADR 0010) — domyślnie Admin.
                            let url = nav_url("/admin");
                            let _ = window_for_poll.navigate(url.parse().unwrap());
                            // Keep draining logs so the pipe does not back-pressure Node.
                            tauri::async_runtime::spawn(async move {
                                while rx.recv().await.is_some() {}
                            });
                            return;
                        }
                        Ok(false) => {
                            last_health_err = "odpowiedź HTTP bez statusu 200".into();
                        }
                        Err(e) => {
                            last_health_err = e;
                        }
                    }

                    if Instant::now() >= deadline {
                        let detail = (!last_health_err.is_empty()).then_some(last_health_err.as_str());
                        let msg = startup_failure_message(&log_tail, detail);
                        show_startup_error(
                            &window_for_poll,
                            &sidecar_child_for_poll,
                            msg,
                        );
                        return;
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_desktop_update,
            install_desktop_update,
            open_external_url,
            toggle_window_fullscreen,
            set_nav_timeline_project_id,
        ])
        .build(tauri::generate_context!())
        .expect("error while building StageSync desktop")
        .run(move |_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Ok(mut guard) = sidecar_child_run.lock() {
                    if let Some(child) = guard.take() {
                        let _ = child.kill();
                    }
                }
            }
        });
}

#[derive(serde::Serialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub current: String,
    pub notes: Option<String>,
}

/// Sync last Timeline project id from web UI (native menu navigation).
#[tauri::command]
fn set_nav_timeline_project_id(
    state: tauri::State<'_, NavState>,
    project_id: Option<String>,
) -> Result<(), String> {
    let mut guard = state.timeline_project_id.lock().map_err(|e| e.to_string())?;
    *guard = project_id.filter(|id| !id.is_empty());
    Ok(())
}

/// Check for a desktop update via tauri-plugin-updater.
/// Called from Admin UI via `invoke("check_desktop_update")`.
#[tauri::command]
async fn check_desktop_update(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    let current = app.package_info().version.to_string();
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => Ok(UpdateInfo {
            available: true,
            version: Some(update.version.clone()),
            current,
            notes: update.body.clone(),
        }),
        Ok(None) => Ok(UpdateInfo {
            available: false,
            version: None,
            current,
            notes: None,
        }),
        Err(e) => Err(e.to_string()),
    }
}

/// Toggle native window expand (desktop shell — not HTML document fullscreen).
/// macOS: maximize/unmaximize (green-button UX). Other platforms: true fullscreen.
#[tauri::command]
async fn toggle_window_fullscreen(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if window.is_maximized().map_err(|e| e.to_string())? {
            window.unmaximize().map_err(|e| e.to_string())
        } else {
            window.maximize().map_err(|e| e.to_string())
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
        window
            .set_fullscreen(!is_fullscreen)
            .map_err(|e| e.to_string())
    }
}

/// Open a URL in the system default browser (full docs on GitHub).
#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Only http(s) URLs are allowed".into());
    }
    open::that(url).map_err(|e| e.to_string())
}

/// Download and install a desktop update, then relaunch.
/// Called from Admin UI via `invoke("install_desktop_update")`.
#[tauri::command]
async fn install_desktop_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => {
            update
                .download_and_install(|_, _| {}, || {})
                .await
                .map_err(|e| e.to_string())?;
            app.restart();
        }
        Ok(None) => Err("No update available".into()),
        Err(e) => Err(e.to_string()),
    }
}
