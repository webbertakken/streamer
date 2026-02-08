/** Channel event types emitted by all event sources. */
export type ChannelEventType =
  | "chat"
  | "join"
  | "part"
  | "follow"
  | "raid"
  | "subscribe"
  | "gift_sub"
  | "cheer"
  | "ban"
  | "unban"
  | "stream_online"
  | "stream_offline"
  | "channel_update"
  | "follower_count_update"
  | "viewer_count_update";

export interface ChannelEvent {
  type: ChannelEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

type Subscriber = (event: ChannelEvent) => void;

const subscribers = new Set<Subscriber>();

/** Publish an event to all subscribers. */
export function publish(event: ChannelEvent): void {
  for (const fn of subscribers) {
    fn(event);
  }
}

/** Subscribe to all events. Returns an unsubscribe function. */
export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
