import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

/** Monitor info as returned by the Rust `list_monitors` command. */
export interface MonitorInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Track which overlay windows we have opened, keyed by monitor id. */
const openWindows = new Map<string, WebviewWindow>();

/**
 * Open an overlay window positioned on the given monitor.
 * The window loads the same front-end with a `?monitor=true` query param
 * so the app can detect it is a secondary (display-only) window.
 */
export async function openMonitorWindow(monitor: MonitorInfo): Promise<void> {
  if (openWindows.has(monitor.id)) return;

  const label = `overlay-${monitor.id}`;
  const webview = new WebviewWindow(label, {
    url: `index.html?monitor=true&monitorId=${monitor.id}`,
    x: monitor.x,
    y: monitor.y,
    width: monitor.width,
    height: monitor.height,
    decorations: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
  });

  openWindows.set(monitor.id, webview);

  webview.once("tauri://error", () => {
    openWindows.delete(monitor.id);
  });
}

/** Close the overlay window for a specific monitor. */
export async function closeMonitorWindow(monitorId: string): Promise<void> {
  const webview = openWindows.get(monitorId);
  if (!webview) return;
  try {
    await webview.close();
  } catch {
    // Window may already be closed
  }
  openWindows.delete(monitorId);
}

/** Close all secondary overlay windows. */
export async function closeAllMonitorWindows(): Promise<void> {
  const ids = [...openWindows.keys()];
  await Promise.all(ids.map((id) => closeMonitorWindow(id)));
}

/** Return the set of currently open monitor window ids. */
export function getOpenMonitorIds(): string[] {
  return [...openWindows.keys()];
}

/**
 * Reconcile open windows with the desired set of monitor ids.
 * Opens missing windows, closes removed ones.
 * Also handles monitor disconnect: if a selected monitor is no longer
 * in the available list, it is removed from the selection.
 *
 * @returns The (potentially pruned) list of selected monitor ids.
 */
export async function syncMonitorWindows(
  selectedIds: string[],
  availableMonitors: MonitorInfo[],
): Promise<string[]> {
  const availableIds = new Set(availableMonitors.map((m) => m.id));

  // Prune selections for disconnected monitors
  const validIds = selectedIds.filter((id) => availableIds.has(id));

  const desired = new Set(validIds);
  const current = new Set(openWindows.keys());

  // Close windows that are no longer selected
  const toClose = [...current].filter((id) => !desired.has(id));
  await Promise.all(toClose.map((id) => closeMonitorWindow(id)));

  // Open windows for newly selected monitors
  const toOpen = validIds.filter((id) => !current.has(id));
  for (const id of toOpen) {
    const monitor = availableMonitors.find((m) => m.id === id);
    if (monitor) await openMonitorWindow(monitor);
  }

  return validIds;
}
