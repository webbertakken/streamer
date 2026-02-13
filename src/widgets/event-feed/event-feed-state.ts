export type EventType = "follow" | "sub" | "gift-sub" | "raid" | "bits";

export interface StreamEvent {
  id: string;
  type: EventType;
  username: string;
  detail?: string;
  timestamp: number;
}

export const events: StreamEvent[] = [];
export const listeners = new Set<() => void>();

/** Push a stream event to the feed */
export function pushStreamEvent(event: Omit<StreamEvent, "id" | "timestamp">) {
  events.push({ ...event, id: crypto.randomUUID(), timestamp: Date.now() });
  if (events.length > 100) events.splice(0, events.length - 100);
  listeners.forEach((fn) => fn());
}
