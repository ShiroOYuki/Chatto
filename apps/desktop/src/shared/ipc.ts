/**
 * Typed contract between the main process and the control panel renderer.
 * The preload script exposes {@link ChattoApi} as `window.chatto`.
 */
import type { ChatEvent, ChatTheme, ConnectionState, ViewerTarget } from '@chatto/core';

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
}

export interface AppState {
  appInfo: { version: string; platform: string };
  window: { maximized: boolean };
  prefs: AppPrefs;
  clientIdConfigured: boolean;
  auth: { status: 'signed-out' | 'pending' | 'signed-in'; login?: string; deviceCode?: DeviceCodeInfo; error?: string };
  channel: { login?: string; state: ConnectionState; detail?: string };
  overlay: { enabled: boolean; editing: boolean };
  server: { port: number; embedUrl: string; overlayUrl: string };
  themes: ChatTheme[];
  selectedThemes: Record<ViewerTarget, string>;
}

export interface ChattoApi {
  getState(): Promise<AppState>;
  onState(listener: (state: AppState) => void): () => void;
  onChatEvent(listener: (event: ChatEvent) => void): () => void;

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

  selectTheme(target: ViewerTarget, themeId: string): Promise<void>;
  saveTheme(theme: ChatTheme): Promise<void>;
  deleteTheme(themeId: string): Promise<void>;

  openExternal(url: string): Promise<void>;
}

/** IPC channel names, kept in one place so main and preload cannot drift. */
export const IPC = {
  getState: 'app:get-state',
  state: 'app:state',
  chatEvent: 'chat:event',
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
  selectTheme: 'theme:select',
  saveTheme: 'theme:save',
  deleteTheme: 'theme:delete',
  openExternal: 'app:open-external',
} as const;
