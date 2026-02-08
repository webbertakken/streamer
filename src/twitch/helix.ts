import { invoke } from "@tauri-apps/api/core";
import { publish } from "../events/bus";

/**
 * Helix polling interval in ms. 10s is well within the 800 req/min budget
 * even with multiple endpoints and a couple of app restarts overlapping.
 */
const POLL_INTERVAL = 10_000;

let followerPollTimer: ReturnType<typeof setInterval> | null = null;
let viewerPollTimer: ReturnType<typeof setInterval> | null = null;

interface FollowersResponse {
  total: number;
}

/** Fetch the total follower count for a broadcaster. */
export async function fetchFollowerCount(broadcasterId: string): Promise<number> {
  const raw: string = await invoke("helix_get", {
    path: `/channels/followers?broadcaster_id=${broadcasterId}&first=1`,
  });
  const data: FollowersResponse = JSON.parse(raw);
  return data.total;
}

/** Start polling follower count every 60 seconds. Publishes events to the bus. */
export function startFollowerPolling(broadcasterId: string): void {
  stopFollowerPolling();

  const poll = async () => {
    try {
      const total = await fetchFollowerCount(broadcasterId);
      publish({
        type: "follower_count_update",
        timestamp: Date.now(),
        data: { total },
      });
    } catch (e) {
      console.error("Follower count poll failed:", e);
    }
  };

  poll().catch(console.error);
  followerPollTimer = setInterval(poll, POLL_INTERVAL);
}

/** Stop polling follower count. */
export function stopFollowerPolling(): void {
  if (followerPollTimer) {
    clearInterval(followerPollTimer);
    followerPollTimer = null;
  }
}

interface StreamsResponse {
  data: Array<{ viewer_count: number }>;
}

/** Fetch the current viewer count for a broadcaster. Returns 0 if offline. */
export async function fetchViewerCount(broadcasterId: string): Promise<number> {
  const raw: string = await invoke("helix_get", {
    path: `/streams?user_id=${broadcasterId}`,
  });
  const resp: StreamsResponse = JSON.parse(raw);
  return resp.data?.[0]?.viewer_count ?? 0;
}

/** Start polling viewer count every 60 seconds. Publishes events to the bus. */
export function startViewerPolling(broadcasterId: string): void {
  stopViewerPolling();

  const poll = async () => {
    try {
      const count = await fetchViewerCount(broadcasterId);
      publish({
        type: "viewer_count_update",
        timestamp: Date.now(),
        data: { count },
      });
    } catch (e) {
      console.error("Viewer count poll failed:", e);
    }
  };

  poll().catch(console.error);
  viewerPollTimer = setInterval(poll, POLL_INTERVAL);
}

/** Stop polling viewer count. */
export function stopViewerPolling(): void {
  if (viewerPollTimer) {
    clearInterval(viewerPollTimer);
    viewerPollTimer = null;
  }
}
