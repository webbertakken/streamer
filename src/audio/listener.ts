/** Event bus subscriber that triggers sound playback for configured event types. */

import { subscribe } from "../events/bus";
import { useOverlayStore } from "../stores/overlay";
import { playSound } from "./player";

/**
 * Initialise the sound alert listener. Subscribes to the event bus and plays
 * the configured sound when a matching event fires.
 * @returns An unsubscribe function.
 */
export function initSoundAlerts(): () => void {
  return subscribe((event) => {
    const { soundEnabled, soundVolume, soundMappings } = useOverlayStore.getState();
    if (!soundEnabled) return;

    const mapping = soundMappings[event.type];
    if (!mapping?.enabled || !mapping.sound) return;

    playSound(mapping.sound, soundVolume);
  });
}
