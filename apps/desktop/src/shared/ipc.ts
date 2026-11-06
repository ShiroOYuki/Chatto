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
import type { ShareClient } from './share/client';
import type { ShareState } from '@chatto/share';

/** Theme sharing calls the control panel may make; they run on the main process's `ShareClient`. */
export const SHARE_METHODS = [
  'acceptTerms',
  'signIn',
  'cancelSignIn',
  'signOut',
  'setDisplayName',
  'unlink',
  'deleteAccount',
  'list',
  'findByCode',
  'get',
  'versions',
  'install',
  'download',
  'setLiked',
  'report',
  'mine',
  'publish',
  'unpublish',
  'reports',
  'setHidden',
  'setBanned',
] as const;
export type ShareMethod = (typeof SHARE_METHODS)[number];
export type ShareApi = Pick<ShareClient, ShareMethod>;

export const isShareMethod = (value: unknown): value is ShareMethod =>
  (SHARE_METHODS as readonly unknown[]).includes(value);

/** A rectangle of the main window, in CSS pixels. */
export interface CaptureRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  /** The user said no to the title bar's "install the OBS plugin" prompt (updates still show). */
  obsPluginPromptDismissed: boolean;
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

/**
 * Where the app update stands. `unsupported` is a development build;
 * `not-available` means this is the latest version.
 */
export type UpdateStatus =
  'unsupported' | 'idle' | 'checking' | 'not-available' | 'available' | 'downloading' | 'downloaded' | 'error';

export interface UpdateState {
  status: UpdateStatus;
  /** The new version, once one is found. */
  version?: string;
  /** Download progress, 0–100. */
  percent?: number;
  error?: UpdateErrorKind;
}

/**
 * Why an update failed, as the user is told it (the raw error stays in the log):
 * `not-found` — GitHub has no published release to read; `network` — GitHub was unreachable.
 */
export type UpdateErrorKind = 'not-found' | 'network' | 'unknown';

/** The user's own Client ID, the one built into this version, or none at all. */
export type ClientIdSource = 'custom' | 'built-in' | 'none';

export interface AppState {
  appInfo: { version: string; platform: string };
  update: UpdateState;
  window: { maximized: boolean };
  prefs: AppPrefs;
  /** Which Twitch Client ID is in use; the value itself stays in the main process. */
  clientId: { source: ClientIdSource; hasBuiltIn: boolean };
  auth: {
    status: 'signed-out' | 'pending' | 'signed-in';
    login?: string;
    /**
     * Signed in with permission to read channel points redemptions. Tokens from
     * before Chatto asked for it lack it until the user signs in again.
     */
    redemptionScope?: boolean;
    deviceCode?: DeviceCodeInfo;
    error?: string;
  };
  channel: { login?: string; state: ConnectionState; detail?: string };
  overlay: { enabled: boolean; editing: boolean };
  /** The event alert overlay window. */
  alertsOverlay: { enabled: boolean; editing: boolean };
  alerts: AlertSettings;
  server: { port: number; embedUrl: string; overlayUrl: string };
  themes: ChatTheme[];
  selectedThemes: Record<ViewerTarget, string>;
  /** Theme sharing account; the session token stays in the main process. */
  share: ShareState;
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

  /** Saves the user's own Client ID; an empty one goes back to the built-in ID. */
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

  /** App updates; progress arrives through `state.update`. */
  checkForUpdate(): Promise<void>;
  downloadUpdate(): Promise<void>;
  /** Quits, installs the downloaded update and starts the new version. */
  installUpdate(): Promise<void>;

  /** Theme sharing (GitHub #4); the account shows in `state.share`. */
  share<K extends ShareMethod>(method: K, ...args: Parameters<ShareApi[K]>): Promise<Awaited<ReturnType<ShareApi[K]>>>;
  /** A PNG data URL of part of the main window (theme thumbnails); null where it cannot capture. */
  captureThumbnail(rect: CaptureRect): Promise<string | null>;
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
  checkForUpdate: 'update:check',
  downloadUpdate: 'update:download',
  installUpdate: 'update:install',
  share: 'share:call',
  captureThumbnail: 'share:capture-thumbnail',
} as const;
