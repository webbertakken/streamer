use std::sync::Arc;
use tauri::Manager;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, reload};

mod auth;
mod event_log;
mod helix;
mod presets;
mod settings;

/// Information about a connected display monitor.
#[derive(serde::Serialize)]
struct MonitorInfo {
    id: String,
    name: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

/// Return a list of all available monitors with their position and size.
#[tauri::command]
fn list_monitors(app: tauri::AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    Ok(monitors
        .iter()
        .enumerate()
        .map(|(i, m)| {
            let pos = m.position();
            let size = m.size();
            MonitorInfo {
                id: format!("monitor-{i}"),
                name: m
                    .name()
                    .unwrap_or(&format!("Monitor {}", i + 1))
                    .to_string(),
                x: pos.x,
                y: pos.y,
                width: size.width,
                height: size.height,
            }
        })
        .collect())
}

#[tauri::command]
fn set_ignore_cursor(window: tauri::WebviewWindow, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(unused_variables)]
fn get_cursor_position(window: tauri::WebviewWindow) -> Result<(f64, f64), String> {
    #[cfg(target_os = "windows")]
    {
        #[repr(C)]
        struct Point {
            x: i32,
            y: i32,
        }
        extern "system" {
            fn GetCursorPos(lp_point: *mut Point) -> i32;
        }
        let mut point = Point { x: 0, y: 0 };
        if unsafe { GetCursorPos(&mut point) } == 0 {
            return Err("GetCursorPos failed".into());
        }
        let win_pos = window.outer_position().map_err(|e| e.to_string())?;
        let scale = window.scale_factor().map_err(|e| e.to_string())?;
        Ok((
            (point.x - win_pos.x) as f64 / scale,
            (point.y - win_pos.y) as f64 / scale,
        ))
    }
    #[cfg(not(target_os = "windows"))]
    Err("get_cursor_position is only supported on Windows".into())
}

#[tauri::command]
#[allow(unused_variables)]
fn write_default_layout(data: String) -> Result<(), String> {
    #[cfg(not(debug_assertions))]
    return Err("Only available in development builds".to_string());

    #[cfg(debug_assertions)]
    {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
            .map_err(|_| "CARGO_MANIFEST_DIR not set".to_string())?;
        let project_root = std::path::Path::new(&manifest_dir)
            .parent()
            .ok_or("Could not determine project root")?;
        let target = project_root
            .join("src")
            .join("assets")
            .join("default-layout.json");
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&target, &data).map_err(|e| e.to_string())?;
        tracing::info!("Wrote default layout to: {}", target.display());
        Ok(())
    }
}

/// Open the application log folder in the system file explorer.
#[tauri::command]
fn open_log_folder() -> Result<(), String> {
    let data_dir = dirs::home_dir()
        .ok_or("Could not determine home directory")?
        .join(".config")
        .join("streamer")
        .join("logs");

    // Create the directory if it doesn't exist
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    // Use opener to reveal the folder
    opener::reveal(&data_dir).map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_monitors,
            set_ignore_cursor,
            get_cursor_position,
            auth::auth_device_start,
            auth::auth_device_poll,
            auth::auth_status,
            auth::auth_logout,
            auth::auth_get_irc_token,
            helix::helix_get,
            helix::eventsub_subscribe,
            event_log::append_event_log,
            event_log::flush_event_log,
            settings::read_settings,
            settings::write_settings,
            settings::read_chat_history,
            settings::write_chat_history,
            write_default_layout,
            open_log_folder,
            presets::list_presets,
            presets::save_preset,
            presets::load_preset,
            presets::delete_preset,
            presets::export_preset,
            presets::import_preset,
        ])
        .setup(|app| {
            let data_dir = dirs::home_dir()
                .ok_or("could not resolve home directory")?
                .join(".config")
                .join("streamer");
            std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

            // Application logging: stderr + daily rotating file with runtime log level control
            let file_appender = tracing_appender::rolling::daily(&data_dir, "streamer.log");
            let (file_writer, guard) = tracing_appender::non_blocking(file_appender);
            std::mem::forget(guard);

            let filter = EnvFilter::new("info");
            let (filter_layer, reload_handle) = reload::Layer::new(filter);

            tracing_subscriber::registry()
                .with(filter_layer)
                .with(fmt::layer().with_writer(std::io::stderr))
                .with(fmt::layer().with_writer(file_writer).with_ansi(false))
                .init();

            // Spawn stdin reader for runtime log level control (e.g. "log debug")
            {
                let reload_handle = reload_handle.clone();
                tauri::async_runtime::spawn(async move {
                    use tokio::io::{AsyncBufReadExt, BufReader};
                    let stdin = tokio::io::stdin();
                    let mut reader = BufReader::new(stdin).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        let trimmed = line.trim().to_lowercase();
                        if let Some(level) = trimmed.strip_prefix("log ") {
                            let level = level.trim();
                            match level {
                                "trace" | "debug" | "info" | "warn" | "error" => {
                                    match reload_handle
                                        .modify(|filter| *filter = EnvFilter::new(level))
                                    {
                                        Ok(()) => eprintln!("[log] level set to: {level}"),
                                        Err(e) => eprintln!("[log] failed to set level: {e}"),
                                    }
                                }
                                _ => {
                                    eprintln!("[log] unknown level: {level}");
                                    eprintln!(
                                        "[log] usage: log <trace|debug|info|warn|error>"
                                    );
                                }
                            }
                        } else if !trimmed.is_empty() {
                            eprintln!("[log] unknown command: {trimmed}");
                            eprintln!("[log] usage: log <trace|debug|info|warn|error>");
                        }
                    }
                });
            }

            let window = app.get_webview_window("main").unwrap();
            window.set_ignore_cursor_events(true)?;

            app.manage(Arc::new(auth::AuthState::new(data_dir.clone())));
            app.manage(settings::SettingsState::new(data_dir.clone()));

            let log_dir = data_dir.join("logs");
            app.manage(event_log::EventLogState::new(log_dir));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
