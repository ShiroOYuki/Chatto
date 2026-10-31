import { PRESET_THEMES } from '@chatto/chat-ui';
import type { ChatEvent } from '@chatto/core';
import { vi } from 'vitest';
import type { AppState, ChattoApi } from '../apps/desktop/src/shared/ipc';

export function sampleState(patch: Partial<AppState> = {}): AppState {
  return {
    appInfo: { version: '0.1.0', platform: 'test' },
    window: { maximized: false },
    prefs: { uiMode: 'full', appearance: 'light', closeToTray: true, launchAtLogin: false },
    clientIdConfigured: true,
    auth: { status: 'signed-in', login: 'shiraine_ciel' },
    channel: { login: 'shiraine_ciel', state: 'connected' },
    overlay: { enabled: false, editing: false },
    server: { port: 4820, embedUrl: 'http://127.0.0.1:4820/embed', overlayUrl: 'http://127.0.0.1:4820/overlay' },
    themes: PRESET_THEMES,
    selectedThemes: { overlay: 'matcha-glass', embed: 'washi' },
    ...patch,
  };
}

export type FakeApi = { [K in keyof ChattoApi]: ReturnType<typeof vi.fn> & ChattoApi[K] } & {
  /** Pushes a state update to the renderer, like the main process does over IPC. */
  pushState(patch: Partial<AppState>): void;
  /** Delivers a chat event, like the main process does over IPC. */
  pushChat(event: ChatEvent): void;
  state: AppState;
};

/**
 * Stand-in for `window.chatto` in renderer tests. Every method is a spy;
 * use it from `vi.mock('<path>/api', ...)`.
 */
export function createFakeApi(initial: AppState = sampleState()): FakeApi {
  const stateListeners = new Set<(state: AppState) => void>();
  const chatListeners = new Set<(event: ChatEvent) => void>();
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
    selectTheme: resolved(),
    saveTheme: resolved(),
    deleteTheme: resolved(),
    openExternal: resolved(),
    pushState(patch: Partial<AppState>) {
      fake.state = { ...fake.state, ...patch };
      stateListeners.forEach((listener) => listener(fake.state));
    },
    pushChat(event: ChatEvent) {
      chatListeners.forEach((listener) => listener(event));
    },
  };
  return fake as unknown as FakeApi;
}
