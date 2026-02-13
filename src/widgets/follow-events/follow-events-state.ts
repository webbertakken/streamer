import { subscribe, type ChannelEvent } from "../../events/bus";

export interface FollowEntry {
  id: string;
  username: string;
  timestamp: number;
}

export const follows: FollowEntry[] = [];
export const listeners = new Set<() => void>();

export function notify() {
  listeners.forEach((fn) => fn());
}

let unsubBus: (() => void) | null = null;

export function ensureSubscribed() {
  if (!unsubBus) {
    unsubBus = subscribe((event: ChannelEvent) => {
      if (event.type !== "follow") return;
      follows.unshift({
        id: `${event.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
        username: (event.data.user_name as string) || (event.data.username as string) || "unknown",
        timestamp: event.timestamp,
      });
      if (follows.length > 200) follows.length = 200;
      notify();
    });
  }
}
