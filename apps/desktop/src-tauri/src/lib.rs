use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

pub(crate) const UI_PORT: u16 = 4000;
/// First Windows launch often waits on Defender scanning the Node sidecar tree.
#[cfg(target_os = "windows")]
pub(crate) const STARTUP_TIMEOUT: Duration = Duration::from_secs(120);
#[cfg(not(target_os = "windows"))]
pub(crate) const STARTUP_TIMEOUT: Duration = Duration::from_secs(45);
pub(crate) const HEALTHCHECK_INTERVAL: Duration = Duration::from_millis(250);
pub(crate) const SIDECAR_LOG_CAP: usize = 6_000;
/// Relative to sidecar `server/` cwd — avoids passing Win32 `\\?\` absolute paths as Node's main module.
pub(crate) const SERVER_ENTRY_REL: &str = "dist/index.js";

mod launcher;

/// Strip Win32 extended-length / verbatim prefixes so Node can realpath the entry.
///
/// Tauri `resource_dir()` often yields `\\?\C:\…`. Passing that as Node argv makes
/// `realpathSync` collapse to bare `C:` → `EISDIR` (nodejs/node#62446, #60435).
/// Logic is OS-agnostic so unit tests cover it on macOS/Linux CI.
pub(crate) fn path_for_node(path: &Path) -> PathBuf {
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
pub(crate) fn assert_node_path_usable(path: &Path, label: &str) -> Result<(), String> {
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

    #[test]
    fn parses_health_version_from_http_response() {
        let resp = concat!(
            "HTTP/1.1 200 OK\r\n",
            "Content-Type: application/json\r\n",
            "\r\n",
            r#"{"ok":true,"service":"stagesync-server","version":"5.0.0-beta.1"}"#,
        );
        assert_eq!(
            parse_health_version(resp).as_deref(),
            Some("5.0.0-beta.1")
        );
    }

    #[test]
    fn rejects_health_body_without_version() {
        let resp = "HTTP/1.1 200 OK\r\n\r\n{\"ok\":true}";
        assert_eq!(parse_health_version(resp), None);
    }
}

#[derive(Clone, serde::Deserialize, serde::Serialize)]
struct RecentProject {
    id: String,
    name: String,
}

#[derive(Clone)]
struct NavState {
    timeline_project_id: Arc<Mutex<Option<String>>>,
    recent_projects: Arc<Mutex<Vec<RecentProject>>>,
    can_undo: Arc<Mutex<bool>>,
    can_redo: Arc<Mutex<bool>>,
}

pub(crate) fn nav_url(path: &str) -> String {
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
    "https://github.com/Negatywistczny/stagesync/blob/main/docs/INSTALL.md";
const DOCS_ISSUES_URL: &str = "https://github.com/Negatywistczny/stagesync/issues";

fn navigate_main(app: &tauri::AppHandle, path: &str) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if let Ok(parsed) = nav_url(path).parse() {
        let _ = window.navigate(parsed);
    }
}

/// Desktop OS menu Faza A+B+C: StageSync | Plik | Widok | Transport | Host | Pomoc (ADR 0010).
fn dispatch_menu_action(app: &tauri::AppHandle, action: &str) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let action_json = serde_json::to_string(action).unwrap_or_else(|_| "\"\"".into());
    let js = format!(
        r#"(function(){{try{{window.dispatchEvent(new CustomEvent("stagesync:desktop-menu",{{detail:{{action:{action_json}}}}}));}}catch(_e){{}}}})();"#
    );
    let _ = window.eval(js);
}

fn truncate_menu_label(name: &str, max_chars: usize) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return "Bez nazwy".into();
    }
    let mut chars = trimmed.chars();
    let head: String = chars.by_ref().take(max_chars).collect();
    if chars.next().is_some() {
        format!("{head}…")
    } else {
        head
    }
}

fn build_desktop_menu(app: &tauri::AppHandle, nav_state: &NavState) -> tauri::Result<Menu<tauri::Wry>> {
    let about = MenuItem::with_id(app, "about", "O programie StageSync", true, None::<&str>)?;
    let preferences = MenuItem::with_id(
        app,
        "preferences",
        "Preferencje…",
        true,
        Some("CmdOrCtrl+,"),
    )?;
    let check_updates = MenuItem::with_id(
        app,
        "check_updates",
        "Sprawdź aktualizacje...",
        true,
        None::<&str>,
    )?;
    let quit = PredefinedMenuItem::quit(app, Some("Zakończ"))?;
    let app_sep = PredefinedMenuItem::separator(app)?;
    let app_sep_2 = PredefinedMenuItem::separator(app)?;
    let app_submenu = Submenu::with_items(
        app,
        "StageSync",
        true,
        &[&about, &preferences, &app_sep, &check_updates, &app_sep_2, &quit],
    )?;

    let recent = nav_state
        .recent_projects
        .lock()
        .ok()
        .map(|g| g.clone())
        .unwrap_or_default();
    let recent_items: Vec<MenuItem<tauri::Wry>> = if recent.is_empty() {
        vec![MenuItem::with_id(
            app,
            "recent_empty",
            "Brak ostatnich",
            false,
            None::<&str>,
        )?]
    } else {
        recent
            .iter()
            .map(|p| {
                let id = format!("recent:{}", p.id);
                let label = truncate_menu_label(&p.name, 40);
                MenuItem::with_id(app, id, label, true, None::<&str>)
            })
            .collect::<Result<Vec<_>, _>>()?
    };
    let recent_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = recent_items
        .iter()
        .map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>)
        .collect();
    let open_recent = Submenu::with_items(app, "Otwórz ostatnie", true, &recent_refs)?;
    let file_save = MenuItem::with_id(app, "file_save", "Zapisz", true, Some("CmdOrCtrl+S"))?;
    let file_close = MenuItem::with_id(
        app,
        "file_close",
        "Zamknij projekt",
        true,
        None::<&str>,
    )?;
    let file_sep = PredefinedMenuItem::separator(app)?;
    let file_submenu = Submenu::with_items(
        app,
        "Plik",
        true,
        &[&open_recent, &file_sep, &file_save, &file_close],
    )?;

    // Timeline draft undo/redo: custom items (not PredefinedMenuItem::undo) so
    // WebView receives stagesync:desktop-menu instead of native text undo.
    // Enabled state synced from Timeline via set_edit_history_state.
    let can_undo = nav_state
        .can_undo
        .lock()
        .ok()
        .map(|g| *g)
        .unwrap_or(false);
    let can_redo = nav_state
        .can_redo
        .lock()
        .ok()
        .map(|g| *g)
        .unwrap_or(false);
    let edit_undo = MenuItem::with_id(
        app,
        "edit_undo",
        "Cofnij",
        can_undo,
        Some("CmdOrCtrl+Z"),
    )?;
    let edit_redo = MenuItem::with_id(
        app,
        "edit_redo",
        "Ponów",
        can_redo,
        Some("CmdOrCtrl+Shift+Z"),
    )?;
    let edit_sep = PredefinedMenuItem::separator(app)?;
    let edit_cut = PredefinedMenuItem::cut(app, Some("Wytnij"))?;
    let edit_copy = PredefinedMenuItem::copy(app, Some("Kopiuj"))?;
    let edit_paste = PredefinedMenuItem::paste(app, Some("Wklej"))?;
    let edit_delete = MenuItem::with_id(app, "edit_delete", "Usuń", true, None::<&str>)?;
    let edit_select_all = PredefinedMenuItem::select_all(app, Some("Zaznacz wszystko"))?;
    let edit_submenu = Submenu::with_items(
        app,
        "Edycja",
        true,
        &[
            &edit_undo,
            &edit_redo,
            &edit_sep,
            &edit_cut,
            &edit_copy,
            &edit_paste,
            &edit_delete,
            &edit_select_all,
        ],
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
    let view_zoom_in = MenuItem::with_id(
        app,
        "view_zoom_in",
        "Powiększ",
        true,
        Some("CmdOrCtrl+="),
    )?;
    let view_zoom_out = MenuItem::with_id(
        app,
        "view_zoom_out",
        "Pomniejsz",
        true,
        Some("CmdOrCtrl+-"),
    )?;
    let view_zoom_reset = MenuItem::with_id(
        app,
        "view_zoom_reset",
        "Rzeczywisty rozmiar",
        true,
        Some("CmdOrCtrl+0"),
    )?;
    let view_sep_1 = PredefinedMenuItem::separator(app)?;
    let view_sep_2 = PredefinedMenuItem::separator(app)?;
    let view_sep_3 = PredefinedMenuItem::separator(app)?;

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
            &view_zoom_in,
            &view_zoom_out,
            &view_zoom_reset,
            &view_sep_3,
            &fullscreen,
        ],
    )?;

    let transport_play =
        MenuItem::with_id(app, "transport_play", "Odtwórz", true, None::<&str>)?;
    let transport_stop =
        MenuItem::with_id(app, "transport_stop", "Stop", true, None::<&str>)?;
    let transport_sep = PredefinedMenuItem::separator(app)?;
    let transport_prev = MenuItem::with_id(
        app,
        "transport_prev",
        "Poprzedni utwór",
        true,
        Some("Alt+Left"),
    )?;
    let transport_next = MenuItem::with_id(
        app,
        "transport_next",
        "Następny utwór",
        true,
        Some("Alt+Right"),
    )?;
    let transport_submenu = Submenu::with_items(
        app,
        "Transport",
        true,
        &[
            &transport_play,
            &transport_stop,
            &transport_sep,
            &transport_prev,
            &transport_next,
        ],
    )?;

    let host_status =
        MenuItem::with_id(app, "host_status", "Status", true, None::<&str>)?;
    let host_clients = MenuItem::with_id(
        app,
        "host_clients",
        "Klienci / urządzenia",
        true,
        None::<&str>,
    )?;
    let host_qr = MenuItem::with_id(app, "host_qr", "Kod QR…", true, None::<&str>)?;
    let host_restart =
        MenuItem::with_id(app, "host_restart", "Restart hosta", true, None::<&str>)?;
    let host_settings = MenuItem::with_id(
        app,
        "host_settings",
        "Ustawienia…",
        true,
        None::<&str>,
    )?;
    let host_sep = PredefinedMenuItem::separator(app)?;
    let host_submenu = Submenu::with_items(
        app,
        "Host",
        true,
        &[
            &host_status,
            &host_clients,
            &host_qr,
            &host_sep,
            &host_restart,
            &host_settings,
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
    let help_shortcuts = MenuItem::with_id(
        app,
        "help_shortcuts",
        "Skróty klawiszowe…",
        true,
        Some("CmdOrCtrl+/"),
    )?;
    let help_export = MenuItem::with_id(
        app,
        "help_export_diagnostics",
        "Eksportuj logi diagnostyczne…",
        true,
        None::<&str>,
    )?;
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
        &[
            &help_shortcuts,
            &help_docs,
            &help_issues,
            &help_export,
            &help_sep,
            &help_about,
        ],
    )?;
    #[cfg(target_os = "macos")]
    let help_submenu = Submenu::with_items(
        app,
        "Pomoc",
        true,
        &[&help_shortcuts, &help_docs, &help_issues, &help_export],
    )?;

    Menu::with_items(
        app,
        &[
            &app_submenu,
            &file_submenu,
            &edit_submenu,
            &view_submenu,
            &transport_submenu,
            &host_submenu,
            &help_submenu,
        ],
    )
}

fn refresh_desktop_menu(app: &tauri::AppHandle, nav_state: &NavState) {
    if let Ok(menu) = build_desktop_menu(app, nav_state) {
        let _ = app.set_menu(menu);
    }
}

fn install_desktop_menu(app: &tauri::AppHandle, nav_state: NavState) -> tauri::Result<()> {
    let menu = build_desktop_menu(app, &nav_state)?;
    app.set_menu(menu)?;

    let nav_for_events = nav_state;
    app.on_menu_event(move |app, event| {
        let id = event.id().0.as_str();
        if let Some(project_id) = id.strip_prefix("recent:") {
            navigate_main(&app, &format!("/timeline/{project_id}"));
            return;
        }
        match id {
            "about" | "help_about" => navigate_main(&app, "/admin?section=host"),
            "preferences" => dispatch_menu_action(&app, "preferences"),
            "check_updates" => navigate_main(&app, "/admin?section=host&action=check-update"),
            "file_save" => dispatch_menu_action(&app, "save"),
            "edit_undo" => dispatch_menu_action(&app, "edit-undo"),
            "edit_redo" => dispatch_menu_action(&app, "edit-redo"),
            "edit_delete" => dispatch_menu_action(&app, "edit-delete"),
            "file_close" => navigate_main(&app, "/admin"),
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
            "view_zoom_in" => dispatch_menu_action(&app, "view-zoom-in"),
            "view_zoom_out" => dispatch_menu_action(&app, "view-zoom-out"),
            "view_zoom_reset" => dispatch_menu_action(&app, "view-zoom-reset"),
            "transport_play" => dispatch_menu_action(&app, "transport-play"),
            "transport_stop" => dispatch_menu_action(&app, "transport-stop"),
            "transport_prev" => dispatch_menu_action(&app, "transport-prev"),
            "transport_next" => dispatch_menu_action(&app, "transport-next"),
            "host_status" | "host_settings" => navigate_main(&app, "/admin?section=host"),
            "host_clients" => navigate_main(&app, "/admin?section=stage"),
            "host_qr" => dispatch_menu_action(&app, "host-qr"),
            "host_restart" => dispatch_menu_action(&app, "host-restart"),
            "help_shortcuts" => dispatch_menu_action(&app, "help-shortcuts"),
            "help_export_diagnostics" => {
                dispatch_menu_action(&app, "diagnostics-export")
            }
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

pub(crate) fn append_sidecar_log(log: &mut String, chunk: &str) {
    log.push_str(chunk);
    if !chunk.ends_with('\n') {
        log.push('\n');
    }
    if log.len() > SIDECAR_LOG_CAP {
        let keep = &log[log.len() - SIDECAR_LOG_CAP..];
        *log = format!("…\n{keep}");
    }
}

pub(crate) fn append_sidecar_file_log(path: &Path, chunk: &str) {
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
    {
        let _ = f.write_all(chunk.as_bytes());
        if !chunk.ends_with('\n') {
            let _ = f.write_all(b"\n");
        }
    }
}

pub(crate) fn format_sidecar_failure(kind: &str, detail: &str, log_tail: &str) -> String {
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

pub(crate) fn startup_failure_message(log_tail: &str, last_health_err: Option<&str>) -> String {
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

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct HealthOk {
    pub version: String,
}

/// Parse `version` from an HTTP response to `GET /api/health` (body after headers).
fn parse_health_version(resp: &str) -> Option<String> {
    let body = resp.split("\r\n\r\n").nth(1).or_else(|| resp.split("\n\n").nth(1))?;
    let value: serde_json::Value = serde_json::from_str(body.trim()).ok()?;
    value
        .get("version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

/// `Ok(None)` = TCP up but not HTTP 200 yet; `Ok(Some)` = healthy StageSync.
pub(crate) async fn check_health_at(host: &str, port: u16) -> Result<Option<HealthOk>, String> {
    let addr = format!("{host}:{port}");
    let mut stream = TcpStream::connect(&addr)
        .await
        .map_err(|e| format!("connect failed: {e}"))?;

    let req = format!(
        "GET /api/health HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n"
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
    let ok = resp.starts_with("HTTP/1.1 200") || resp.starts_with("HTTP/1.0 200");
    if !ok {
        return Ok(None);
    }
    let version = parse_health_version(&resp).ok_or_else(|| {
        "odpowiedź /api/health bez pola version (obcy proces na porcie?)".to_string()
    })?;
    Ok(Some(HealthOk { version }))
}

/// Standalone desktop: Launcher UI first; local sidecar or remote host on demand (ADR 0014).
/// No musical clock / MIDI in this process (ADR 0010).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sidecar_runtime = Arc::new(launcher::SidecarRuntime::default());
    let sidecar_runtime_run = sidecar_runtime.clone();
    let nav_state = NavState {
        timeline_project_id: Arc::new(Mutex::new(None)),
        recent_projects: Arc::new(Mutex::new(Vec::new())),
        can_undo: Arc::new(Mutex::new(false)),
        can_redo: Arc::new(Mutex::new(false)),
    };
    let nav_state_setup = nav_state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(nav_state)
        .manage(sidecar_runtime)
        .setup(move |app| {
            let _ = install_desktop_menu(app.handle(), nav_state_setup.clone());
            // Window loads bundled Launcher (frontendDist). Sidecar starts only via invoke.
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_desktop_update,
            install_desktop_update,
            open_external_url,
            toggle_window_fullscreen,
            set_nav_timeline_project_id,
            set_nav_recent_projects,
            set_edit_history_state,
            launcher::get_launcher_bootstrap,
            launcher::launcher_list_recent,
            launcher::get_sidecar_log_tail,
            launcher::cancel_local_host,
            launcher::discover_lan_hosts,
            launcher::connect_remote_host,
            launcher::start_local_host,
        ])
        .build(tauri::generate_context!())
        .expect("error while building StageSync desktop")
        .run(move |_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Ok(mut guard) = sidecar_runtime_run.child.lock() {
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

/// Sync Open Recent list for Plik menu (Faza B).
#[tauri::command]
fn set_nav_recent_projects(
    app: tauri::AppHandle,
    state: tauri::State<'_, NavState>,
    projects: Vec<RecentProject>,
) -> Result<(), String> {
    {
        let mut guard = state.recent_projects.lock().map_err(|e| e.to_string())?;
        *guard = projects
            .into_iter()
            .filter(|p| !p.id.is_empty())
            .take(8)
            .collect();
    }
    refresh_desktop_menu(&app, &state);
    Ok(())
}

/// Sync Timeline draft undo/redo availability to native Edycja menu (Faza D).
#[tauri::command]
fn set_edit_history_state(
    app: tauri::AppHandle,
    state: tauri::State<'_, NavState>,
    can_undo: bool,
    can_redo: bool,
) -> Result<(), String> {
    {
        let mut undo = state.can_undo.lock().map_err(|e| e.to_string())?;
        let mut redo = state.can_redo.lock().map_err(|e| e.to_string())?;
        if *undo == can_undo && *redo == can_redo {
            return Ok(());
        }
        *undo = can_undo;
        *redo = can_redo;
    }
    refresh_desktop_menu(&app, &state);
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
