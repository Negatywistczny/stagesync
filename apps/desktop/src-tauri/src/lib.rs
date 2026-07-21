use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

/// Thin shell: WebView → local StageSync server (Compose / `pnpm` on :4000).
/// No musical clock / MIDI in this process (ADR 0010).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let url = std::env::var("STAGESYNC_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:4000".to_string());
            if let Some(window) = app.get_webview_window("main") {
                match url.parse() {
                    Ok(parsed) => {
                        let _ = window.navigate(parsed);
                    }
                    Err(err) => {
                        eprintln!("[stagesync-desktop] invalid STAGESYNC_URL: {err}");
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_desktop_update,
            install_desktop_update,
        ])
        .run(tauri::generate_context!())
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
