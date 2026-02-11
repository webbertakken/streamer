use std::path::PathBuf;
use tracing::info;

/// Metadata about a saved preset file.
#[derive(serde::Serialize)]
pub struct PresetInfo {
    name: String,
    path: String,
}

/// Resolve the presets directory under the app config folder.
fn presets_dir() -> Result<PathBuf, String> {
    Ok(dirs::home_dir()
        .ok_or("Could not determine home directory")?
        .join(".config")
        .join("streamer")
        .join("presets"))
}

/// List all preset files in the presets directory.
#[tauri::command]
pub fn list_presets() -> Result<Vec<PresetInfo>, String> {
    let presets_dir = presets_dir()?;
    std::fs::create_dir_all(&presets_dir).map_err(|e| e.to_string())?;

    let mut presets = Vec::new();
    let entries = std::fs::read_dir(&presets_dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json") {
            let name = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();
            presets.push(PresetInfo {
                name,
                path: path.to_string_lossy().to_string(),
            });
        }
    }
    Ok(presets)
}

/// Save preset data to a named file.
#[tauri::command]
pub fn save_preset(name: String, data: String) -> Result<(), String> {
    let presets_dir = presets_dir()?;
    std::fs::create_dir_all(&presets_dir).map_err(|e| e.to_string())?;
    let slug = name.to_lowercase().replace(' ', "-");
    let path = presets_dir.join(format!("{slug}.json"));
    std::fs::write(&path, data).map_err(|e| e.to_string())?;
    info!("Saved preset: {}", path.display());
    Ok(())
}

/// Load a preset by name.
#[tauri::command]
pub fn load_preset(name: String) -> Result<String, String> {
    let path = presets_dir()?.join(format!("{name}.json"));
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Delete a preset by name.
#[tauri::command]
pub fn delete_preset(name: String) -> Result<(), String> {
    let path = presets_dir()?.join(format!("{name}.json"));
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        info!("Deleted preset: {}", path.display());
    }
    Ok(())
}

/// Export preset data to a user-chosen file path.
#[tauri::command]
pub fn export_preset(path: String, data: String) -> Result<(), String> {
    std::fs::write(&path, &data).map_err(|e| e.to_string())?;
    info!("Exported preset to: {path}");
    Ok(())
}

/// Import a preset from an arbitrary file path into the presets directory.
/// Returns the slug name of the imported preset.
#[tauri::command]
pub fn import_preset(path: String) -> Result<String, String> {
    let contents = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;

    // Validate that the JSON is parseable and contains an instances array
    let parsed: serde_json::Value =
        serde_json::from_str(&contents).map_err(|e| format!("Invalid JSON: {e}"))?;
    if !parsed.get("instances").is_some_and(|v| v.is_array()) {
        return Err("Preset file must contain an \"instances\" array".into());
    }

    // Derive a name from the file stem
    let file_path = std::path::Path::new(&path);
    let name = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("imported")
        .to_string();

    let slug = name.to_lowercase().replace(' ', "-");
    let presets_dir = presets_dir()?;
    std::fs::create_dir_all(&presets_dir).map_err(|e| e.to_string())?;
    let dest = presets_dir.join(format!("{slug}.json"));
    std::fs::write(&dest, &contents).map_err(|e| e.to_string())?;
    info!("Imported preset '{}' to: {}", slug, dest.display());
    Ok(slug)
}
