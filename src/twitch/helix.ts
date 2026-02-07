import { invoke } from "@tauri-apps/api/core";
import { publish } from "../events/bus";

let pollTimer: ReturnType<typeof setInterval> | null = null;

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
  pollTimer = setInterval(poll, 60_000);
}

/** Stop polling follower count. */
export function stopFollowerPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
