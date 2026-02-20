import { invoke } from "@tauri-apps/api/core";

/** Write a log message to the application log file via Rust tracing. */
function logToFile(level: string, message: string): void {
  try {
    invoke("log_frontend", { level, message }).catch(() => {});
  } catch {
    // Silently ignore — log infrastructure should never crash the app
  }
}

export const log = {
  info: (message: string) => logToFile("info", message),
  warn: (message: string) => logToFile("warn", message),
  error: (message: string) => logToFile("error", message),
  debug: (message: string) => logToFile("debug", message),
};
