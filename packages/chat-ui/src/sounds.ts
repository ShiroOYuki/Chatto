import { normalizeSound, type BuiltinSoundId, type SoundSetting } from '@chatto/core';
import type { SoundAsset } from './soundcn/types';

/**
 * Alert sounds. Built-in sounds are CC0 sounds vendored from soundcn
 * (`./soundcn/`), each imported on demand so pages that never play a sound
 * (the OBS embed) do not carry them. Their data URIs are decoded directly,
 * so no fetch (and no CSP change) is needed. User files are fetched from the
 * local server. Browser-only: callers run in the control panel or a viewer.
 */

/** Which soundcn sound each built-in id plays. */
export const BUILTIN_SOUND_ASSETS: Record<BuiltinSoundId, () => Promise<SoundAsset>> = {
  bubble: () => import('./soundcn/notification-pop').then((m) => m.notificationPopSound),
  coin: () => import('./soundcn/coin-collect').then((m) => m.coinCollectSound),
  bell: () => import('./soundcn/select-005').then((m) => m.select005Sound),
  laser: () => import('./soundcn/error-buzz').then((m) => m.errorBuzzSound),
};

let context: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** Bytes of a base64 data URI. */
export function dataUriBytes(dataUri: string): ArrayBuffer {
  const binary = atob(dataUri.slice(dataUri.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Decodes once per key and caches the buffer; a failed load is retried next time. */
function buffer(key: string, load: () => Promise<ArrayBuffer>, ctx: AudioContext): Promise<AudioBuffer> {
  let pending = buffers.get(key);
  if (!pending) {
    pending = load().then((data) => ctx.decodeAudioData(data));
    buffers.set(key, pending);
    pending.catch(() => buffers.delete(key));
  }
  return pending;
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sound ${url}: HTTP ${response.status}`);
  return response.arrayBuffer();
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
  // Settings from an older version may name a sound that no longer exists.
  const { sound } = normalizeSound(setting, 'bubble');
  const decoded =
    sound.kind === 'builtin'
      ? await buffer(
          `builtin:${sound.id}`,
          async () => dataUriBytes((await BUILTIN_SOUND_ASSETS[sound.id]()).dataUri),
          ctx,
        )
      : await buffer(`file:${sound.id}`, () => fetchBytes(fileUrl(sound.id)), ctx);
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = decoded;
  gain.gain.value = Math.min(1, setting.volume);
  source.connect(gain).connect(ctx.destination);
  source.start();
}
