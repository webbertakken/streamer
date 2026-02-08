use std::sync::Arc;
use tauri::Manager;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod event_log;
mod helix;
mod settings;

#[tauri::command]
fn set_ignore_cursor(window: tauri::WebviewWindow, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_cursor_position(window: tauri::WebviewWindow) -> Result<(f64, f64), String> {
    #[cfg(target_os = "windows")]
    {
        #[repr(C)]
        struct POINT {
            x: i32,
            y: i32,
        }
        extern "system" {
            fn GetCursorPos(lp_point: *mut POINT) -> i32;
        }
        let mut point = POINT { x: 0, y: 0 };
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
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
        ])
        .setup(|app| {
            let data_dir = dirs::home_dir()
                .ok_or("could not resolve home directory")?
                .join(".config")
                .join("streamer");
            std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

            // Application logging: stderr + daily rotating file
            let file_appender = tracing_appender::rolling::daily(&data_dir, "streamer.log");
            let (file_writer, guard) = tracing_appender::non_blocking(file_appender);
            std::mem::forget(guard);

            tracing_subscriber::registry()
                .with(fmt::layer().with_writer(std::io::stderr))
                .with(fmt::layer().with_writer(file_writer).with_ansi(false))
                .init();

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
