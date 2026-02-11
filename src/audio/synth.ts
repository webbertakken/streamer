/** Built-in sound profiles generated via the Web Audio API. */

export type BuiltinSound = "chime" | "ding" | "fanfare" | "alert";

export const BUILTIN_SOUNDS: readonly BuiltinSound[] = ["chime", "ding", "fanfare", "alert"] as const;

/** Human-readable labels for built-in sounds. */
export const BUILTIN_SOUND_LABELS: Record<BuiltinSound, string> = {
  chime: "Chime",
  ding: "Ding",
  fanfare: "Fanfare",
  alert: "Alert",
};

interface ToneStep {
  frequency: number;
  /** Duration in seconds. */
  duration: number;
  /** Start offset in seconds from the beginning of the sequence. */
  offset: number;
  /** Oscillator wave type. */
  type: OscillatorType;
}

const SOUND_PROFILES: Record<BuiltinSound, ToneStep[]> = {
  chime: [
    { frequency: 587, duration: 0.15, offset: 0, type: "sine" },
    { frequency: 880, duration: 0.2, offset: 0.15, type: "sine" },
  ],
  ding: [
    { frequency: 1200, duration: 0.25, offset: 0, type: "sine" },
  ],
  fanfare: [
    { frequency: 523, duration: 0.12, offset: 0, type: "triangle" },
    { frequency: 659, duration: 0.12, offset: 0.12, type: "triangle" },
    { frequency: 784, duration: 0.12, offset: 0.24, type: "triangle" },
    { frequency: 1047, duration: 0.25, offset: 0.36, type: "triangle" },
  ],
  alert: [
    { frequency: 800, duration: 0.1, offset: 0, type: "square" },
    { frequency: 800, duration: 0.1, offset: 0.15, type: "square" },
  ],
};

let audioCtx: AudioContext | null = null;

/** Lazily create or resume the shared AudioContext. */
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(console.error);
  }
  return audioCtx;
}

/**
 * Play a built-in synthesised sound at the given volume.
 * @param name - One of the built-in sound profile names.
 * @param volume - Volume from 0 to 100.
 */
export function playSynth(name: BuiltinSound, volume: number): void {
  const steps = SOUND_PROFILES[name];
  if (!steps) return;

  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.gain.value = Math.max(0, Math.min(1, volume / 100));
  gain.connect(ctx.destination);

  for (const step of steps) {
    const osc = ctx.createOscillator();
    osc.type = step.type;
    osc.frequency.value = step.frequency;

    // Envelope to avoid clicks
    const envelope = ctx.createGain();
    const start = ctx.currentTime + step.offset;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(1, start + 0.01);
    envelope.gain.setValueAtTime(1, start + step.duration - 0.02);
    envelope.gain.linearRampToValueAtTime(0, start + step.duration);

    osc.connect(envelope);
    envelope.connect(gain);
    osc.start(start);
    osc.stop(start + step.duration);
  }
}
