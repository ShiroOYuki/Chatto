import type { BuiltinSoundId, SoundSetting } from '@chatto/core';

/**
 * Alert sounds. Built-in sounds are synthesized with Web Audio, so Chatto
 * ships no audio files (and no third-party licences); user files are fetched
 * from the local server. Browser-only: callers run in the control panel or a viewer.
 */

export const SOUND_LABELS: Record<BuiltinSoundId, string> = {
  teacup: '茶杯輕敲',
  chime: '和弦',
  bubble: '泡泡',
  bell: '鈴聲',
};

interface Tone {
  /** Hz at the start, and optionally at the end of the tone. */
  from: number;
  to?: number;
  type: OscillatorType;
  /** Seconds after the sound starts. */
  at: number;
  /** Seconds until the tone fades out. */
  decay: number;
  /** Relative loudness, 0–1. */
  level: number;
}

const BUILTIN: Record<BuiltinSoundId, Tone[]> = {
  // Porcelain: two bright, quickly fading pings.
  teacup: [
    { from: 2093, type: 'sine', at: 0, decay: 0.35, level: 0.6 },
    { from: 3136, type: 'sine', at: 0, decay: 0.2, level: 0.25 },
    { from: 2349, type: 'sine', at: 0.12, decay: 0.3, level: 0.45 },
  ],
  // Rising major arpeggio.
  chime: [
    { from: 1047, type: 'triangle', at: 0, decay: 0.5, level: 0.5 },
    { from: 1319, type: 'triangle', at: 0.09, decay: 0.5, level: 0.45 },
    { from: 1568, type: 'triangle', at: 0.18, decay: 0.7, level: 0.45 },
  ],
  // A quick upward pop.
  bubble: [{ from: 380, to: 980, type: 'sine', at: 0, decay: 0.16, level: 0.7 }],
  // Bell with an overtone and a long tail.
  bell: [
    { from: 880, type: 'sine', at: 0, decay: 1.2, level: 0.55 },
    { from: 1760, type: 'sine', at: 0, decay: 0.6, level: 0.2 },
    { from: 2640, type: 'sine', at: 0, decay: 0.3, level: 0.1 },
  ],
};

let context: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function playTones(ctx: AudioContext, tones: Tone[], volume: number): void {
  const start = ctx.currentTime + 0.01;
  for (const tone of tones) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = start + tone.at;
    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.from, t);
    if (tone.to) oscillator.frequency.exponentialRampToValueAtTime(tone.to, t + tone.decay);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, tone.level * volume), t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + tone.decay);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(t);
    oscillator.stop(t + tone.decay + 0.05);
  }
}

async function playFile(ctx: AudioContext, url: string, volume: number): Promise<void> {
  let buffer = buffers.get(url);
  if (!buffer) {
    buffer = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Sound ${url}: HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data));
    buffers.set(url, buffer);
    buffer.catch(() => buffers.delete(url));
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = await buffer;
  gain.gain.value = volume;
  source.connect(gain).connect(ctx.destination);
  source.start();
}

/**
 * Plays an alert sound. `fileUrl` turns a user sound id into a URL on the
 * local server. Resolves once playback has started; failures reject so the
 * caller can log them.
 */
export async function playSound(setting: SoundSetting | undefined, fileUrl: (id: string) => string): Promise<void> {
  if (!setting?.enabled || setting.volume <= 0) return;
  const ctx = audio();
  if (!ctx) return;
  const volume = Math.min(1, setting.volume);
  if (setting.sound.kind === 'builtin') playTones(ctx, BUILTIN[setting.sound.id], volume);
  else await playFile(ctx, fileUrl(setting.sound.id), volume);
}
