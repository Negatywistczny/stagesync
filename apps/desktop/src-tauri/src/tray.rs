//! System tray / menu bar — close-to-tray host control (#813, ADR 0015 lekki tray).

use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

use crate::launcher::{self, LauncherNav, SidecarRuntime};
use crate::{check_health_at, UI_PORT};

const TRAY_ID: &str = "stagesync-main-tray";
const REFRESH_SECS: u64 = 3;

#[derive(Clone, Copy, PartialEq, Eq)]
enum HostTrayState {
    Idle,
    Starting,
    Running,
    Error,
}

struct TrayMenuHandles {
    /// Status hosta; gdy jest adres LAN — klik kopiuje URL.
    status: MenuItem<tauri::Wry>,
    toggle_host: MenuItem<tauri::Wry>,
}

struct TrayIcons {
    idle: Image<'static>,
    running: Image<'static>,
    error: Image<'static>,
}

struct TrayUiState {
    menu: TrayMenuHandles,
    icon_state: HostTrayState,
    last_lan: Option<String>,
    icons: TrayIcons,
}

fn embed_icon(bytes: &'static [u8]) -> Image<'static> {
    Image::from_bytes(bytes).expect("tray png")
}

fn load_tray_icons() -> TrayIcons {
    TrayIcons {
        idle: embed_icon(include_bytes!("../icons/tray/idle.png")),
        running: embed_icon(include_bytes!("../icons/tray/running.png")),
        error: embed_icon(include_bytes!("../icons/tray/error.png")),
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

async fn fetch_primary_lan_url() -> Option<String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let addr = format!("127.0.0.1:{UI_PORT}");
    let connect = tokio::net::TcpStream::connect(&addr);
    let mut stream = tokio::time::timeout(Duration::from_secs(2), connect)
        .await
        .ok()?
        .ok()?;
    let req = format!(
        "GET /api/system/network HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n"
    );
    tokio::time::timeout(Duration::from_secs(2), stream.write_all(req.as_bytes()))
        .await
        .ok()?
        .ok()?;
    let mut buf = Vec::new();
    tokio::time::timeout(Duration::from_secs(2), stream.read_to_end(&mut buf))
        .await
        .ok()?
        .ok()?;
    let resp = String::from_utf8_lossy(&buf);
    if !(resp.starts_with("HTTP/1.1 200") || resp.starts_with("HTTP/1.0 200")) {
        return None;
    }
    let body = resp
        .split("\r\n\r\n")
        .nth(1)
        .or_else(|| resp.split("\n\n").nth(1))?;
    let value: serde_json::Value = serde_json::from_str(body.trim()).ok()?;
    if let Some(urls) = value.get("urls").and_then(|u| u.as_array()) {
        for u in urls {
            if let Some(s) = u.as_str() {
                if !s.contains("127.0.0.1") && !s.contains("localhost") {
                    return Some(s.to_string());
                }
            }
        }
        if let Some(s) = urls.first().and_then(|u| u.as_str()) {
            return Some(s.to_string());
        }
    }
    if let Some(addr) = value
        .get("lanAddresses")
        .and_then(|a| a.as_array())
        .and_then(|a| a.first())
        .and_then(|row| row.get("address"))
        .and_then(|a| a.as_str())
    {
        return Some(format!("http://{addr}:{UI_PORT}"));
    }
    Some(format!("http://127.0.0.1:{UI_PORT}"))
}

async fn resolve_host_snapshot(
    runtime: &SidecarRuntime,
) -> (HostTrayState, String, Option<String>) {
    if runtime.is_starting() {
        return (
            HostTrayState::Starting,
            "Host: uruchamianie…".into(),
            None,
        );
    }
    if let Some(err) = runtime.peek_pending_error() {
        let short = if err.chars().count() > 48 {
            format!("{}…", err.chars().take(48).collect::<String>())
        } else {
            err
        };
        return (HostTrayState::Error, format!("Host: błąd — {short}"), None);
    }
    if !runtime.has_child() {
        return (HostTrayState::Idle, "Host: wyłączony".into(), None);
    }
    match check_health_at("127.0.0.1", UI_PORT).await {
        Ok(Some(_)) => {
            let lan = fetch_primary_lan_url().await;
            let label = match &lan {
                Some(url) => {
                    let display = url
                        .trim_start_matches("http://")
                        .trim_start_matches("https://");
                    format!("Host: działa [{display}] · kopiuj")
                }
                None => format!("Host: działa [127.0.0.1:{UI_PORT}]"),
            };
            (HostTrayState::Running, label, lan)
        }
        Ok(None) => (
            HostTrayState::Starting,
            "Host: startuje (health)…".into(),
            None,
        ),
        Err(_) => (
            HostTrayState::Error,
            "Host: proces żyje, brak health".into(),
            None,
        ),
    }
}

fn apply_tray_visual(
    tray: &TrayIcon<tauri::Wry>,
    state: &mut TrayUiState,
    host: HostTrayState,
    status_label: &str,
    lan: Option<String>,
    host_active: bool,
) {
    let _ = state.menu.status.set_text(status_label);
    let _ = state.menu.status.set_enabled(lan.is_some());
    let toggle_label = if host_active {
        "Zatrzymaj Host"
    } else {
        "Uruchom Host"
    };
    let _ = state.menu.toggle_host.set_text(toggle_label);
    state.last_lan = lan;

    if state.icon_state != host {
        state.icon_state = host;
        let icon = match host {
            HostTrayState::Running => state.icons.running.clone(),
            HostTrayState::Error => state.icons.error.clone(),
            HostTrayState::Idle | HostTrayState::Starting => state.icons.idle.clone(),
        };
        let _ = tray.set_icon(Some(icon));
        let tip = match host {
            HostTrayState::Running => "StageSync — host działa",
            HostTrayState::Error => "StageSync — błąd hosta",
            HostTrayState::Starting => "StageSync — uruchamianie hosta",
            HostTrayState::Idle => "StageSync",
        };
        let _ = tray.set_tooltip(Some(tip));
    }
}

/// Install tray icon + menu; spawn refresh task. Call from app `setup`.
pub fn install_tray(
    app: &AppHandle,
    runtime: Arc<SidecarRuntime>,
    launcher_nav: Arc<LauncherNav>,
) -> tauri::Result<()> {
    let icons = load_tray_icons();

    let open = MenuItem::with_id(app, "tray_open", "Otwórz StageSync", true, None::<&str>)?;
    let status = MenuItem::with_id(app, "tray_status", "Host: …", false, None::<&str>)?;
    let toggle_host =
        MenuItem::with_id(app, "tray_toggle_host", "Uruchom Host", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "tray_quit", "Zakończ StageSync", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[&open, &status, &toggle_host, &sep, &quit],
    )?;

    let ui = Arc::new(Mutex::new(TrayUiState {
        menu: TrayMenuHandles {
            status,
            toggle_host,
        },
        icon_state: HostTrayState::Idle,
        last_lan: None,
        icons,
    }));

    let runtime_menu = runtime.clone();
    let nav_menu = launcher_nav.clone();
    let ui_menu = ui.clone();

    let initial_icon = ui
        .lock()
        .map(|s| s.icons.idle.clone())
        .unwrap_or_else(|_| embed_icon(include_bytes!("../icons/tray/idle.png")));

    let _tray = TrayIconBuilder::with_id(TRAY_ID)
        .icon(initial_icon)
        .tooltip("StageSync")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "tray_open" => show_main_window(app),
            "tray_status" => {
                if let Ok(guard) = ui_menu.lock() {
                    if let Some(url) = guard.last_lan.as_ref() {
                        if let Ok(mut cb) = arboard::Clipboard::new() {
                            let _ = cb.set_text(url.clone());
                        }
                    }
                }
            }
            "tray_toggle_host" => {
                let app = app.clone();
                let runtime = runtime_menu.clone();
                let nav = nav_menu.clone();
                tauri::async_runtime::spawn(async move {
                    if runtime.has_child() || runtime.is_starting() {
                        runtime.kill_child();
                        // Avoid forcing Launcher navigation while the window is hidden
                        // (close-to-tray); visible session returns to Launcher like return_to_launcher.
                        let visible = app
                            .get_webview_window("main")
                            .and_then(|w| w.is_visible().ok())
                            .unwrap_or(false);
                        if visible {
                            let _ = launcher::navigate_to_launcher(&app, nav.as_ref());
                        }
                    } else {
                        let _ = launcher::start_local_host_managed(app, runtime).await;
                    }
                });
            }
            "tray_quit" => {
                runtime_menu.kill_child();
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    let app_handle = app.clone();
    let runtime_refresh = runtime;
    let ui_refresh = ui;
    tauri::async_runtime::spawn(async move {
        loop {
            let (host, label, lan) = resolve_host_snapshot(runtime_refresh.as_ref()).await;
            let host_active = matches!(
                host,
                HostTrayState::Running | HostTrayState::Starting
            ) || runtime_refresh.has_child();
            if let Some(tray_icon) = app_handle.tray_by_id(TRAY_ID) {
                if let Ok(mut state) = ui_refresh.lock() {
                    apply_tray_visual(&tray_icon, &mut state, host, &label, lan, host_active);
                }
            }
            tokio::time::sleep(Duration::from_secs(REFRESH_SECS)).await;
        }
    });

    Ok(())
}
