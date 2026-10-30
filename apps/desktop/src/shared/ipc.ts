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

export interface AppState {
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

  setClientId(clientId: string): Promise<void>;
  signIn(): Promise<void>;
  cancelSignIn(): Promise<void>;
  signOut(): Promise<void>;

  connect(login: string): Promise<void>;
  disconnect(): Promise<void>;

  setOverlayEnabled(enabled: boolean): Promise<void>;
  setOverlayEditing(editing: boolean): Promise<void>;

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
  setClientId: 'settings:set-client-id',
  signIn: 'auth:sign-in',
  cancelSignIn: 'auth:cancel',
  signOut: 'auth:sign-out',
  connect: 'chat:connect',
  disconnect: 'chat:disconnect',
  setOverlayEnabled: 'overlay:set-enabled',
  setOverlayEditing: 'overlay:set-editing',
  selectTheme: 'theme:select',
  saveTheme: 'theme:save',
  deleteTheme: 'theme:delete',
  openExternal: 'app:open-external',
} as const;
