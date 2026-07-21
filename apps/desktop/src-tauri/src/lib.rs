use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::UpdaterExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

const UI_PORT: u16 = 4000;

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

fn install_desktop_menu(app: &tauri::AppHandle, nav_state: NavState) -> tauri::Result<()> {
    let quit = PredefinedMenuItem::quit(app, Some("Zakończ"))?;
    let app_submenu = Submenu::with_items(app, "StageSync", true, &[&quit])?;

    let nav_admin = MenuItem::with_id(app, "nav_admin", "Admin", true, None::<&str>)?;
    let nav_timeline = MenuItem::with_id(app, "nav_timeline", "Timeline", true, None::<&str>)?;
    let nav_client = MenuItem::with_id(app, "nav_client", "Klient", true, None::<&str>)?;
    let view_submenu =
        Submenu::with_items(app, "Widok", true, &[&nav_admin, &nav_timeline, &nav_client])?;

    let menu = Menu::with_items(app, &[&app_submenu, &view_submenu])?;
    app.set_menu(menu)?;

    let nav_for_events = nav_state;
    app.on_menu_event(move |app, event| {
        let Some(window) = app.get_webview_window("main") else {
            return;
        };
        let url = match event.id().0.as_str() {
            "nav_admin" => nav_url("/admin"),
            "nav_timeline" => timeline_nav_url(&nav_for_events),
            "nav_client" => nav_url("/client"),
            _ => return,
        };
        if let Ok(parsed) = url.parse() {
            let _ = window.navigate(parsed);
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
    const STARTUP_TIMEOUT: Duration = Duration::from_secs(30);
    const HEALTHCHECK_INTERVAL: Duration = Duration::from_millis(250);

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

            let static_dir = resource_dir.join("resources/sidecar/web");
            let seed_dir = resource_dir.join("resources/sidecar/seed");
            let server_entry = resource_dir.join("resources/sidecar/server/dist/index.js");

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

            let data_dir = app_data_dir.join("StageSync");
            let _ = std::fs::create_dir_all(&data_dir);

            let server_entry_arg = server_entry.to_string_lossy().to_string();
            let sidecar = app
                .handle()
                .shell()
                .sidecar("stagesync-host")
                .and_then(|cmd| {
                    cmd.args([server_entry_arg.as_str()])
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
                        "Nie udało się uruchomić lokalnego hosta: {err}\nSprawdź czy port {UI_PORT} jest wolny."
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
                    match check_health(UI_PORT).await {
                        Ok(true) => {
                            // Desktop = okno operatora (ADR 0010) — domyślnie Admin, nie Klient.
                            let url = nav_url("/admin");
                            let _ = window_for_poll.navigate(url.parse().unwrap());
                            return;
                        }
                        Ok(false) => {}
                        Err(_e) => {}
                    }

                    if Instant::now() >= deadline {
                        let msg = format!(
                            "StageSync nie wystartował na http://127.0.0.1:{UI_PORT}.\nPort może być zajęty — zamknij inne instancje StageSync."
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
        Ok(None) => return Err("No update available".into()),
        Err(e) => return Err(e.to_string()),
    }
    Ok(())
}
