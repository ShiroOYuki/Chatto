/**
 * Typed contract between the main process and the control panel renderer.
 * The preload script exposes {@link ChattoApi} as `window.chatto`.
 */
import type {
  AlertSettings,
  ChatEvent,
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

  /** Writes the theme's custom CSS to its file, keeps the two in sync and opens it in the editor. */
  openCssFile(themeId: string, css: string): Promise<CssFileOpenResult>;
  /** Pushes the editor's latest custom CSS to the synced file. */
  writeCssFile(themeId: string, css: string): Promise<void>;
  /** Stops syncing the theme's CSS file (the theme editor closed). */
  closeCssFile(themeId: string): Promise<void>;
  /** The synced CSS file was changed outside Chatto. */
  onCssFileChanged(listener: (change: CssFileChange) => void): () => void;

  openExternal(url: string): Promise<void>;
}

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
  openCssFile: 'css-file:open',
  writeCssFile: 'css-file:write',
  closeCssFile: 'css-file:close',
  cssFileChanged: 'css-file:changed',
  openExternal: 'app:open-external',
} as const;
