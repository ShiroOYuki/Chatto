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
import { app } from 'electron';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The Twitch Client ID baked in at build time (`MAIN_VITE_TWITCH_CLIENT_ID`), or empty. */
export const BUILT_IN_CLIENT_ID = (import.meta.env.MAIN_VITE_TWITCH_CLIENT_ID ?? '').trim();

export interface Settings {
  /** The user's own Twitch Client ID; empty means the built-in one is used. */
  twitchClientId: string;
  channelLogin: string;
  serverPort: number;
  overlay: { enabled: boolean; bounds?: Rect };
  /** The event alert overlay window. */
  alertsOverlay: { enabled: boolean; bounds?: Rect };
  alerts: AlertSettings;
  selectedThemes: Record<ViewerTarget, string>;
  customThemes: ChatTheme[];
  prefs: AppPrefs;
  /** Main window bounds, restored on launch. */
  windowBounds?: Rect;
}

const defaults = (): Settings => ({
  twitchClientId: '',
  channelLogin: '',
  serverPort: 4820,
  overlay: { enabled: false },
  alertsOverlay: { enabled: false },
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
  },
});

/** Fills preferences saved by older versions and drops unknown languages. */
export function normalizePrefs(raw: Partial<AppPrefs> | undefined, base: AppPrefs): AppPrefs {
  const prefs = { ...base, ...raw };
  if (!isLocale(prefs.locale)) prefs.locale = base.locale;
  if (prefs.chatLocale !== 'auto' && !isLocale(prefs.chatLocale)) prefs.chatLocale = 'auto';
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
        overlay: { ...base.overlay, ...raw.overlay },
        alertsOverlay: { ...base.alertsOverlay, ...raw.alertsOverlay },
        alerts: normalizeAlertSettings(raw.alerts),
        selectedThemes: { ...base.selectedThemes, ...raw.selectedThemes },
        prefs: normalizePrefs(raw.prefs, base.prefs),
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
