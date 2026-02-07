use chrono::Local;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

/// Managed state for the event log writer.
pub struct EventLogState {
    inner: Mutex<LogWriter>,
}

struct LogWriter {
    current_date: String,
    current_channel: String,
    log_dir: PathBuf,
    buffer: Vec<String>,
}

impl EventLogState {
    pub fn new(log_dir: PathBuf) -> Self {
        Self {
            inner: Mutex::new(LogWriter {
                current_date: String::new(),
                current_channel: String::new(),
                log_dir,
                buffer: Vec::new(),
            }),
        }
    }

    fn flush_inner(writer: &mut LogWriter) -> Result<(), String> {
        if writer.buffer.is_empty() || writer.current_channel.is_empty() {
            return Ok(());
        }

        fs::create_dir_all(&writer.log_dir).map_err(|e| e.to_string())?;

        let filename = format!("{}-{}.jsonl", writer.current_channel, writer.current_date);
        let path = writer.log_dir.join(filename);

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .map_err(|e| e.to_string())?;

        for line in writer.buffer.drain(..) {
            writeln!(file, "{line}").map_err(|e| e.to_string())?;
        }

        file.flush().map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
pub fn append_event_log(
    channel: String,
    event: String,
    state: tauri::State<'_, EventLogState>,
) -> Result<(), String> {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let mut writer = state.inner.lock().map_err(|e| e.to_string())?;

    // Detect date or channel change — flush and rotate
    if writer.current_date != today || writer.current_channel != channel {
        EventLogState::flush_inner(&mut writer)?;
        writer.current_date = today;
        writer.current_channel = channel;
    }

    writer.buffer.push(event);

    // Flush every 20 events to balance I/O and data safety
    if writer.buffer.len() >= 20 {
        EventLogState::flush_inner(&mut writer)?;
    }

    Ok(())
}

#[tauri::command]
pub fn flush_event_log(state: tauri::State<'_, EventLogState>) -> Result<(), String> {
    let mut writer = state.inner.lock().map_err(|e| e.to_string())?;
    EventLogState::flush_inner(&mut writer)
}
