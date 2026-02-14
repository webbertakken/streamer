export interface ChatBadge {
  setId: string;
  versionId: string;
}

export interface ChatEmote {
  id: string;
  start: number;
  end: number;
}

export interface ChatMessage {
  id: string;
  username: string;
  colour: string;
  text: string;
  badges?: ChatBadge[];
  emotes?: ChatEmote[];
  timestamp: number;
}

/** How long a message lives before being removed (ms). */
export const MESSAGE_TTL_MS = 180_000;
/** How often the expiry sweep runs (ms). */
const SWEEP_INTERVAL_MS = 5_000;
/** Duration of the fade-out at end of life (ms). */
export const FADE_DURATION_MS = 5_000;

/** Temporary in-memory store until Twitch IRC is connected */
export const messages: ChatMessage[] = [];
export const listeners = new Set<() => void>();

export function pushChatMessage(msg: ChatMessage) {
  messages.push(msg);
  if (messages.length > 200) messages.splice(0, messages.length - 200);
  listeners.forEach((fn) => fn());
}

export function getChatMessages(): ChatMessage[] {
  return messages;
}

export function loadChatMessages(saved: ChatMessage[]): void {
  messages.length = 0;
  messages.push(...saved);
  listeners.forEach((fn) => fn());
}

/** Subscribe to message changes. Returns an unsubscribe function. */
export function subscribeChatMessages(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Remove messages that have exceeded the TTL. */
function expireMessages(): void {
  const cutoff = Date.now() - MESSAGE_TTL_MS;
  let removed = 0;
  while (messages.length > 0 && messages[0].timestamp < cutoff) {
    messages.shift();
    removed++;
  }
  if (removed > 0) listeners.forEach((fn) => fn());
}

let sweepInterval: ReturnType<typeof setInterval> | null = null;

/** Start the periodic message expiry sweep. */
export function startMessageExpiry(): void {
  if (sweepInterval) return;
  sweepInterval = setInterval(expireMessages, SWEEP_INTERVAL_MS);
}

/** Stop the periodic message expiry sweep. */
export function stopMessageExpiry(): void {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
}

/** Compute opacity for a message based on its remaining lifetime (0–1). */
export function messageOpacity(timestamp: number, now: number): number {
  const remaining = MESSAGE_TTL_MS - (now - timestamp);
  if (remaining <= 0) return 0;
  if (remaining >= FADE_DURATION_MS) return 1;
  return remaining / FADE_DURATION_MS;
}
