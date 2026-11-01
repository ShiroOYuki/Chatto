/**
 * Streamer-only alerts: the "new message after a quiet spell" reminder and the
 * event alert overlay. Shared by the desktop app (settings, filtering), the
 * control panel (editing, playback) and the alerts viewer (playback).
 */

/** Built-in sounds: CC0 sounds from soundcn, loaded on demand (see `@chatto/chat-ui` sounds.ts). */
export const BUILTIN_SOUNDS = ['teacup', 'chime', 'bubble', 'bell', 'pizzicato', 'coin', 'level-up'] as const;
export type BuiltinSoundId = (typeof BUILTIN_SOUNDS)[number];

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

export const defaultSound = (id: BuiltinSoundId = 'teacup', volume = 0.6): SoundSetting => ({
  enabled: true,
  sound: { kind: 'builtin', id },
  volume,
});

export const defaultEventAlertRule = (): EventAlertRule => ({
  enabled: true,
  minimum: 0,
  sound: defaultSound('chime'),
});

export const defaultAlertSettings = (): AlertSettings => ({
  silence: {
    enabled: true,
    thresholdSeconds: SILENCE_THRESHOLD.default,
    flash: true,
    sound: defaultSound('teacup'),
  },
  events: { durationSeconds: 5, hideInChatOverlay: false, rules: {} },
});

/** The highlight added to a chat message that broke a quiet spell (desktop overlay only). */
export const AFTER_SILENCE = 'after-silence';
