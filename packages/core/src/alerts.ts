/**
 * Streamer-only alerts: the "new message after a quiet spell" reminder and the
 * event alert overlay. Shared by the desktop app (settings, filtering), the
 * control panel (editing, playback) and the alerts viewer (playback).
 */

/** Built-in sounds: CC0 sounds from soundcn, loaded on demand (see `@chatto/chat-ui` sounds.ts). */
export const BUILTIN_SOUNDS = ['bubble', 'coin', 'bell', 'laser'] as const;
export type BuiltinSoundId = (typeof BUILTIN_SOUNDS)[number];

const isBuiltinSound = (id: string): id is BuiltinSoundId => (BUILTIN_SOUNDS as readonly string[]).includes(id);

export type SoundRef =
  | { kind: 'builtin'; id: BuiltinSoundId }
  /** A file the user picked, copied into Chatto's data folder and served at `/sounds/<id>`. */
  | { kind: 'file'; id: string; name: string };

export interface SoundSetting {
  enabled: boolean;
  sound: SoundRef;
  /** 0–1. */
  volume: number;
}

/** Quiet-spell limits in seconds. */
export const SILENCE_THRESHOLD = { min: 30, max: 1800, default: 120 } as const;

export interface SilenceAlertSettings {
  enabled: boolean;
  /** Seconds without chat before the next message counts as "after silence". */
  thresholdSeconds: number;
  /** Highlight the message on the desktop overlay (styled by the theme's `attention`). */
  flash: boolean;
  sound: SoundSetting;
}

export interface EventAlertRule {
  enabled: boolean;
  /** Smallest amount that alerts (bits, viewers, gifts …); 0 alerts every time. Ignored for events without an amount. */
  minimum: number;
  sound: SoundSetting;
}

export interface EventAlertSettings {
  /** Seconds each alert card stays up. */
  durationSeconds: number;
  /** While the alert overlay is on, leave alerted events out of the desktop chat overlay. */
  hideInChatOverlay: boolean;
  /** Keyed by event key (`twitch:cheer`); a missing key uses {@link defaultEventAlertRule}. */
  rules: Record<string, EventAlertRule>;
}

export interface AlertSettings {
  silence: SilenceAlertSettings;
  events: EventAlertSettings;
}

export const defaultSound = (id: BuiltinSoundId = 'bubble', volume = 0.6): SoundSetting => ({
  enabled: true,
  sound: { kind: 'builtin', id },
  volume,
});

/** Every event starts switched off; the streamer turns on the ones they want. */
export const defaultEventAlertRule = (): EventAlertRule => ({
  enabled: false,
  minimum: 0,
  sound: defaultSound('bell'),
});

export const defaultAlertSettings = (): AlertSettings => ({
  silence: {
    enabled: true,
    thresholdSeconds: SILENCE_THRESHOLD.default,
    flash: true,
    sound: defaultSound('bubble'),
  },
  events: { durationSeconds: 5, hideInChatOverlay: false, rules: {} },
});

/** The highlight added to a chat message that broke a quiet spell (desktop overlay only). */
export const AFTER_SILENCE = 'after-silence';

/**
 * Keeps a stored sound playable: built-in sounds that a later version removed
 * fall back to `fallback`, keeping the setting's switch and volume.
 */
export function normalizeSound(setting: SoundSetting, fallback: BuiltinSoundId): SoundSetting {
  const { sound } = setting;
  return sound.kind === 'builtin' && !isBuiltinSound(sound.id)
    ? { ...setting, sound: { kind: 'builtin', id: fallback } }
    : setting;
}

/** Alert settings as read from an older settings file: any part may be missing. */
export interface StoredAlertSettings {
  silence?: Partial<Omit<SilenceAlertSettings, 'sound'>> & { sound?: Partial<SoundSetting> };
  events?: Partial<Omit<EventAlertSettings, 'rules'>> & { rules?: Record<string, Partial<EventAlertRule>> };
}

/** Fills missing fields from the defaults and repairs sounds that no longer exist. */
export function normalizeAlertSettings(raw?: StoredAlertSettings): AlertSettings {
  const base = defaultAlertSettings();
  const rules: Record<string, EventAlertRule> = {};
  for (const [key, rule] of Object.entries(raw?.events?.rules ?? {})) {
    const fallback = defaultEventAlertRule();
    rules[key] = {
      ...fallback,
      ...rule,
      sound: normalizeSound({ ...fallback.sound, ...rule.sound } as SoundSetting, 'bell'),
    };
  }
  return {
    silence: {
      ...base.silence,
      ...raw?.silence,
      sound: normalizeSound({ ...base.silence.sound, ...raw?.silence?.sound } as SoundSetting, 'bubble'),
    },
    events: { ...base.events, ...raw?.events, rules },
  };
}
