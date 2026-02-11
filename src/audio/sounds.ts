/** Sound mapping configuration — maps event types to bundled or custom sounds. */

import type { ChannelEventType } from "../events/bus";

export interface SoundMapping {
  enabled: boolean;
  /** A built-in sound key (e.g. "chime") or an absolute file path for custom sounds. */
  sound: string;
}

/** Default sound mappings for notable channel events. */
export const DEFAULT_SOUND_MAPPINGS: Record<string, SoundMapping> = {
  follow: { enabled: true, sound: "chime" },
  raid: { enabled: true, sound: "fanfare" },
  subscribe: { enabled: true, sound: "ding" },
  gift_sub: { enabled: true, sound: "fanfare" },
} satisfies Partial<Record<ChannelEventType, SoundMapping>>;
