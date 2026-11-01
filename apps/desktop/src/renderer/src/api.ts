import { createMockMessage, createMockNotice, PRESET_THEMES } from '@chatto/chat-ui';
import { defaultAlertSettings, type ChatEvent, type SoundSetting } from '@chatto/core';
import type { AppState, ChattoApi, CssFileChange } from '../../shared/ipc';

declare global {
  interface Window {
    chatto?: ChattoApi;
    /** Test hooks of the browser mock API, only with `?e2e`. */
    __chattoMock?: {
      emitChat(event: ChatEvent): void;
      setState(patch: Partial<AppState>): void;
      playAlertSound(sound: SoundSetting): void;
      /** Simulates an outside edit of the synced CSS file. */
      changeCssFile(change: CssFileChange): void;
    };
  }
}

/**
 * In-browser stand-in for the Electron preload API, so the control panel can
 * be developed with `npm run dev:web` and previewed without Electron.
 * `?compact` starts in compact mode, `?page=<id>` opens a page.
 * `?e2e` turns off the random chat stream and exposes `window.__chattoMock`
 * so end-to-end tests can push exact events and state.
 */
function createMockApi(): ChattoApi {
  const params = new URLSearchParams(location.search);
  let state: AppState = {
    appInfo: { version: '0.1.0', platform: 'web' },
    window: { maximized: false },
    prefs: {
      uiMode: params.has('compact') ? 'compact' : 'full',
      appearance: 'system',
      closeToTray: true,
      launchAtLogin: false,
      editorCommand: '',
    },
    clientIdConfigured: true,
    auth: { status: 'signed-in', login: 'shiraine_ciel' },
    channel: { login: 'shiraine_ciel', state: 'connected' },
    overlay: { enabled: true, editing: false },
    alertsOverlay: { enabled: false, editing: false },
    alerts: defaultAlertSettings(),
    server: { port: 4820, embedUrl: 'http://127.0.0.1:4820/embed', overlayUrl: 'http://127.0.0.1:4820/overlay' },
    themes: PRESET_THEMES,
    selectedThemes: { overlay: 'matcha-glass', embed: 'washi', alerts: 'bubble' },
  };
  const stateListeners = new Set<(state: AppState) => void>();
  const chatListeners = new Set<(event: ChatEvent) => void>();
  const soundListeners = new Set<(sound: SoundSetting) => void>();
  const cssFileListeners = new Set<(change: CssFileChange) => void>();
  const set = (patch: Partial<AppState>) => {
    state = { ...state, ...patch };
    stateListeners.forEach((listener) => listener(state));
  };
  const emitChat = (event: ChatEvent) => chatListeners.forEach((listener) => listener(event));

  if (params.has('e2e')) {
    window.__chattoMock = {
      emitChat,
      setState: set,
      playAlertSound: (sound) => soundListeners.forEach((listener) => listener(sound)),
      changeCssFile: (change) => cssFileListeners.forEach((listener) => listener(change)),
    };
  }

  let sent: string[] = [];
  if (!params.has('e2e'))
    setInterval(() => {
      const roll = Math.random();
      if (roll < 0.05) return emitChat(createMockNotice());
      if (roll < 0.08 && sent.length > 3) {
        const messageId = sent[sent.length - 3]!;
        return emitChat({ type: 'message-deleted', platform: 'twitch', channelId: '1', messageId });
      }
      const event = createMockMessage();
      if (event.type === 'message') sent = [...sent.slice(-20), event.message.id];
      emitChat(event);
    }, 1200);

  return {
    getState: async () => state,
    onState: (listener) => (stateListeners.add(listener), () => stateListeners.delete(listener)),
    onChatEvent: (listener) => (chatListeners.add(listener), () => chatListeners.delete(listener)),
    onAlertSound: (listener) => (soundListeners.add(listener), () => soundListeners.delete(listener)),
    windowMinimize: async () => undefined,
    windowToggleMaximize: async () => set({ window: { maximized: !state.window.maximized } }),
    windowClose: async () => undefined,
    setPrefs: async (patch) => set({ prefs: { ...state.prefs, ...patch } }),
    setClientId: async () => set({ clientIdConfigured: true }),
    signIn: async () => {
      set({
        auth: {
          status: 'pending',
          deviceCode: {
            userCode: 'MATCHA42',
            verificationUri: 'https://www.twitch.tv/activate',
            expiresAt: Date.now() + 600_000,
          },
        },
      });
      setTimeout(() => set({ auth: { status: 'signed-in', login: 'shiraine_ciel' } }), 4000);
    },
    cancelSignIn: async () => set({ auth: { status: 'signed-out' } }),
    signOut: async () => set({ auth: { status: 'signed-out' }, channel: { state: 'idle' } }),
    connect: async (login) => set({ channel: { login, state: 'connected' } }),
    disconnect: async () => set({ channel: { ...state.channel, state: 'closed' } }),
    setOverlayEnabled: async (enabled) => set({ overlay: { ...state.overlay, enabled } }),
    setOverlayEditing: async (editing) => set({ overlay: { ...state.overlay, editing } }),
    resetOverlayBounds: async () => undefined,
    setAlertSettings: async (alerts) => set({ alerts }),
    setAlertsOverlayEnabled: async (enabled) => set({ alertsOverlay: { ...state.alertsOverlay, enabled } }),
    setAlertsOverlayEditing: async (editing) => set({ alertsOverlay: { ...state.alertsOverlay, editing } }),
    resetAlertsOverlayBounds: async () => undefined,
    // The browser preview cannot copy files; pretend the user cancelled.
    importSound: async () => null,
    selectTheme: async (target, themeId) => set({ selectedThemes: { ...state.selectedThemes, [target]: themeId } }),
    saveTheme: async (theme) => {
      const exists = state.themes.some((item) => item.id === theme.id);
      set({
        themes: exists
          ? state.themes.map((item) => (item.id === theme.id ? theme : item))
          : [...state.themes, { ...theme, builtIn: false }],
      });
    },
    deleteTheme: async (themeId) => set({ themes: state.themes.filter((item) => item.id !== themeId) }),
    // The browser preview has no files; report where the desktop app would put it.
    openCssFile: async (themeId) => ({
      launched: 'none',
      path: `%APPDATA%\\Chatto\\custom-css\\${themeId}.css`,
    }),
    writeCssFile: async () => undefined,
    closeCssFile: async () => undefined,
    onCssFileChanged: (listener) => (cssFileListeners.add(listener), () => cssFileListeners.delete(listener)),
    openExternal: async (url) => void window.open(url, '_blank'),
  };
}

export const api: ChattoApi = window.chatto ?? createMockApi();
export const isMockApi = !window.chatto;
