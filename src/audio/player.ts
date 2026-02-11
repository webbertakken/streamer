/**
 * Sound playback — routes to Web Audio API synth for built-in sounds
 * or HTMLAudioElement for custom sound files.
 */

import { BUILTIN_SOUNDS, playSynth, type BuiltinSound } from "./synth";

const builtinSet = new Set<string>(BUILTIN_SOUNDS);

/**
 * Play a sound by key. If the key matches a built-in sound it is synthesised
 * via the Web Audio API; otherwise it is treated as a URL (e.g. from
 * `convertFileSrc`) and played through an HTMLAudioElement.
 * @param sound - Built-in sound name or a playable URL.
 * @param volume - Volume from 0 to 100.
 */
export function playSound(sound: string, volume: number): void {
  if (builtinSet.has(sound)) {
    playSynth(sound as BuiltinSound, volume);
    return;
  }

  // Custom file — use HTMLAudioElement
  const audio = new Audio(sound);
  audio.volume = Math.max(0, Math.min(1, volume / 100));
  audio.play().catch(console.error);
}
