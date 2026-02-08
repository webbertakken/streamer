use serde_json::Value;
use std::path::PathBuf;
use tracing::{error, info};

/// Shared settings state managed by Tauri.
pub struct SettingsState {
    path: PathBuf,
    chat_history_path: PathBuf,
}

impl SettingsState {
    pub fn new(data_dir: PathBuf) -> Self {
        Self {
            path: data_dir.join("settings.json"),
            chat_history_path: data_dir.join("ephemeral-chat-history.json"),
        }
    }
}

#[tauri::command]
pub fn read_settings(state: tauri::State<'_, SettingsState>) -> Result<Option<Value>, String> {
    match std::fs::read_to_string(&state.path) {
        Ok(json) => {
            info!("[settings] loaded from {}", state.path.display());
            let data: Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
            Ok(Some(data))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            info!("[settings] no file at {}", state.path.display());
            Ok(None)
        }
        Err(e) => {
            error!("[settings] read error: {e}");
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn write_settings(data: Value, state: tauri::State<'_, SettingsState>) -> Result<(), String> {
    if let Some(parent) = state.path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&state.path, &json).map_err(|e| {
        error!("[settings] write error: {e}");
        e.to_string()
    })?;
    info!("[settings] saved to {}", state.path.display());
    Ok(())
}

#[tauri::command]
pub fn read_chat_history(state: tauri::State<'_, SettingsState>) -> Result<Option<Value>, String> {
    match std::fs::read_to_string(&state.chat_history_path) {
        Ok(json) => {
            info!(
                "[chat-history] loaded from {}",
                state.chat_history_path.display()
            );
            let data: Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
            Ok(Some(data))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            info!(
                "[chat-history] no file at {}",
                state.chat_history_path.display()
            );
            Ok(None)
        }
        Err(e) => {
            error!("[chat-history] read error: {e}");
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn write_chat_history(
    data: Value,
    state: tauri::State<'_, SettingsState>,
) -> Result<(), String> {
    if let Some(parent) = state.chat_history_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&state.chat_history_path, &json).map_err(|e| {
        error!("[chat-history] write error: {e}");
        e.to_string()
    })?;
    info!(
        "[chat-history] saved to {}",
        state.chat_history_path.display()
    );
    Ok(())
}
