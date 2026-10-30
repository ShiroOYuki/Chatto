import { PRESET_THEMES, createMockMessage } from '@chatto/chat-ui';
import type { ChatEvent } from '@chatto/core';
import type { AppState, ChattoApi } from '../../shared/ipc';

declare global {
  interface Window {
    chatto?: ChattoApi;
  }
}

/**
 * In-browser stand-in for the Electron preload API, so the control panel can
 * be developed with `npm run dev:web` and previewed without Electron.
 */
function createMockApi(): ChattoApi {
  let state: AppState = {
    clientIdConfigured: true,
    auth: { status: 'signed-in', login: 'shiraine_ciel' },
    channel: { login: 'shiraine_ciel', state: 'connected' },
    overlay: { enabled: true, editing: false },
    server: { port: 4820, embedUrl: 'http://127.0.0.1:4820/embed', overlayUrl: 'http://127.0.0.1:4820/overlay' },
    themes: PRESET_THEMES,
    selectedThemes: { overlay: 'matcha-glass', embed: 'washi' },
  };
  const stateListeners = new Set<(state: AppState) => void>();
  const chatListeners = new Set<(event: ChatEvent) => void>();
  const set = (patch: Partial<AppState>) => {
    state = { ...state, ...patch };
    stateListeners.forEach((listener) => listener(state));
  };
  setInterval(() => {
    const event = createMockMessage();
    chatListeners.forEach((listener) => listener(event));
  }, 1400);

  return {
    getState: async () => state,
    onState: (listener) => (stateListeners.add(listener), () => stateListeners.delete(listener)),
    onChatEvent: (listener) => (chatListeners.add(listener), () => chatListeners.delete(listener)),
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
    selectTheme: async (target, themeId) => set({ selectedThemes: { ...state.selectedThemes, [target]: themeId } }),
    saveTheme: async () => undefined,
    deleteTheme: async () => undefined,
    openExternal: async (url) => void window.open(url, '_blank'),
  };
}

export const api: ChattoApi = window.chatto ?? createMockApi();
export const isMockApi = !window.chatto;
