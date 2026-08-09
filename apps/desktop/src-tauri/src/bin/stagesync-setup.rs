//! Setup bootstrapper (splash + cichy NSIS):
//! 1) splash od razu (WebView2 / wry)
//! 2) cichy NSIS (`/S`) — z osadzonego payloadu albo `--payload <path>`
//! 3) start stagesync-desktop `--installer-handoff`
//!
//! Single-file (build-nsis-smoke / pack):
//!   [stagesync-setup.exe][payload.exe][u64 le length][magic b"SSPAY001"]
//!
//! Update (z zainstalowanej appki):
//!   stagesync-setup --payload <verified-nsis.exe> --update --wait-pid <pid> --launch <app.exe>
#![cfg_attr(windows, windows_subsystem = "windows")]

use std::env;
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;

use tao::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder, EventLoopProxy},
    window::WindowBuilder,
};
use wry::{WebContext, WebViewBuilder};

const SPLASH_HTML: &str = include_str!("../../assets/installer/boot-splash.html");
const SPLASH_LOGO: &[u8] = include_bytes!("../../assets/installer/stagesync-logo.svg");

/// Magiczna stopka single-file (musi zgadzać się z pack-stagesync-setup.mjs).
const PAYLOAD_MAGIC: &[u8; 8] = b"SSPAY001";

#[derive(Debug, Default)]
struct Cli {
    /// Zweryfikowany NSIS z updatera (albo jawny payload).
    payload: Option<PathBuf>,
    /// Tryb aktualizacji — czekaj na wyjście starej appki przed NSIS.
    update: bool,
    /// PID procesu do odczekania (zwykle stagesync-desktop).
    wait_pid: Option<u32>,
    /// Ścieżka do stagesync-desktop po instalacji (preferowana).
    launch: Option<PathBuf>,
}

#[derive(Debug)]
enum UserEvent {
    InstallDone { ok: bool },
}

fn main() {
    let cli = parse_cli();
    let exe = env::current_exe().expect("current_exe");
    let dir = exe.parent().unwrap_or_else(|| Path::new(".")).to_path_buf();

    let html = inject_logo_data_url(SPLASH_HTML, SPLASH_LOGO);

    let event_loop = EventLoopBuilder::<UserEvent>::with_user_event().build();
    let proxy: EventLoopProxy<UserEvent> = event_loop.create_proxy();

    let window = WindowBuilder::new()
        .with_title("StageSync")
        .with_inner_size(tao::dpi::LogicalSize::new(520.0, 320.0))
        .with_resizable(false)
        .with_decorations(false)
        .with_always_on_top(true)
        .with_visible(true)
        .build(&event_loop)
        .expect("splash window");

    if let Some(monitor) = window.current_monitor() {
        let screen = monitor.size();
        let scale = monitor.scale_factor();
        let w = (520.0 * scale) as i32;
        let h = (320.0 * scale) as i32;
        let x = (screen.width as i32 - w) / 2;
        let y = (screen.height as i32 - h) / 2;
        window.set_outer_position(tao::dpi::PhysicalPosition::new(x.max(0), y.max(0)));
    }

    let _webview = {
        // WebView2 domyślnie sypie „*.exe.WebView2” obok EXE — trzymaj profil w TEMP.
        let data_dir = env::temp_dir().join(format!(
            "stagesync-setup-wv2-{}",
            std::process::id()
        ));
        let _ = fs::create_dir_all(&data_dir);
        let mut web_context = WebContext::new(Some(data_dir));
        let webview = WebViewBuilder::new_with_web_context(&mut web_context)
            .with_html(&html)
            .build(&window)
            .expect("splash webview");
        std::mem::forget(web_context);
        webview
    };

    let exe_for_thread = exe.clone();
    let dir_for_thread = dir.clone();
    thread::spawn(move || {
        let result = run_install_flow(&cli, &exe_for_thread, &dir_for_thread);
        let _ = proxy.send_event(match result {
            Ok(app) => {
                let child = Command::new(&app)
                    .arg("--installer-handoff")
                    .stdin(Stdio::null())
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn();
                match child {
                    Ok(mut proc) => {
                        wait_for_main_window(&mut proc);
                    }
                    Err(_) => thread::sleep(Duration::from_millis(2500)),
                }
                UserEvent::InstallDone { ok: true }
            }
            Err(_) => UserEvent::InstallDone { ok: false },
        });
    });

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::UserEvent(UserEvent::InstallDone { ok }) => {
                if !ok {
                    window.set_title("StageSync — błąd instalacji");
                    window.set_always_on_top(false);
                } else {
                    *control_flow = ControlFlow::Exit;
                }
            }
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                *control_flow = ControlFlow::Exit;
            }
            _ => {}
        }
    });
}

fn parse_cli() -> Cli {
    let mut cli = Cli::default();
    let mut args = env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--payload" => {
                if let Some(p) = args.next() {
                    cli.payload = Some(PathBuf::from(p));
                }
            }
            "--update" => cli.update = true,
            "--wait-pid" => {
                if let Some(p) = args.next() {
                    cli.wait_pid = p.parse().ok();
                }
            }
            "--launch" => {
                if let Some(p) = args.next() {
                    cli.launch = Some(PathBuf::from(p));
                }
            }
            _ => {}
        }
    }
    cli
}

fn inject_logo_data_url(html: &str, logo_svg: &[u8]) -> String {
    let b64 = base64_encode(logo_svg);
    let data = format!("data:image/svg+xml;base64,{b64}");
    html.replace("src=\"stagesync-logo.svg\"", &format!("src=\"{data}\""))
}

fn run_install_flow(cli: &Cli, self_exe: &Path, dir: &Path) -> Result<PathBuf, String> {
    if let Some(pid) = cli.wait_pid {
        wait_for_process_exit(pid, Duration::from_secs(60));
    } else if cli.update {
        // Parent powinien przekazać --wait-pid; krótka pauza na exit.
        thread::sleep(Duration::from_millis(800));
    }

    let (payload, cleanup_temp) = resolve_payload(cli.payload.as_deref(), self_exe, dir)?;
    let temp_parent = cleanup_temp
        .then(|| payload.parent().map(|p| p.to_path_buf()))
        .flatten();

    let status = Command::new(&payload)
        .arg("/S")
        .current_dir(dir)
        .status()
        .map_err(|e| format!("Nie uruchomiono instalatora: {e}"))?;

    if cleanup_temp {
        let _ = fs::remove_file(&payload);
        if let Some(parent) = temp_parent {
            let _ = fs::remove_dir_all(parent);
        }
    } else if cli.payload.is_some() {
        // Payload z updatera (TEMP) — sprzątamy po cichym NSIS.
        let _ = fs::remove_file(&payload);
    }

    if !status.success() {
        return Err(format!(
            "Instalator zakończył się kodem {:?}",
            status.code()
        ));
    }

    if let Some(launch) = cli.launch.as_ref() {
        if launch.is_file() {
            return Ok(launch.clone());
        }
    }

    find_installed_app(dir)
}

/// Wyciąga osadzony payload, bierze `--payload`, albo luźny plik obok (dev fallback).
fn resolve_payload(
    override_path: Option<&Path>,
    self_exe: &Path,
    dir: &Path,
) -> Result<(PathBuf, bool), String> {
    if let Some(p) = override_path {
        if !p.is_file() {
            return Err(format!("Brak pliku payload: {}", p.display()));
        }
        return Ok((p.to_path_buf(), false));
    }

    if let Some(embedded) = extract_embedded_payload(self_exe)? {
        return Ok((embedded, true));
    }

    for name in ["installer-payload.exe", "StageSync-installer-payload.exe"] {
        let p = dir.join(name);
        if p.is_file() {
            return Ok((p, false));
        }
    }

    Err(
        "Brak osadzonego payloadu NSIS, --payload i installer-payload.exe obok Setup.exe."
            .into(),
    )
}

fn extract_embedded_payload(self_exe: &Path) -> Result<Option<PathBuf>, String> {
    let mut f = File::open(self_exe).map_err(|e| format!("open self: {e}"))?;
    let len = f
        .seek(SeekFrom::End(0))
        .map_err(|e| format!("seek end: {e}"))?;
    if len < 16 {
        return Ok(None);
    }

    let mut footer = [0u8; 16];
    f.seek(SeekFrom::End(-16))
        .map_err(|e| format!("seek footer: {e}"))?;
    f.read_exact(&mut footer)
        .map_err(|e| format!("read footer: {e}"))?;

    if &footer[8..16] != PAYLOAD_MAGIC {
        return Ok(None);
    }
    let payload_len = u64::from_le_bytes(footer[0..8].try_into().unwrap());
    if payload_len == 0 || payload_len > len.saturating_sub(16) {
        return Err("Uszkodzony osadzony payload (zła długość).".into());
    }

    let payload_start = len - 16 - payload_len;
    f.seek(SeekFrom::Start(payload_start))
        .map_err(|e| format!("seek payload: {e}"))?;

    let temp_dir = env::temp_dir().join(format!(
        "stagesync-setup-{}",
        std::process::id()
    ));
    fs::create_dir_all(&temp_dir).map_err(|e| format!("temp dir: {e}"))?;
    let out = temp_dir.join("installer-payload.exe");

    let mut out_f = File::create(&out).map_err(|e| format!("create payload: {e}"))?;
    let mut left = payload_len;
    let mut buf = vec![0u8; 1024 * 256];
    while left > 0 {
        let n = left.min(buf.len() as u64) as usize;
        f.read_exact(&mut buf[..n])
            .map_err(|e| format!("read payload: {e}"))?;
        out_f
            .write_all(&buf[..n])
            .map_err(|e| format!("write payload: {e}"))?;
        left -= n as u64;
    }
    out_f.flush().ok();

    Ok(Some(out))
}

fn find_installed_app(dir: &Path) -> Result<PathBuf, String> {
    let local = env::var_os("LOCALAPPDATA").map(PathBuf::from);
    let mut guesses = Vec::new();
    if let Some(local) = local {
        guesses.push(local.join("StageSync NSIS Smoke\\stagesync-desktop.exe"));
        guesses.push(local.join("StageSync\\stagesync-desktop.exe"));
    }
    guesses.push(dir.join("stagesync-desktop.exe"));

    for g in guesses {
        if g.is_file() {
            return Ok(g);
        }
    }

    Err(
        "Zainstalowano, ale nie znaleziono stagesync-desktop.exe — sprawdź folder instalacji."
            .into(),
    )
}

fn wait_for_process_exit(pid: u32, timeout: Duration) {
    let deadline = std::time::Instant::now() + timeout;
    while std::time::Instant::now() < deadline {
        if !process_alive(pid) {
            // Krótka pauza na zwolnienie uchwytów plików.
            thread::sleep(Duration::from_millis(400));
            return;
        }
        thread::sleep(Duration::from_millis(100));
    }
}

#[cfg(windows)]
fn process_alive(pid: u32) -> bool {
    extern "system" {
        fn OpenProcess(access: u32, inherit: i32, pid: u32) -> *mut core::ffi::c_void;
        fn CloseHandle(handle: *mut core::ffi::c_void) -> i32;
        fn GetExitCodeProcess(handle: *mut core::ffi::c_void, code: *mut u32) -> i32;
    }
    const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
    const STILL_ACTIVE: u32 = 259;

    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle.is_null() {
            return false;
        }
        let mut code = 0u32;
        let ok = GetExitCodeProcess(handle, &mut code);
        CloseHandle(handle);
        ok != 0 && code == STILL_ACTIVE
    }
}

#[cfg(not(windows))]
fn process_alive(_pid: u32) -> bool {
    false
}

/// Czekaj aż stagesync-desktop pokaże główne okno (~1280px), max ~12 s.
/// Ignoruj mały splash Tauri (520px), żeby nie zdejmować bootstrapu za wcześnie.
fn wait_for_main_window(proc: &mut std::process::Child) {
    let deadline = std::time::Instant::now() + Duration::from_secs(12);
    while std::time::Instant::now() < deadline {
        match proc.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if app_main_window_visible(proc.id()) {
                    thread::sleep(Duration::from_millis(250));
                    break;
                }
            }
            Err(_) => break,
        }
        thread::sleep(Duration::from_millis(100));
    }
}

#[cfg(windows)]
fn app_main_window_visible(pid: u32) -> bool {
    #[repr(C)]
    struct EnumData {
        pid: u32,
        found: bool,
    }

    #[repr(C)]
    struct Rect {
        left: i32,
        top: i32,
        right: i32,
        bottom: i32,
    }

    type WndEnumProc = unsafe extern "system" fn(hwnd: *mut core::ffi::c_void, lparam: isize) -> i32;

    extern "system" {
        fn EnumWindows(cb: WndEnumProc, lparam: isize) -> i32;
        fn GetWindowThreadProcessId(hwnd: *mut core::ffi::c_void, pid: *mut u32) -> u32;
        fn IsWindowVisible(hwnd: *mut core::ffi::c_void) -> i32;
        fn GetWindow(hwnd: *mut core::ffi::c_void, cmd: u32) -> *mut core::ffi::c_void;
        fn GetClientRect(hwnd: *mut core::ffi::c_void, rect: *mut Rect) -> i32;
    }

    const GW_OWNER: u32 = 4;
    // Splash ≈ 520 CSS px; main ≈ 1280. Próg w physical px (OK też przy 125–150% DPI).
    const MIN_MAIN_WIDTH: i32 = 700;

    unsafe extern "system" fn enum_proc(hwnd: *mut core::ffi::c_void, lparam: isize) -> i32 {
        let data = &mut *(lparam as *mut EnumData);
        let mut win_pid = 0u32;
        GetWindowThreadProcessId(hwnd, &mut win_pid);
        if win_pid != data.pid || IsWindowVisible(hwnd) == 0 || !GetWindow(hwnd, GW_OWNER).is_null()
        {
            return 1;
        }
        let mut rect = Rect {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
        };
        if GetClientRect(hwnd, &mut rect) != 0 {
            let w = rect.right - rect.left;
            if w >= MIN_MAIN_WIDTH {
                data.found = true;
                return 0;
            }
        }
        1
    }

    let mut data = EnumData {
        pid,
        found: false,
    };
    unsafe {
        EnumWindows(enum_proc, &mut data as *mut _ as isize);
    }
    data.found
}

#[cfg(not(windows))]
fn app_main_window_visible(_pid: u32) -> bool {
    true
}

fn base64_encode(data: &[u8]) -> String {
    const T: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let mut n = (chunk[0] as u32) << 16;
        if chunk.len() > 1 {
            n |= (chunk[1] as u32) << 8;
        }
        if chunk.len() > 2 {
            n |= chunk[2] as u32;
        }
        out.push(T[((n >> 18) & 63) as usize] as char);
        out.push(T[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 {
            T[((n >> 6) & 63) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            T[(n & 63) as usize] as char
        } else {
            '='
        });
    }
    out
}
