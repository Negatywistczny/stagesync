use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::UpdaterExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

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

/// Standalone desktop: WebView loads UI after local StageSync server is healthy.
/// No musical clock / MIDI in this process (ADR 0010).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    const PORT: u16 = 4000;
    const STARTUP_TIMEOUT: Duration = Duration::from_secs(30);
    const HEALTHCHECK_INTERVAL: Duration = Duration::from_millis(250);

    let sidecar_child: Arc<Mutex<Option<CommandChild>>> = Arc::new(Mutex::new(None));
    let sidecar_child_setup = sidecar_child.clone();
    let sidecar_child_run = sidecar_child.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(move |app| {
            let Some(window) = app.get_webview_window("main") else {
                return Ok(());
            };

            // Provide visible feedback while the server starts.
            let start_url = to_data_html_url(
                "<!doctype html><meta charset=\"utf-8\"/><pre>StageSync: uruchamiam lokalny host…</pre>",
            );
            let _ = window.navigate(start_url.parse().unwrap());

            let Some(resource_dir) = app.path_resolver().resource_dir() else {
                let msg = "Brak katalogu resources (bundle misconfigured)".to_string();
                let err_url = to_data_html_url(&format!("<pre>{}</pre>", escape_html(&msg)));
                let _ = window.navigate(err_url.parse().unwrap());
                return Ok(());
            };

            let static_dir = resource_dir.join("sidecar/web");
            let seed_dir = resource_dir.join("sidecar/seed");
            let server_entry = resource_dir.join("sidecar/server/dist/index.js");

            // Dev fallback: if sidecar resources aren't bundled, keep the old thin-shell flow.
            if !server_entry.exists() {
                let url = std::env::var("STAGESYNC_URL")
                    .unwrap_or_else(|_| format!("http://127.0.0.1:{PORT}"));
                if let Ok(parsed) = url.parse() {
                    let _ = window.navigate(parsed);
                }
                return Ok(());
            }

            let Some(app_data_dir) = app.path_resolver().app_data_dir() else {
                let msg = "Brak katalogu aplikacji (app_data_dir)".to_string();
                let err_url = to_data_html_url(&format!("<pre>{}</pre>", escape_html(&msg)));
                let _ = window.navigate(err_url.parse().unwrap());
                return Ok(());
            };

            let data_dir = app_data_dir.join("StageSync");
            let _ = std::fs::create_dir_all(&data_dir);

            let server_entry_arg = server_entry.to_string_lossy().to_string();
            let sidecar = app
                .handle()
                .shell()
                .sidecar("stagesync-host")
                .and_then(|cmd| {
                    cmd.args([server_entry_arg.as_str()])
                        .env("PORT", PORT.to_string())
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
                        .spawn()
                })
                .map_err(|err| {
                    format!(
                        "Nie udało się uruchomić lokalnego hosta: {err}\nSprawdź czy port {PORT} jest wolny."
                    )
                });

            let child = match sidecar {
                Ok((_rx, child)) => child,
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
                loop {
                    match check_health(PORT).await {
                        Ok(true) => {
                            let url = format!("http://127.0.0.1:{PORT}");
                            let _ = window_for_poll.navigate(url.parse().unwrap());
                            return;
                        }
                        Ok(false) => {}
                        Err(_e) => {}
                    }

                    if Instant::now() >= deadline {
                        let msg = format!(
                            "StageSync nie wystartował na http://127.0.0.1:{PORT}.\nPort może być zajęty — zamknij inne instancje StageSync."
                        );
                        let err_url =
                            to_data_html_url(&format!("<pre>{}</pre>", escape_html(&msg)));
                        let _ = window_for_poll.navigate(err_url.parse().unwrap());

                        if let Ok(mut guard) = sidecar_child_for_poll.lock() {
                            if let Some(child) = guard.take() {
                                let _ = child.kill();
                            }
                        }
                        return;
                    }

                    tokio::time::sleep(HEALTHCHECK_INTERVAL).await;
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_desktop_update,
            install_desktop_update,
            open_external_url,
        ])
        .run(tauri::generate_context!(), move |_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Ok(mut guard) = sidecar_child_run.lock() {
                    if let Some(child) = guard.take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .expect("error while running StageSync desktop");
}

#[derive(serde::Serialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub current: String,
    pub notes: Option<String>,
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
        Ok(None) => return Err("No update available".into()),
        Err(e) => return Err(e.to_string()),
    }
    Ok(())
}
