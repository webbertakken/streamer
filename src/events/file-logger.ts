import { invoke } from "@tauri-apps/api/core";
import { subscribe, type ChannelEvent } from "./bus";
import { useTwitchStore } from "../stores/twitch";
import { useOverlayStore } from "../stores/overlay";

let unsubscribe: (() => void) | null = null;

function handleEvent(event: ChannelEvent) {
  const { fileLogging } = useOverlayStore.getState();
  if (!fileLogging) return;

  const { channel } = useTwitchStore.getState();
  if (!channel) return;

  const line = JSON.stringify(event);
  invoke("append_event_log", { channel, event: line }).catch(console.error);
}

/** Start forwarding bus events to the Rust file logger. */
export function startFileLogger(): void {
  stopFileLogger();
  unsubscribe = subscribe(handleEvent);
}

/** Stop forwarding events to the file logger. */
export function stopFileLogger(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
