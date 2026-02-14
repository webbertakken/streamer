import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useOverlayStore, type WidgetInstance } from "../stores/overlay";

/** Shape of the state broadcast to secondary windows. */
interface OverlaySyncPayload {
  instances: WidgetInstance[];
  overlayVisible: boolean;
  editMode: boolean;
  twitchColours: boolean;
  presenceThreshold: number;
  textBgOpacity: number;
}

const SYNC_EVENT = "overlay-state-sync";

/**
 * Gather the current overlay state into a sync payload.
 * Only includes fields that secondary windows need for rendering.
 */
function gatherSyncState(): OverlaySyncPayload {
  const s = useOverlayStore.getState();
  return {
    instances: s.instances,
    overlayVisible: s.overlayVisible,
    editMode: s.editMode,
    twitchColours: s.twitchColours,
    presenceThreshold: s.presenceThreshold,
    textBgOpacity: s.textBgOpacity,
  };
}

let unsubscribeStore: (() => void) | null = null;

/**
 * Start broadcasting overlay state changes to all secondary windows.
 * Should only be called from the primary window.
 */
export function startBroadcasting(): void {
  if (unsubscribeStore) return;

  unsubscribeStore = useOverlayStore.subscribe(() => {
    emit(SYNC_EVENT, gatherSyncState()).catch(console.error);
  });

  // Send an initial sync so newly opened windows get current state
  emit(SYNC_EVENT, gatherSyncState()).catch(console.error);
}

/** Stop broadcasting state changes. */
export function stopBroadcasting(): void {
  unsubscribeStore?.();
  unsubscribeStore = null;
}

let unlistenFn: UnlistenFn | null = null;

/**
 * Start listening for state sync events from the primary window.
 * Should only be called from secondary (monitor) windows.
 * Incoming state is applied directly to the local Zustand store.
 */
export async function startListening(): Promise<void> {
  if (unlistenFn) return;

  unlistenFn = await listen<OverlaySyncPayload>(SYNC_EVENT, (event) => {
    useOverlayStore.setState({
      instances: event.payload.instances,
      overlayVisible: event.payload.overlayVisible,
      editMode: event.payload.editMode,
      twitchColours: event.payload.twitchColours,
      presenceThreshold: event.payload.presenceThreshold,
      textBgOpacity: event.payload.textBgOpacity,
    });
  });
}

/** Stop listening for state sync events. */
export function stopListening(): void {
  unlistenFn?.();
  unlistenFn = null;
}
