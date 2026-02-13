import { subscribe, type ChannelEvent } from "../../events/bus";

const MAX_EVENTS = 500;

export interface LogEntry {
  id: string;
  event: ChannelEvent;
}

export const entries: LogEntry[] = [];
export const listeners = new Set<() => void>();

export function notify() {
  listeners.forEach((fn) => fn());
}

let unsubBus: (() => void) | null = null;

export function ensureSubscribed() {
  if (!unsubBus) {
    unsubBus = subscribe((event: ChannelEvent) => {
      entries.push({
        id: `${event.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
        event,
      });
      if (entries.length > MAX_EVENTS) entries.splice(0, entries.length - MAX_EVENTS);
      notify();
    });
  }
}
