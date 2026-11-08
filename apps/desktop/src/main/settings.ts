import {
  defaultAlertSettings,
  isLocale,
  localeFromTag,
  normalizeAlertSettings,
  type AlertSettings,
  type ChatTheme,
  type ViewerTarget,
} from '@chatto/core';
import { DEFAULT_THEME_ID } from '@chatto/chat-ui/themes';
import type { AppPrefs } from '../shared/ipc';
import { DEFAULT_OVERLAY_LOOK, normalizeOverlayLook, type OverlayLook } from '../shared/overlayLook';
import { emptyShortcuts, normalizeShortcuts, type ShortcutBindings } from '../shared/shortcuts';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A desktop overlay window: whether it is open, where it sits and how it looks. */
export interface OverlayWindowSettings {
  enabled: boolean;
  bounds?: Rect;
  look: OverlayLook;
}

/** Overlay window settings from older versions or hand edits. */
export function normalizeOverlayWindow(raw: Partial<OverlayWindowSettings> | undefined): OverlayWindowSettings {
  return {
    ...raw,
    enabled: raw?.enabled === true,
    look: normalizeOverlayLook(raw?.look),
  };
}

/** The Twitch Client ID baked in at build time (`MAIN_VITE_TWITCH_CLIENT_ID`), or empty. */
export const BUILT_IN_CLIENT_ID = (import.meta.env.MAIN_VITE_TWITCH_CLIENT_ID ?? '').trim();

export interface Settings {
  /** The user's own Twitch Client ID; empty means the built-in one is used. */
  twitchClientId: string;
  channelLogin: string;
  serverPort: number;
  overlay: OverlayWindowSettings;
  /** The event alert overlay window. */
  alertsOverlay: OverlayWindowSettings;
  alerts: AlertSettings;
  selectedThemes: Record<ViewerTarget, string>;
  customThemes: ChatTheme[];
  prefs: AppPrefs;
  /** Main window bounds, restored on launch. */
  windowBounds?: Rect;
  /** Theme sharing: the anonymous id that counts downloads, and the terms version agreed to (0 for none). */
  share: { clientId: string; termsAccepted: number };
  /** Global shortcuts (#53); none bound by default. */
  shortcuts: ShortcutBindings;
}

const defaults = (): Settings => ({
  twitchClientId: '',
  channelLogin: '',
  serverPort: 4820,
  overlay: { enabled: false, look: DEFAULT_OVERLAY_LOOK },
  alertsOverlay: { enabled: false, look: DEFAULT_OVERLAY_LOOK },
  alerts: defaultAlertSettings(),
  selectedThemes: { overlay: DEFAULT_THEME_ID, embed: DEFAULT_THEME_ID, alerts: DEFAULT_THEME_ID },
  customThemes: [],
  prefs: {
    uiMode: 'full',
    appearance: 'system',
    closeToTray: true,
    launchAtLogin: false,
    editorCommand: '',
    // First launch speaks the system language.
    locale: localeFromTag(app.getLocale()),
    chatLocale: 'auto',
    obsPluginPromptDismissed: false,
    skippedUpdateVersion: '',
    onboardingDismissed: false,
    visitedThemes: false,
    visitedAlerts: false,
  },
  share: { clientId: randomUUID(), termsAccepted: 0 },
  shortcuts: emptyShortcuts(),
});

/** Sharing settings from older versions or hand edits: a missing client id gets a new one. */
export function normalizeShareSettings(raw: Partial<Settings['share']> | undefined): Settings['share'] {
  const clientId = typeof raw?.clientId === 'string' && raw.clientId ? raw.clientId : randomUUID();
  const termsAccepted = typeof raw?.termsAccepted === 'number' ? raw.termsAccepted : 0;
  return { clientId, termsAccepted };
}

/**
 * Someone upgrading who already picked a channel has set Chatto up: the getting-started
 * list (#54) starts closed for them. A fresh install shows it.
 */
export function onboardingBase(raw: Partial<Settings>, base: AppPrefs): AppPrefs {
  const upgrading = raw.prefs !== undefined && raw.prefs.onboardingDismissed === undefined;
  return upgrading && raw.channelLogin ? { ...base, onboardingDismissed: true } : base;
}

/** Fills preferences saved by older versions and drops unknown languages. */
export function normalizePrefs(raw: Partial<AppPrefs> | undefined, base: AppPrefs): AppPrefs {
  const prefs = { ...base, ...raw };
  if (!isLocale(prefs.locale)) prefs.locale = base.locale;
  if (prefs.chatLocale !== 'auto' && !isLocale(prefs.chatLocale)) prefs.chatLocale = 'auto';
  if (typeof prefs.skippedUpdateVersion !== 'string') prefs.skippedUpdateVersion = '';
  for (const key of ['onboardingDismissed', 'visitedThemes', 'visitedAlerts'] as const) {
    if (typeof prefs[key] !== 'boolean') prefs[key] = base[key];
  }
  return prefs;
}

/**
 * Older versions saved the built-in Client ID as if the user had entered it;
 * that copy is dropped so a newer built-in one takes over.
 */
export function customClientId(saved: string | undefined, builtIn = BUILT_IN_CLIENT_ID): string {
  const id = (saved ?? '').trim();
  return id === builtIn ? '' : id;
}

/** JSON settings in the user data folder, written atomically. */
export class SettingsStore {
  readonly path = join(app.getPath('userData'), 'settings.json');
  #data: Settings;

  constructor() {
    this.#data = this.#read();
  }

  get(): Settings {
    return this.#data;
  }

  update(patch: (draft: Settings) => void): Settings {
    const draft = structuredClone(this.#data);
    patch(draft);
    this.#data = draft;
    this.#write();
    return draft;
  }

  #read(): Settings {
    try {
      const raw = JSON.parse(readFileSync(this.path, 'utf8')) as Partial<Settings>;
      const base = defaults();
      return {
        ...base,
        ...raw,
        twitchClientId: customClientId(raw.twitchClientId),
        overlay: normalizeOverlayWindow(raw.overlay),
        alertsOverlay: normalizeOverlayWindow(raw.alertsOverlay),
        alerts: normalizeAlertSettings(raw.alerts),
        selectedThemes: { ...base.selectedThemes, ...raw.selectedThemes },
        prefs: normalizePrefs(raw.prefs, onboardingBase(raw, base.prefs)),
        share: normalizeShareSettings(raw.share),
        shortcuts: normalizeShortcuts(raw.shortcuts),
      };
    } catch {
      return defaults();
    }
  }

  #write(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const temp = `${this.path}.tmp`;
    writeFileSync(temp, JSON.stringify(this.#data, null, 2));
    renameSync(temp, this.path);
  }
}
