//! System tray / menu bar — close-to-tray host control (#813, ADR 0015 lekki tray).

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};
use tokio::sync::Notify;

use crate::launcher::{self, LauncherNav, SidecarRuntime};
use crate::{check_health_at, UI_PORT};

const TRAY_ID: &str = "stagesync-main-tray";
const REFRESH_SECS: u64 = 3;
const COPY_FLASH_SECS: u64 = 2;
const ERROR_LABEL_MAX_CHARS: usize = 48;

const LABEL_COPY_LAN: &str = "Kopiuj adres LAN";
const LABEL_COPIED: &str = "Skopiowano";

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum HostTrayState {
    Idle,
    Starting,
    Running,
    Error,
}

struct TrayMenuHandles {
    status: MenuItem<tauri::Wry>,
    copy_lan: MenuItem<tauri::Wry>,
    open_browser: MenuItem<tauri::Wry>,
    toggle_host: MenuItem<tauri::Wry>,
    restart_host: MenuItem<tauri::Wry>,
}

struct TrayIcons {
    base: Image<'static>,
    starting: Image<'static>,
    running: Image<'static>,
    error: Image<'static>,
}

struct TrayMenuFlags {
    copy_lan: bool,
    open_browser: bool,
    toggle_host: bool,
    restart_host: bool,
    status_clickable: bool,
}

struct HostSnapshot {
    state: HostTrayState,
    status_label: String,
    url: Option<String>,
    has_managed_child: bool,
    is_starting: bool,
    error_detail: Option<String>,
}

struct TrayUiState {
    menu: TrayMenuHandles,
    icon_state: HostTrayState,
    last_url: Option<String>,
    icons: TrayIcons,
    copy_flash_until: Option<Instant>,
    last_tooltip: Option<String>,
}

fn embed_icon(bytes: &'static [u8]) -> Image<'static> {
    Image::from_bytes(bytes).expect("tray png")
}

fn load_tray_icons() -> TrayIcons {
    TrayIcons {
        base: embed_icon(include_bytes!("../icons/tray/base.png")),
        starting: embed_icon(include_bytes!("../icons/tray/dot_starting.png")),
        running: embed_icon(include_bytes!("../icons/tray/dot_running.png")),
        error: embed_icon(include_bytes!("../icons/tray/dot_error.png")),
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn truncate_error(err: &str, max_chars: usize) -> String {
    if err.chars().count() > max_chars {
        format!("{}…", err.chars().take(max_chars).collect::<String>())
    } else {
        err.to_string()
    }
}

fn url_display(url: &str) -> String {
    url.trim_start_matches("http://")
        .trim_start_matches("https://")
        .to_string()
}

fn format_running_status(url: &str) -> String {
    format!("Host: działa · {}", url_display(url))
}

fn format_starting_status(detail: &str) -> String {
    format!("Host: {detail}")
}

fn format_error_status(short: &str) -> String {
    format!("Host: błąd — {short}")
}

fn format_tooltip(state: HostTrayState, url: Option<&str>, error_detail: Option<&str>) -> String {
    match state {
        HostTrayState::Idle => "StageSync · Host wyłączony".into(),
        HostTrayState::Starting => "StageSync · Uruchamianie hosta…".into(),
        HostTrayState::Running => match url {
            Some(u) => format!("StageSync · Host gotowy ({})", url_display(u)),
            None => "StageSync · Host gotowy".into(),
        },
        HostTrayState::Error => match error_detail {
            Some(e) => format!("StageSync · Błąd: {}", truncate_error(e, ERROR_LABEL_MAX_CHARS)),
            None => "StageSync · Błąd hosta".into(),
        },
    }
}

fn menu_flags(snapshot: &HostSnapshot) -> TrayMenuFlags {
    let network_ready = snapshot.state == HostTrayState::Running && snapshot.url.is_some();
    let restart_ready =
        snapshot.state == HostTrayState::Running && snapshot.has_managed_child && network_ready;

    let toggle_enabled = match snapshot.state {
        HostTrayState::Starting => snapshot.is_starting || snapshot.has_managed_child,
        HostTrayState::Running => true,
        HostTrayState::Error | HostTrayState::Idle => true,
    };

    TrayMenuFlags {
        copy_lan: network_ready,
        open_browser: network_ready,
        toggle_host: toggle_enabled,
        restart_host: restart_ready,
        status_clickable: snapshot.state == HostTrayState::Error,
    }
}

fn toggle_label(snapshot: &HostSnapshot) -> &'static str {
    match snapshot.state {
        HostTrayState::Starting if snapshot.is_starting => "Anuluj start",
        HostTrayState::Running | HostTrayState::Starting => "Zatrzymaj Host",
        HostTrayState::Error | HostTrayState::Idle => "Uruchom Host",
    }
}

fn open_url_in_browser(url: &str) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Only http(s) URLs are allowed".into());
    }
    open::that(url).map_err(|e| e.to_string())
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

async fn running_snapshot(
    has_managed_child: bool,
    lan: Option<String>,
) -> HostSnapshot {
    let url = lan.or_else(|| Some(format!("http://127.0.0.1:{UI_PORT}")));
    let status_label = url
        .as_ref()
        .map(|u| format_running_status(u))
        .unwrap_or_else(|| format!("Host: działa [127.0.0.1:{UI_PORT}]"));
    HostSnapshot {
        state: HostTrayState::Running,
        status_label,
        url,
        has_managed_child,
        is_starting: false,
        error_detail: None,
    }
}

async fn resolve_host_snapshot(runtime: &SidecarRuntime) -> HostSnapshot {
    let has_managed_child = runtime.has_child();
    if runtime.is_starting() {
        return HostSnapshot {
            state: HostTrayState::Starting,
            status_label: format_starting_status("uruchamianie…"),
            url: None,
            has_managed_child,
            is_starting: true,
            error_detail: None,
        };
    }
    if let Some(err) = runtime.peek_pending_error() {
        let short = truncate_error(&err, ERROR_LABEL_MAX_CHARS);
        return HostSnapshot {
            state: HostTrayState::Error,
            status_label: format_error_status(&short),
            url: None,
            has_managed_child,
            is_starting: false,
            error_detail: Some(err),
        };
    }
    let health = check_health_at("127.0.0.1", UI_PORT).await;
    if !has_managed_child {
        return match health {
            Ok(Some(_)) => {
                running_snapshot(false, fetch_primary_lan_url().await).await
            }
            _ => HostSnapshot {
                state: HostTrayState::Idle,
                status_label: "Host: wyłączony".into(),
                url: None,
                has_managed_child: false,
                is_starting: false,
                error_detail: None,
            },
        };
    }
    match health {
        Ok(Some(_)) => running_snapshot(true, fetch_primary_lan_url().await).await,
        Ok(None) => HostSnapshot {
            state: HostTrayState::Starting,
            status_label: format_starting_status("startuje (health)…"),
            url: None,
            has_managed_child: true,
            is_starting: false,
            error_detail: None,
        },
        Err(_) => HostSnapshot {
            state: HostTrayState::Error,
            status_label: format_error_status("proces żyje, brak health"),
            url: None,
            has_managed_child: true,
            is_starting: false,
            error_detail: Some("proces żyje, brak health".into()),
        },
    }
}

fn apply_tray_visual(tray: &TrayIcon<tauri::Wry>, state: &mut TrayUiState, snapshot: &HostSnapshot) {
    let flags = menu_flags(snapshot);

    let _ = state.menu.status.set_text(&snapshot.status_label);
    let _ = state
        .menu
        .status
        .set_enabled(flags.status_clickable);

    let copy_label = if state
        .copy_flash_until
        .is_some_and(|until| Instant::now() < until)
    {
        LABEL_COPIED
    } else {
        LABEL_COPY_LAN
    };
    let _ = state.menu.copy_lan.set_text(copy_label);
    let _ = state.menu.copy_lan.set_enabled(flags.copy_lan);
    let _ = state.menu.open_browser.set_enabled(flags.open_browser);
    let _ = state
        .menu
        .toggle_host
        .set_text(toggle_label(snapshot));
    let _ = state.menu.toggle_host.set_enabled(flags.toggle_host);
    let _ = state.menu.restart_host.set_enabled(flags.restart_host);

    state.last_url = snapshot.url.clone();

    let tooltip = format_tooltip(
        snapshot.state,
        snapshot.url.as_deref(),
        snapshot.error_detail.as_deref(),
    );
    if state.last_tooltip.as_deref() != Some(tooltip.as_str()) {
        let _ = tray.set_tooltip(Some(&tooltip));
        state.last_tooltip = Some(tooltip);
    }

    if state.icon_state != snapshot.state {
        state.icon_state = snapshot.state;
        let icon = match snapshot.state {
            HostTrayState::Running => state.icons.running.clone(),
            HostTrayState::Error => state.icons.error.clone(),
            HostTrayState::Starting => state.icons.starting.clone(),
            HostTrayState::Idle => state.icons.base.clone(),
        };
        let _ = tray.set_icon(Some(icon));
    }
}

async fn refresh_tray_ui(
    app: &AppHandle,
    runtime: &SidecarRuntime,
    ui: &Arc<Mutex<TrayUiState>>,
) {
    let snapshot = resolve_host_snapshot(runtime).await;
    if let Some(tray_icon) = app.tray_by_id(TRAY_ID) {
        if let Ok(mut state) = ui.lock() {
            apply_tray_visual(&tray_icon, &mut state, &snapshot);
        }
    }
}

fn spawn_copy_flash(ui: Arc<Mutex<TrayUiState>>, notify: Arc<Notify>) {
    tauri::async_runtime::spawn(async move {
        {
            if let Ok(mut state) = ui.lock() {
                state.copy_flash_until = Some(Instant::now() + Duration::from_secs(COPY_FLASH_SECS));
            }
        }
        notify.notify_one();
        tokio::time::sleep(Duration::from_secs(COPY_FLASH_SECS)).await;
        {
            if let Ok(mut state) = ui.lock() {
                state.copy_flash_until = None;
            }
        }
        notify.notify_one();
    });
}

fn show_launcher_on_error(app: &AppHandle, nav: &LauncherNav) {
    show_main_window(app);
    let _ = launcher::navigate_to_launcher(app, nav);
}

async fn handle_toggle_host(app: AppHandle, runtime: Arc<SidecarRuntime>, nav: Arc<LauncherNav>) {
    if runtime.is_starting() {
        runtime.kill_child();
        let _ = crate::reclaim_ui_port_orphan();
        return;
    }

    let host_active = runtime.has_child()
        || matches!(
            check_health_at("127.0.0.1", UI_PORT).await,
            Ok(Some(_))
        );

    if host_active {
        runtime.kill_child();
        let _ = crate::reclaim_ui_port_orphan();
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
    let copy_lan = MenuItem::with_id(app, "tray_copy_lan", LABEL_COPY_LAN, false, None::<&str>)?;
    let open_browser =
        MenuItem::with_id(app, "tray_open_browser", "Otwórz w przeglądarce", false, None::<&str>)?;
    let sep_network = PredefinedMenuItem::separator(app)?;
    let toggle_host =
        MenuItem::with_id(app, "tray_toggle_host", "Uruchom Host", true, None::<&str>)?;
    let restart_host =
        MenuItem::with_id(app, "tray_restart_host", "Restartuj host", false, None::<&str>)?;
    let sep_control = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "tray_quit", "Zakończ StageSync", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &open,
            &status,
            &copy_lan,
            &open_browser,
            &sep_network,
            &toggle_host,
            &restart_host,
            &sep_control,
            &quit,
        ],
    )?;

    let refresh_notify = Arc::new(Notify::new());

    let ui = Arc::new(Mutex::new(TrayUiState {
        menu: TrayMenuHandles {
            status,
            copy_lan,
            open_browser,
            toggle_host,
            restart_host,
        },
        icon_state: HostTrayState::Idle,
        last_url: None,
        icons,
        copy_flash_until: None,
        last_tooltip: None,
    }));

    let runtime_menu = runtime.clone();
    let nav_menu = launcher_nav.clone();
    let ui_menu = ui.clone();
    let notify_menu = refresh_notify.clone();

    let initial_icon = ui
        .lock()
        .map(|s| s.icons.base.clone())
        .unwrap_or_else(|_| embed_icon(include_bytes!("../icons/tray/base.png")));

    let _tray = TrayIconBuilder::with_id(TRAY_ID)
        .icon(initial_icon)
        .tooltip("StageSync")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "tray_open" => show_main_window(app),
            "tray_status" => {
                if let Ok(guard) = ui_menu.lock() {
                    if guard.icon_state == HostTrayState::Error {
                        show_launcher_on_error(app, nav_menu.as_ref());
                    }
                }
                notify_menu.notify_one();
            }
            "tray_copy_lan" => {
                if let Ok(guard) = ui_menu.lock() {
                    if let Some(url) = guard.last_url.as_ref() {
                        if let Ok(mut cb) = arboard::Clipboard::new() {
                            let _ = cb.set_text(url.clone());
                            spawn_copy_flash(ui_menu.clone(), notify_menu.clone());
                        }
                    }
                }
            }
            "tray_open_browser" => {
                if let Ok(guard) = ui_menu.lock() {
                    if let Some(url) = guard.last_url.as_ref() {
                        let _ = open_url_in_browser(url);
                    }
                }
            }
            "tray_toggle_host" => {
                let app = app.clone();
                let runtime = runtime_menu.clone();
                let nav = nav_menu.clone();
                let notify = notify_menu.clone();
                tauri::async_runtime::spawn(async move {
                    handle_toggle_host(app, runtime, nav).await;
                    notify.notify_one();
                });
            }
            "tray_restart_host" => {
                let runtime = runtime_menu.clone();
                let notify = notify_menu.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = launcher::restart_local_host_managed(runtime.as_ref()).await;
                    notify.notify_one();
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
    let notify_refresh = refresh_notify;
    tauri::async_runtime::spawn(async move {
        loop {
            refresh_tray_ui(&app_handle, runtime_refresh.as_ref(), &ui_refresh).await;
            let notified = notify_refresh.notified();
            tokio::pin!(notified);
            let _ = tokio::time::timeout(Duration::from_secs(REFRESH_SECS), notified).await;
        }
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn truncate_error_short_and_long() {
        assert_eq!(truncate_error("ok", 48), "ok");
        let long = "ą".repeat(50);
        let out = truncate_error(&long, 48);
        assert!(out.ends_with('…'));
        assert!(out.chars().count() <= 49);
    }

    #[test]
    fn format_running_status_strips_scheme() {
        assert_eq!(
            format_running_status("http://192.168.1.5:4000"),
            "Host: działa · 192.168.1.5:4000"
        );
    }

    #[test]
    fn format_tooltip_running_includes_address() {
        let tip = format_tooltip(
            HostTrayState::Running,
            Some("http://10.0.0.2:4000"),
            None,
        );
        assert!(tip.contains("10.0.0.2:4000"));
    }

    #[test]
    fn format_tooltip_error_includes_detail() {
        let tip = format_tooltip(
            HostTrayState::Error,
            None,
            Some("port zajęty"),
        );
        assert!(tip.contains("port zajęty"));
    }

    #[test]
    fn menu_flags_running_managed_enables_network_and_restart() {
        let snap = HostSnapshot {
            state: HostTrayState::Running,
            status_label: "x".into(),
            url: Some("http://127.0.0.1:4000".into()),
            has_managed_child: true,
            is_starting: false,
            error_detail: None,
        };
        let f = menu_flags(&snap);
        assert!(f.copy_lan);
        assert!(f.open_browser);
        assert!(f.restart_host);
    }

    #[test]
    fn menu_flags_running_orphan_disables_restart() {
        let snap = HostSnapshot {
            state: HostTrayState::Running,
            status_label: "x".into(),
            url: Some("http://127.0.0.1:4000".into()),
            has_managed_child: false,
            is_starting: false,
            error_detail: None,
        };
        let f = menu_flags(&snap);
        assert!(f.copy_lan);
        assert!(!f.restart_host);
    }

    #[test]
    fn menu_flags_starting_shows_cancel() {
        let snap = HostSnapshot {
            state: HostTrayState::Starting,
            status_label: "x".into(),
            url: None,
            has_managed_child: false,
            is_starting: true,
            error_detail: None,
        };
        assert_eq!(toggle_label(&snap), "Anuluj start");
        let f = menu_flags(&snap);
        assert!(!f.copy_lan);
        assert!(!f.restart_host);
    }

    #[test]
    fn menu_flags_error_status_clickable() {
        let snap = HostSnapshot {
            state: HostTrayState::Error,
            status_label: "x".into(),
            url: None,
            has_managed_child: false,
            is_starting: false,
            error_detail: Some("fail".into()),
        };
        let f = menu_flags(&snap);
        assert!(f.status_clickable);
        assert!(!f.copy_lan);
    }
}
