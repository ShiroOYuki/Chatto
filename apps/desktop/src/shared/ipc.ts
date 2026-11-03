/**
 * Typed contract between the main process and the control panel renderer.
 * The preload script exposes {@link ChattoApi} as `window.chatto`.
 */
import type {
  AlertSettings,
  ChatEvent,
  ChatLocalePref,
  Locale,
  ChatTheme,
  ConnectionState,
  SoundRef,
  SoundSetting,
  ViewerTarget,
} from '@chatto/core';

export interface DeviceCodeInfo {
  userCode: string;
  verificationUri: string;
  expiresAt: number;
}

/** Control panel layout: full app with navigation, or the single-page bento dashboard. */
export type UiMode = 'full' | 'compact';
export type Appearance = 'system' | 'light' | 'dark';

export interface AppPrefs {
  uiMode: UiMode;
  appearance: Appearance;
  /** Closing the window hides Chatto to the tray instead of quitting. */
  closeToTray: boolean;
  launchAtLogin: boolean;
  /** Command that opens a theme's CSS file; empty uses VSCode. Supports `{file}` and `{folder}`. */
  editorCommand: string;
  /** Language of the control panel, tray menu and dialogs. */
  locale: Locale;
  /** Language of event texts on the overlays and OBS: `auto` follows `locale`. */
  chatLocale: ChatLocalePref;
}

/** How a theme's CSS file was opened: the configured editor, the system default app, or not at all. */
export type EditorLaunch = 'editor' | 'system' | 'none';

export interface CssFileOpenResult {
  launched: EditorLaunch;
  /** Absolute path of the theme's CSS file. */
  path: string;
}

export interface CssFileChange {
  themeId: string;
  css: string;
}

export interface AppState {
  appInfo: { version: string; platform: string };
  window: { maximized: boolean };
  prefs: AppPrefs;
  clientIdConfigured: boolean;
  auth: { status: 'signed-out' | 'pending' | 'signed-in'; login?: string; deviceCode?: DeviceCodeInfo; error?: string };
  channel: { login?: string; state: ConnectionState; detail?: string };
  overlay: { enabled: boolean; editing: boolean };
  /** The event alert overlay window. */
  alertsOverlay: { enabled: boolean; editing: boolean };
  alerts: AlertSettings;
  server: { port: number; embedUrl: string; overlayUrl: string };
  themes: ChatTheme[];
  selectedThemes: Record<ViewerTarget, string>;
}

export interface ChattoApi {
  getState(): Promise<AppState>;
  onState(listener: (state: AppState) => void): () => void;
  onChatEvent(listener: (event: ChatEvent) => void): () => void;
  /** A message broke a quiet spell and its reminder sound should play. */
  onAlertSound(listener: (sound: SoundSetting) => void): () => void;

  windowMinimize(): Promise<void>;
  windowToggleMaximize(): Promise<void>;
  /** Hides to tray or quits, depending on `prefs.closeToTray`. */
  windowClose(): Promise<void>;
  setPrefs(patch: Partial<AppPrefs>): Promise<void>;

  setClientId(clientId: string): Promise<void>;
  signIn(): Promise<void>;
  cancelSignIn(): Promise<void>;
  signOut(): Promise<void>;

  connect(login: string): Promise<void>;
  disconnect(): Promise<void>;

  setOverlayEnabled(enabled: boolean): Promise<void>;
  setOverlayEditing(editing: boolean): Promise<void>;
  resetOverlayBounds(): Promise<void>;

  setAlertSettings(settings: AlertSettings): Promise<void>;
  setAlertsOverlayEnabled(enabled: boolean): Promise<void>;
  setAlertsOverlayEditing(editing: boolean): Promise<void>;
  resetAlertsOverlayBounds(): Promise<void>;
  /** Lets the user pick an audio file and copies it into Chatto's sounds folder; null when cancelled. */
  importSound(): Promise<SoundRef | null>;

  selectTheme(target: ViewerTarget, themeId: string): Promise<void>;
  saveTheme(theme: ChatTheme): Promise<void>;
  deleteTheme(themeId: string): Promise<void>;

  /** Lets the user pick an image for a frame; resolves to its `asset:` source, or null when cancelled. */
  importThemeAsset(): Promise<string | null>;
  /** Saves a theme with its frame images as a `.chattotheme` package; false when cancelled. */
  exportThemePackage(theme: ChatTheme): Promise<boolean>;
  /** Stores a package's images and returns its theme (normalized, not saved yet). */
  importThemePackage(bytes: Uint8Array): Promise<ChatTheme>;

  /** Writes the theme's saved custom CSS to its file and opens it in the editor. */
  openCssFile(themeId: string): Promise<CssFileOpenResult>;
  /** A theme's CSS file was saved outside Chatto; the theme is already saved with it. */
  onCssFileChanged(listener: (change: CssFileChange) => void): () => void;

  openExternal(url: string): Promise<void>;

  /** The bundled OBS plugin ("Chatto Chat" source) in OBS's plugin folder. */
  getObsPluginStatus(): Promise<ObsPluginStatus>;
  installObsPlugin(): Promise<ObsPluginResult>;
  uninstallObsPlugin(): Promise<ObsPluginResult>;
}

/**
 * - `unavailable`: this build ships no plugin (a dev build that did not build it).
 * - `outdated`: installed, but not the files this Chatto version ships.
 */
export type ObsPluginState = 'not-installed' | 'installed' | 'outdated' | 'unavailable';

export interface ObsPluginStatus {
  state: ObsPluginState;
  /** OBS has been installed or run on this computer. */
  obsFound: boolean;
}

export type ObsPluginResult =
  | { ok: true; status: ObsPluginStatus }
  /** `obs-running`: OBS holds the plugin open, so it must be closed first. */
  | { ok: false; reason: 'obs-running' | 'failed'; status: ObsPluginStatus };

/** IPC channel names, kept in one place so main and preload cannot drift. */
export const IPC = {
  getState: 'app:get-state',
  state: 'app:state',
  chatEvent: 'chat:event',
  alertSound: 'alert:sound',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  setPrefs: 'app:set-prefs',
  setClientId: 'settings:set-client-id',
  signIn: 'auth:sign-in',
  cancelSignIn: 'auth:cancel',
  signOut: 'auth:sign-out',
  connect: 'chat:connect',
  disconnect: 'chat:disconnect',
  setOverlayEnabled: 'overlay:set-enabled',
  setOverlayEditing: 'overlay:set-editing',
  resetOverlayBounds: 'overlay:reset-bounds',
  setAlertSettings: 'alerts:set-settings',
  setAlertsOverlayEnabled: 'alerts-overlay:set-enabled',
  setAlertsOverlayEditing: 'alerts-overlay:set-editing',
  resetAlertsOverlayBounds: 'alerts-overlay:reset-bounds',
  importSound: 'alerts:import-sound',
  selectTheme: 'theme:select',
  saveTheme: 'theme:save',
  deleteTheme: 'theme:delete',
  importThemeAsset: 'theme:import-asset',
  exportThemePackage: 'theme:export-package',
  importThemePackage: 'theme:import-package',
  openCssFile: 'css-file:open',
  cssFileChanged: 'css-file:changed',
  openExternal: 'app:open-external',
  getObsPluginStatus: 'obs-plugin:status',
  installObsPlugin: 'obs-plugin:install',
  uninstallObsPlugin: 'obs-plugin:uninstall',
} as const;
