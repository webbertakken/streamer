import { invoke } from "@tauri-apps/api/core";

/** Maps "setId/versionId" to the 18x18 badge image URL. */
const badgeCache = new Map<string, string>();
let fetched = false;

interface BadgeVersion {
  id: string;
  image_url_1x: string;
}

interface BadgeSet {
  set_id: string;
  versions: BadgeVersion[];
}

interface BadgesResponse {
  data: BadgeSet[];
}

/** Index badge sets into the cache map. */
function indexBadges(sets: BadgeSet[]): void {
  for (const set of sets) {
    for (const ver of set.versions) {
      badgeCache.set(`${set.set_id}/${ver.id}`, ver.image_url_1x);
    }
  }
}

/** Fetch global and channel badges from the Helix API. Call once after auth. */
export async function fetchBadges(broadcasterId: string): Promise<void> {
  if (fetched) return;
  fetched = true;

  try {
    const [globalRaw, channelRaw] = await Promise.all([
      invoke<string>("helix_get", { path: "/chat/badges/global" }),
      invoke<string>("helix_get", { path: `/chat/badges?broadcaster_id=${broadcasterId}` }),
    ]);

    const globalResp: BadgesResponse = JSON.parse(globalRaw);
    const channelResp: BadgesResponse = JSON.parse(channelRaw);

    // Global first, then channel overrides
    indexBadges(globalResp.data);
    indexBadges(channelResp.data);
  } catch (e) {
    console.error("Failed to fetch badge data:", e);
    fetched = false; // allow retry on failure
  }
}

/** Look up a badge image URL from the cache. */
export function getBadgeUrl(setId: string, versionId: string): string | undefined {
  return badgeCache.get(`${setId}/${versionId}`);
}

/** Clear the badge cache (e.g. on logout). */
export function clearBadgeCache(): void {
  badgeCache.clear();
  fetched = false;
}
