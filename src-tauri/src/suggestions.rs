use serde_json::Value;
use std::path::PathBuf;
use tracing::{error, info};

/// Shared suggestions state managed by Tauri.
pub struct SuggestionsState {
    path: PathBuf,
}

impl SuggestionsState {
    pub fn new(data_dir: PathBuf) -> Self {
        Self {
            path: data_dir.join("suggestions.json"),
        }
    }
}

#[tauri::command]
pub fn read_suggestions(
    state: tauri::State<'_, SuggestionsState>,
) -> Result<Option<Value>, String> {
    match std::fs::read_to_string(&state.path) {
        Ok(json) => {
            info!("[suggestions] loaded from {}", state.path.display());
            let data: Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
            Ok(Some(data))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            info!("[suggestions] no file at {}", state.path.display());
            Ok(None)
        }
        Err(e) => {
            error!("[suggestions] read error: {e}");
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn write_suggestions(
    data: Value,
    state: tauri::State<'_, SuggestionsState>,
) -> Result<(), String> {
    if let Some(parent) = state.path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&state.path, &json).map_err(|e| {
        error!("[suggestions] write error: {e}");
        e.to_string()
    })?;
    info!("[suggestions] saved to {}", state.path.display());
    Ok(())
}
