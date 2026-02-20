import { invoke } from "@tauri-apps/api/core";
import { subscribe, type ChannelEvent } from "../../events/bus";
import { log } from "../../log";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SuggestionStatus = "active" | "done";

export interface Suggestion {
  id: string;
  hexId: string;
  text: string;
  username: string;
  userId: string;
  redemptionId: string;
  rewardId: string;
  createdAt: number;
  status: SuggestionStatus;
  votes: number;
  voters: string[];
  checkedAt: number | null;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const suggestions: Suggestion[] = [];
const listeners = new Set<() => void>();
const usedHexIds = new Set<string>();

let configuredRewardId = "";
let configuredVoteTrigger = "!vote";
let configuredSuggestTrigger = "!suggest";

/** Per-user cooldown tracking for chat-based suggestions (userId -> last timestamp) */
const suggestCooldowns = new Map<string, number>();
const SUGGEST_COOLDOWN_MS = 30_000;

// ---------------------------------------------------------------------------
// Listener helpers
// ---------------------------------------------------------------------------

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeSuggestions(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function setConfig(opts: { rewardId?: string; voteTrigger?: string; suggestTrigger?: string }): void {
  if (opts.rewardId !== undefined) configuredRewardId = opts.rewardId;
  if (opts.voteTrigger !== undefined) configuredVoteTrigger = opts.voteTrigger;
  if (opts.suggestTrigger !== undefined) configuredSuggestTrigger = opts.suggestTrigger;
}

export function getConfig(): { rewardId: string; voteTrigger: string; suggestTrigger: string } {
  return { rewardId: configuredRewardId, voteTrigger: configuredVoteTrigger, suggestTrigger: configuredSuggestTrigger };
}

// ---------------------------------------------------------------------------
// Hex ID allocator
// ---------------------------------------------------------------------------

function allocateHexId(): string | null {
  // If all 256 IDs are in use, recycle from done suggestions
  if (usedHexIds.size >= 256) {
    const done = suggestions.filter((s) => s.status === "done");
    if (done.length > 0) {
      usedHexIds.delete(done[0].hexId);
    } else {
      return null;
    }
  }

  let hex: string;
  do {
    const n = Math.floor(Math.random() * 256);
    hex = n.toString(16).toUpperCase().padStart(2, "0");
  } while (usedHexIds.has(hex));

  usedHexIds.add(hex);
  return hex;
}

function freeHexId(hexId: string): void {
  usedHexIds.delete(hexId);
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

export function pushSuggestion(data: {
  text: string;
  username: string;
  userId: string;
  redemptionId: string;
  rewardId: string;
}): Suggestion | null {
  const hexId = allocateHexId();
  if (hexId === null) {
    log.warn("[suggestion-box] skipped: all 256 hex IDs in use");
    return null;
  }

  const suggestion: Suggestion = {
    id: crypto.randomUUID(),
    hexId,
    text: data.text.slice(0, 200),
    username: data.username,
    userId: data.userId,
    redemptionId: data.redemptionId,
    rewardId: data.rewardId,
    createdAt: Date.now(),
    status: "active",
    votes: 0,
    voters: [],
    checkedAt: null,
  };
  suggestions.push(suggestion);
  log.info(`[suggestion-box] pushed suggestion hexId=${suggestion.hexId} text="${suggestion.text}" total=${suggestions.length}`);
  notify();
  return suggestion;
}

export function voteSuggestion(hexId: string, userId: string): void {
  const normalised = hexId.toUpperCase().padStart(2, "0");
  const suggestion = suggestions.find(
    (s) => s.hexId === normalised && s.status === "active",
  );
  if (!suggestion) return;
  if (suggestion.voters.includes(userId)) return;

  suggestion.votes++;
  suggestion.voters.push(userId);
  notify();
}

export function toggleDone(id: string): void {
  const suggestion = suggestions.find((s) => s.id === id);
  if (!suggestion) return;

  if (suggestion.status === "done") {
    suggestion.status = "active";
    suggestion.checkedAt = null;
  } else {
    suggestion.status = "done";
    suggestion.checkedAt = Date.now();
  }
  notify();
}

export function removeSuggestion(id: string): void {
  const idx = suggestions.findIndex((s) => s.id === id);
  if (idx === -1) return;
  freeHexId(suggestions[idx].hexId);
  suggestions.splice(idx, 1);
  notify();
}

export function getSortedActive(): Suggestion[] {
  return suggestions
    .filter((s) => s.status === "active")
    .sort((a, b) => b.votes - a.votes || a.createdAt - b.createdAt);
}

export function getDoneItems(): Suggestion[] {
  return suggestions
    .filter((s) => s.status === "done")
    .sort((a, b) => (b.checkedAt ?? 0) - (a.checkedAt ?? 0));
}

export function getAllSuggestions(): Suggestion[] {
  return [...suggestions];
}

// ---------------------------------------------------------------------------
// Hydration (persistence)
// ---------------------------------------------------------------------------

export async function loadSuggestions(): Promise<void> {
  // Snapshot in-flight suggestions added before the async load resolves
  const inFlight = [...suggestions];
  const data = await invoke<Suggestion[] | null>("read_suggestions");

  suggestions.length = 0;
  usedHexIds.clear();

  if (Array.isArray(data)) {
    suggestions.push(...data);
  }

  // Merge back any suggestions added while the load was in progress
  const knownIds = new Set(suggestions.map((s) => s.id));
  for (const s of inFlight) {
    if (!knownIds.has(s.id)) {
      suggestions.push(s);
    }
  }

  for (const s of suggestions) {
    usedHexIds.add(s.hexId);
  }
  notify();
}

export async function saveSuggestions(): Promise<void> {
  await invoke("write_suggestions", { data: suggestions });
}

// ---------------------------------------------------------------------------
// Event bus subscriptions
// ---------------------------------------------------------------------------

/** Preserve subscription handles across Vite HMR to avoid duplicate handlers. */
interface HmrState {
  unsubRedemption: (() => void) | null;
  unsubChat: (() => void) | null;
}

const hmr: HmrState = (import.meta.hot?.data?.suggestionHmr as HmrState) ?? {
  unsubRedemption: null,
  unsubChat: null,
};

export function ensureSubscribed(): void {
  if (!hmr.unsubRedemption) {
    hmr.unsubRedemption = subscribe((event: ChannelEvent) => {
      if (event.type !== "channel_points_redemption") return;
      if (!configuredRewardId) return;

      const rewardId = (event.data.reward as Record<string, unknown>)?.id as string | undefined;
      if (rewardId !== configuredRewardId) return;

      const redemptionId = event.data.id as string;
      if (!redemptionId) return;

      // Deduplicate by redemptionId
      if (suggestions.some((s) => s.redemptionId === redemptionId)) return;

      pushSuggestion({
        text: (event.data.user_input as string) || "",
        username: (event.data.user_name as string) || "unknown",
        userId: (event.data.user_id as string) || "",
        redemptionId,
        rewardId: configuredRewardId,
      });
    });
  }

  if (!hmr.unsubChat) {
    hmr.unsubChat = subscribe((event: ChannelEvent) => {
      if (event.type !== "chat") return;

      const text = (event.data.text as string) || "";
      const userId = (event.data.userId as string) || "";

      if (!userId) {
        log.warn(`[suggestion-box] skipped: empty userId`);
        return;
      }

      const lower = text.toLowerCase();

      // --- Vote command: !vote <hexId> ---
      const voteTrigger = configuredVoteTrigger.toLowerCase();
      if (lower.startsWith(voteTrigger + " ")) {
        const args = text.slice(voteTrigger.length + 1).trim();
        if (args && /^[0-9a-fA-F]{1,2}$/.test(args)) {
          voteSuggestion(args, userId);
        }
        return;
      }

      // --- Suggest command (chat fallback): !suggest <text> ---
      // Only active when no reward is configured (non-affiliate fallback)
      if (configuredRewardId) return;

      const suggestTrigger = configuredSuggestTrigger.toLowerCase();
      if (!lower.startsWith(suggestTrigger + " ")) return;

      const suggestionText = text.slice(suggestTrigger.length + 1).trim();
      if (!suggestionText) {
        log.warn(`[suggestion-box] skipped: empty suggestion text`);
        return;
      }

      // Per-user cooldown to prevent spam
      const lastSuggest = suggestCooldowns.get(userId);
      if (lastSuggest !== undefined && Date.now() - lastSuggest < SUGGEST_COOLDOWN_MS) {
        log.info(`[suggestion-box] skipped: cooldown active for userId=${userId}`);
        return;
      }

      suggestCooldowns.set(userId, Date.now());

      const username = (event.data.username as string) || "unknown";

      pushSuggestion({
        text: suggestionText,
        username,
        userId,
        redemptionId: `chat-${Date.now()}-${userId}`,
        rewardId: "",
      });
    });
  }
}

export function unsubscribeAll(): void {
  if (hmr.unsubRedemption) { hmr.unsubRedemption(); hmr.unsubRedemption = null; }
  if (hmr.unsubChat) { hmr.unsubChat(); hmr.unsubChat = null; }
}

// ---------------------------------------------------------------------------
// Test helpers (reset state for tests)
// ---------------------------------------------------------------------------

export function _resetForTests(): void {
  suggestions.length = 0;
  usedHexIds.clear();
  listeners.clear();
  configuredRewardId = "";
  configuredVoteTrigger = "!vote";
  configuredSuggestTrigger = "!suggest";
  suggestCooldowns.clear();
  unsubscribeAll();
}

// ---------------------------------------------------------------------------
// HMR preservation
// ---------------------------------------------------------------------------

if (import.meta.hot?.data) {
  import.meta.hot.data.suggestionHmr = hmr;
  import.meta.hot.accept();
}
