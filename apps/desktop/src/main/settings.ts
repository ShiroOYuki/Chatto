import {
  defaultAlertSettings,
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

export interface Settings {
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
  twitchClientId: import.meta.env.MAIN_VITE_TWITCH_CLIENT_ID ?? '',
  channelLogin: '',
  serverPort: 4820,
  overlay: { enabled: false },
  alertsOverlay: { enabled: false },
  alerts: defaultAlertSettings(),
  selectedThemes: { overlay: DEFAULT_THEME_ID, embed: DEFAULT_THEME_ID, alerts: DEFAULT_THEME_ID },
  customThemes: [],
  prefs: { uiMode: 'full', appearance: 'system', closeToTray: true, launchAtLogin: false, editorCommand: '' },
});

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
        twitchClientId: raw.twitchClientId || base.twitchClientId,
        overlay: { ...base.overlay, ...raw.overlay },
        alertsOverlay: { ...base.alertsOverlay, ...raw.alertsOverlay },
        alerts: normalizeAlertSettings(raw.alerts),
        selectedThemes: { ...base.selectedThemes, ...raw.selectedThemes },
        prefs: { ...base.prefs, ...raw.prefs },
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
