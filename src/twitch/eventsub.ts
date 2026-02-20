import { invoke } from "@tauri-apps/api/core";
import { publish } from "../events/bus";
import type { ChannelEventType } from "../events/bus";
import { useTwitchStore } from "../stores/twitch";

const EVENTSUB_URL = "wss://eventsub.wss.twitch.tv/ws";
const KEEPALIVE_BUFFER_MS = 5_000;

let ws: WebSocket | null = null;
let keepaliveTimer: ReturnType<typeof setTimeout> | null = null;
let keepaliveTimeoutMs = 10_000;
let suppressReconnect = false;
let broadcasterId = "";

interface EventSubSubscription {
  type: string;
  version: string;
  condition: Record<string, string>;
}

function getSubscriptions(): EventSubSubscription[] {
  return [
    { type: "channel.follow", version: "2", condition: { broadcaster_user_id: broadcasterId, moderator_user_id: broadcasterId } },
    { type: "channel.raid", version: "1", condition: { to_broadcaster_user_id: broadcasterId } },
    { type: "channel.update", version: "2", condition: { broadcaster_user_id: broadcasterId } },
    { type: "stream.online", version: "1", condition: { broadcaster_user_id: broadcasterId } },
    { type: "stream.offline", version: "1", condition: { broadcaster_user_id: broadcasterId } },
    { type: "channel.subscribe", version: "1", condition: { broadcaster_user_id: broadcasterId } },
    { type: "channel.subscription.gift", version: "1", condition: { broadcaster_user_id: broadcasterId } },
    { type: "channel.subscription.message", version: "1", condition: { broadcaster_user_id: broadcasterId } },
    { type: "channel.ban", version: "1", condition: { broadcaster_user_id: broadcasterId } },
    { type: "channel.unban", version: "1", condition: { broadcaster_user_id: broadcasterId } },
    { type: "channel.cheer", version: "1", condition: { broadcaster_user_id: broadcasterId } },
    { type: "channel.channel_points_custom_reward_redemption.add", version: "1", condition: { broadcaster_user_id: broadcasterId } },
  ];
}

function mapEventType(twitchType: string): ChannelEventType | null {
  const mapping: Record<string, ChannelEventType> = {
    "channel.follow": "follow",
    "channel.raid": "raid",
    "channel.update": "channel_update",
    "stream.online": "stream_online",
    "stream.offline": "stream_offline",
    "channel.subscribe": "subscribe",
    "channel.subscription.gift": "gift_sub",
    "channel.subscription.message": "subscribe",
    "channel.ban": "ban",
    "channel.unban": "unban",
    "channel.cheer": "cheer",
    "channel.channel_points_custom_reward_redemption.add": "channel_points_redemption",
  };
  return mapping[twitchType] ?? null;
}

function resetKeepalive() {
  if (keepaliveTimer) clearTimeout(keepaliveTimer);
  keepaliveTimer = setTimeout(() => {
    // No message received in time — reconnect
    ws?.close();
  }, keepaliveTimeoutMs + KEEPALIVE_BUFFER_MS);
}

function handleMessage(event: MessageEvent<string>) {
  const msg = JSON.parse(event.data);
  const messageType: string = msg.metadata?.message_type;

  resetKeepalive();

  if (messageType === "session_welcome") {
    const sessionId: string = msg.payload.session.id;
    const serverTimeout: number | undefined = msg.payload.session.keepalive_timeout_seconds;
    if (serverTimeout) keepaliveTimeoutMs = serverTimeout * 1000;

    useTwitchStore.getState().setEventSubConnected(true);

    // Subscribe to all events in parallel
    const subs = getSubscriptions();
    Promise.all(
      subs.map((sub) =>
        invoke("eventsub_subscribe", {
          request: {
            session_id: sessionId,
            event_type: sub.type,
            version: sub.version,
            condition: sub.condition,
          },
        }).catch((e: unknown) => console.error(`EventSub subscribe failed for ${sub.type}:`, e)),
      ),
    ).catch(console.error);
    return;
  }

  if (messageType === "session_reconnect") {
    const newUrl: string = msg.payload.session.reconnect_url;
    // Connect to new URL, then close old
    const oldWs = ws;
    connectToUrl(newUrl);
    setTimeout(() => oldWs?.close(), 30_000);
    return;
  }

  if (messageType === "notification") {
    const subType: string = msg.payload.subscription?.type;
    const eventType = mapEventType(subType);
    if (eventType) {
      publish({
        type: eventType,
        timestamp: Date.now(),
        data: msg.payload.event ?? {},
      });
    }
  }

  // keepalive messages have no payload — just reset the timer (already done above)
}

function connectToUrl(url: string) {
  const socket = new WebSocket(url);
  ws = socket;

  socket.addEventListener("message", handleMessage);

  socket.addEventListener("close", () => {
    useTwitchStore.getState().setEventSubConnected(false);
    if (keepaliveTimer) clearTimeout(keepaliveTimer);
    if (!suppressReconnect && broadcasterId) {
      // Reconnect after a short delay
      setTimeout(() => connectToUrl(EVENTSUB_URL), 3000);
    }
  });

  socket.addEventListener("error", () => socket.close());
}

/** Connect EventSub and subscribe to channel events. */
export function connectEventSub(userId: string): void {
  disconnectEventSub();
  broadcasterId = userId;
  suppressReconnect = false;
  connectToUrl(EVENTSUB_URL);
}

/** Disconnect EventSub and suppress reconnection. */
export function disconnectEventSub(): void {
  suppressReconnect = true;
  broadcasterId = "";
  if (keepaliveTimer) {
    clearTimeout(keepaliveTimer);
    keepaliveTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}
