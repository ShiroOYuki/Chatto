import { PRESET_THEMES } from '@chatto/chat-ui';
import { defaultAlertSettings, type ChatEvent, type ChatTheme, type SoundSetting } from '@chatto/core';
import { vi } from 'vitest';
import type { AppState, ChattoApi, CssFileChange } from '../apps/desktop/src/shared/ipc';

export function sampleState(patch: Partial<AppState> = {}): AppState {
  return {
    appInfo: { version: '0.1.0', platform: 'test' },
    window: { maximized: false },
    prefs: {
      uiMode: 'full',
      appearance: 'light',
      closeToTray: true,
      launchAtLogin: false,
      editorCommand: '',
      locale: 'zh-TW',
      chatLocale: 'auto',
    },
    clientIdConfigured: true,
    auth: { status: 'signed-in', login: 'shiraine_ciel' },
    channel: { login: 'shiraine_ciel', state: 'connected' },
    overlay: { enabled: false, editing: false },
    alertsOverlay: { enabled: false, editing: false },
    alerts: defaultAlertSettings(),
    server: { port: 4820, embedUrl: 'http://127.0.0.1:4820/embed', overlayUrl: 'http://127.0.0.1:4820/overlay' },
    themes: PRESET_THEMES,
    selectedThemes: { overlay: 'matcha-glass', embed: 'washi', alerts: 'bubble' },
    ...patch,
  };
}

export type FakeApi = { [K in keyof ChattoApi]: ReturnType<typeof vi.fn> & ChattoApi[K] } & {
  /** Pushes a state update to the renderer, like the main process does over IPC. */
  pushState(patch: Partial<AppState>): void;
  /** Delivers a chat event, like the main process does over IPC. */
  pushChat(event: ChatEvent): void;
  /** Asks the renderer to play a reminder sound, like the main process does over IPC. */
  pushAlertSound(sound: SoundSetting): void;
  /** Reports a CSS file saved outside Chatto, like the main process does over IPC. */
  pushCssFile(change: CssFileChange): void;
  state: AppState;
};

/**
 * Stand-in for `window.chatto` in renderer tests. Every method is a spy;
 * use it from `vi.mock('<path>/api', ...)`.
 */
export function createFakeApi(initial: AppState = sampleState()): FakeApi {
  const stateListeners = new Set<(state: AppState) => void>();
  const chatListeners = new Set<(event: ChatEvent) => void>();
  const soundListeners = new Set<(sound: SoundSetting) => void>();
  const cssFileListeners = new Set<(change: CssFileChange) => void>();
  const resolved = () => vi.fn(async () => undefined);
  const fake = {
    state: initial,
    getState: vi.fn(async () => fake.state),
    onState: vi.fn((listener: (state: AppState) => void) => {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    }),
    onChatEvent: vi.fn((listener: (event: ChatEvent) => void) => {
      chatListeners.add(listener);
      return () => chatListeners.delete(listener);
    }),
    onAlertSound: vi.fn((listener: (sound: SoundSetting) => void) => {
      soundListeners.add(listener);
      return () => soundListeners.delete(listener);
    }),
    windowMinimize: resolved(),
    windowToggleMaximize: resolved(),
    windowClose: resolved(),
    setPrefs: resolved(),
    setClientId: resolved(),
    signIn: resolved(),
    cancelSignIn: resolved(),
    signOut: resolved(),
    connect: resolved(),
    disconnect: resolved(),
    setOverlayEnabled: resolved(),
    setOverlayEditing: resolved(),
    resetOverlayBounds: resolved(),
    setAlertSettings: resolved(),
    setAlertsOverlayEnabled: resolved(),
    setAlertsOverlayEditing: resolved(),
    resetAlertsOverlayBounds: resolved(),
    importSound: vi.fn(async () => null),
    selectTheme: resolved(),
    saveTheme: resolved(),
    deleteTheme: resolved(),
    importThemeAsset: vi.fn(async (): Promise<string | null> => null),
    exportThemePackage: vi.fn(async () => true),
    importThemePackage: vi.fn(async (): Promise<ChatTheme> => {
      throw new Error('not stubbed');
    }),
    openCssFile: vi.fn(async (themeId: string) => ({ launched: 'editor', path: `C:\\custom-css\\${themeId}.css` })),
    onCssFileChanged: vi.fn((listener: (change: CssFileChange) => void) => {
      cssFileListeners.add(listener);
      return () => cssFileListeners.delete(listener);
    }),
    openExternal: resolved(),
    pushState(patch: Partial<AppState>) {
      fake.state = { ...fake.state, ...patch };
      stateListeners.forEach((listener) => listener(fake.state));
    },
    pushChat(event: ChatEvent) {
      chatListeners.forEach((listener) => listener(event));
    },
    pushAlertSound(sound: SoundSetting) {
      soundListeners.forEach((listener) => listener(sound));
    },
    pushCssFile(change: CssFileChange) {
      cssFileListeners.forEach((listener) => listener(change));
    },
  };
  return fake as unknown as FakeApi;
}
