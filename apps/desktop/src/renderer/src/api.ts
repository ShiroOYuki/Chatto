import { createMockMessage, createMockNotice, PRESET_THEMES } from '@chatto/chat-ui';
import { defaultAlertSettings, type ChatEvent, type ChatTheme, type SoundSetting } from '@chatto/core';
import type { AppState, ChattoApi, CssFileChange, ObsPluginStatus } from '../../shared/ipc';
import { ControlLog, type LoggedChatEvent } from '../../shared/controlLog';
import { DEFAULT_OVERLAY_LOOK, normalizeOverlayLook } from '../../shared/overlayLook';
import type { UpdateNote } from '../../shared/updateNotes';
import { duplicateOf, emptyShortcuts } from '../../shared/shortcuts';
import { ShareClient } from '../../shared/share/client';
import { createMemoryAssets } from '../../shared/share/memoryAssets';
import { createFakeShareBackend } from '@chatto/share/fake';

declare global {
  interface Window {
    chatto?: ChattoApi;
    /** Test hooks of the browser mock API, only with `?e2e`. */
    __chattoMock?: {
      emitChat(event: ChatEvent): void;
      setState(patch: Partial<AppState>): void;
      getState(): AppState;
      /** Themes "saved" as `.chattotheme` packages, in order. */
      exportedPackages(): ChatTheme[];
      playAlertSound(sound: SoundSetting): void;
      /** Simulates saving a theme's CSS file outside Chatto (does not save the theme). */
      changeCssFile(change: CssFileChange): void;
    };
  }
}

/**
 * In-browser stand-in for the Electron preload API, so the control panel can
 * be developed with `npm run dev:web` and previewed without Electron.
 * `?lang=en` or `?lang=ja` picks the interface language (Traditional Chinese otherwise). `?compact` starts in compact mode, `?page=<id>` opens a page.
 * `?e2e` turns off the random chat stream and exposes `window.__chattoMock`
 * so end-to-end tests can push exact events and state.
 * `?onboarding` shows the overview's getting-started list (signed out, nothing set up).
 * `?update` opens the update dialog as if the startup check found a version (`?update=nonotes`
 * without its notes); `?opened` opens a theme file as if Chatto was launched with one (#39, #40).
 */
/** What the update dialog shows in the browser preview (`?update`). */
const PREVIEW_UPDATE_NOTES: UpdateNote[] = [
  {
    version: 'v0.4.0',
    date: '2026-11-20',
    sections: [
      {
        kind: 'new',
        items: [
          {
            en: 'A dialog shows what is new when an update is out',
            'zh-TW': '有新版本時用對話框顯示更新內容',
            ja: '新しいバージョンが出たら、更新内容をダイアログで表示',
          },
          {
            en: 'Double-click a `.chattotheme` file to import it',
            'zh-TW': '雙擊 `.chattotheme` 檔就能匯入主題',
            ja: '`.chattotheme` ファイルをダブルクリックしてテーマをインポート',
          },
        ],
      },
      {
        kind: 'fixed',
        items: [
          {
            en: 'Previews match OBS again',
            'zh-TW': '預覽和 OBS 再次一致',
            ja: 'プレビューが OBS と同じ表示に戻りました',
          },
        ],
      },
    ],
  },
  {
    version: 'v0.3.2',
    date: '2026-11-12',
    sections: [
      { kind: 'improved', items: [{ en: 'Faster startup', 'zh-TW': '啟動更快', ja: '起動が速くなりました' }] },
    ],
  },
];

function createMockApi(): ChattoApi {
  const params = new URLSearchParams(location.search);
  let state: AppState = {
    appInfo: { version: '0.1.0', platform: 'web' },
    update: { status: 'not-available' },
    window: { maximized: false },
    prefs: {
      uiMode: params.has('compact') ? 'compact' : 'full',
      appearance: 'system',
      closeToTray: true,
      launchAtLogin: false,
      editorCommand: '',
      locale: params.get('lang') === 'en' ? 'en' : params.get('lang') === 'ja' ? 'ja' : 'zh-TW',
      chatLocale: 'auto',
      obsPluginPromptDismissed: false,
      skippedUpdateVersion: '',
      // The mock is a set-up account; `?onboarding` shows the getting-started list (#54).
      onboardingDismissed: !params.has('onboarding'),
      visitedThemes: false,
      visitedAlerts: false,
    },
    clientId: { source: 'built-in', hasBuiltIn: true },
    auth: { status: 'signed-in', login: 'shiraine_ciel', redemptionScope: true },
    channel: { login: 'shiraine_ciel', state: 'connected' },
    overlay: { enabled: true, editing: false, look: DEFAULT_OVERLAY_LOOK },
    alertsOverlay: { enabled: false, editing: false, look: DEFAULT_OVERLAY_LOOK },
    alerts: defaultAlertSettings(),
    server: { port: 4820, embedUrl: 'http://127.0.0.1:4820/embed', overlayUrl: 'http://127.0.0.1:4820/overlay' },
    themes: PRESET_THEMES,
    selectedThemes: { overlay: 'matcha-glass', embed: 'washi', alerts: 'bubble' },
    share: { session: { status: 'signed-out' }, termsAccepted: 0 },
    openedThemeFiles: params.has('opened')
      ? [
          { id: 'opened-1', fileName: 'Bubble.chattotheme', theme: { ...PRESET_THEMES[2]!, id: 'shared-bubble' } },
          { id: 'opened-2', fileName: 'broken.chattotheme', error: 'Not a valid theme package' },
        ]
      : [],
    chatPaused: false,
    shortcuts: { bindings: emptyShortcuts(), failed: [] },
  };
  if (params.has('onboarding')) {
    state.auth = { status: 'signed-out' };
    state.channel = { state: 'idle' };
    state.selectedThemes = { overlay: 'matcha-glass', embed: 'matcha-glass', alerts: 'matcha-glass' };
  }
  if (params.has('update')) {
    state.update = {
      status: 'available',
      version: '0.4.0',
      prompt: true,
      notes: params.get('update') === 'nonotes' ? null : PREVIEW_UPDATE_NOTES,
    };
  }
  const stateListeners = new Set<(state: AppState) => void>();
  const chatListeners = new Set<(item: LoggedChatEvent) => void>();
  // The session log the main process keeps; chat goes through it like the real IPC.
  const log = new ControlLog();
  const soundListeners = new Set<(sound: SoundSetting) => void>();
  const cssFileListeners = new Set<(change: CssFileChange) => void>();
  const exportedPackages: ChatTheme[] = [];
  const set = (patch: Partial<AppState>) => {
    state = { ...state, ...patch };
    stateListeners.forEach((listener) => listener(state));
  };
  const emitChat = (event: ChatEvent) => {
    const item = log.receive(event);
    chatListeners.forEach((listener) => listener(item));
  };
  const saveTheme = (theme: ChatTheme) => {
    const exists = state.themes.some((item) => item.id === theme.id);
    set({
      themes: exists
        ? state.themes.map((item) => (item.id === theme.id ? theme : item))
        : [...state.themes, { ...theme, builtIn: false }],
    });
  };

  // Theme sharing runs in the page against the fake service; the signed-in account moderates it.
  let termsAccepted = 0;
  let sessionToken: string | null = null;
  const share = new ShareClient({
    // The fake sign-in has no browser step; it just takes a moment, so the waiting state shows.
    backend: createFakeShareBackend({ moderator: true, signInDelay: params.has('e2e') ? 600 : 1200 }),
    session: {
      load: async () => sessionToken,
      save: async (token) => void (sessionToken = token),
      clear: async () => void (sessionToken = null),
    },
    clientId: () => 'web-preview',
    termsAccepted: () => termsAccepted,
    setTermsAccepted: (version) => void (termsAccepted = version),
    openExternal: (url) => void window.open(url, '_blank'),
    themes: () => state.themes,
    saveTheme,
    // The browser preview has no asset folder: images live in memory, and themes installed with
    // `asset:` images show without them. Seed themes keep their images as data URLs.
    assets: createMemoryAssets(),
    onChange: () => set({ share: share.state() }),
  });

  if (params.has('e2e')) {
    window.__chattoMock = {
      emitChat,
      setState: set,
      getState: () => state,
      exportedPackages: () => exportedPackages,
      playAlertSound: (sound) => soundListeners.forEach((listener) => listener(sound)),
      changeCssFile: (change) => cssFileListeners.forEach((listener) => listener(change)),
    };
  }

  // Installed and current, so the title bar has no OBS prompt unless a test asks for one (`?obsPlugin=<state>`).
  let obsPluginStatus: ObsPluginStatus = {
    state: (params.get('obsPlugin') as ObsPluginStatus['state'] | null) ?? 'installed',
    obsFound: true,
  };
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
    getControlLog: async () => log.snapshot(),
    clearChatLog: async () => log.clearChat(),
    dismissRedemption: async (key) => log.dismissRedemption(key),
    setUnsavedWork: async () => undefined,
    windowMinimize: async () => undefined,
    windowToggleMaximize: async () => set({ window: { maximized: !state.window.maximized } }),
    windowClose: async () => undefined,
    setPrefs: async (patch) => set({ prefs: { ...state.prefs, ...patch } }),
    setClientId: async (clientId) => {
      const { hasBuiltIn } = state.clientId;
      const source = clientId.trim() ? 'custom' : hasBuiltIn ? 'built-in' : 'none';
      // Like the app, a different Client ID signs the account out.
      set({ clientId: { source, hasBuiltIn }, auth: { status: 'signed-out' } });
    },
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
      setTimeout(() => set({ auth: { status: 'signed-in', login: 'shiraine_ciel', redemptionScope: true } }), 4000);
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
    setOverlayLook: async (window, look) => {
      const key = window === 'overlay' ? 'overlay' : 'alertsOverlay';
      set({ [key]: { ...state[key], look: normalizeOverlayLook(look) } });
    },
    // The browser preview cannot copy files; pretend the user cancelled.
    importSound: async () => null,
    selectTheme: async (target, themeId) => set({ selectedThemes: { ...state.selectedThemes, [target]: themeId } }),
    saveTheme: async (theme) => saveTheme(theme),
    deleteTheme: async (themeId) => set({ themes: state.themes.filter((item) => item.id !== themeId) }),
    // The browser preview has no asset folder: frames keep the picked image as a data URL.
    importThemeAsset: () => pickImageAsDataUrl(),
    // The browser preview cannot build packages; e2e tests read what would have been saved.
    exportThemePackage: async (theme) => {
      if (!params.has('e2e')) return false;
      exportedPackages.push(theme);
      return true;
    },
    importThemePackage: async () => {
      throw new Error('Theme packages are not supported in the web preview. Import them in the desktop app.');
    },
    // The browser preview has no files; report where the desktop app would put it.
    openCssFile: async (themeId) => ({
      launched: 'none',
      path: `%APPDATA%\\Chatto\\custom-css\\${themeId}.css`,
    }),
    onCssFileChanged: (listener) => (cssFileListeners.add(listener), () => cssFileListeners.delete(listener)),
    openExternal: async (url) => void window.open(url, '_blank'),
    // The browser preview cannot touch OBS; the plugin is only pretended to be installed.
    getObsPluginStatus: async () => obsPluginStatus,
    installObsPlugin: async () => {
      obsPluginStatus = { ...obsPluginStatus, state: 'installed' };
      return { ok: true, status: obsPluginStatus };
    },
    uninstallObsPlugin: async () => {
      obsPluginStatus = { ...obsPluginStatus, state: 'not-installed' };
      return { ok: true, status: obsPluginStatus };
    },
    // Pretends a newer version is always out, so the whole update flow can be tried in the browser.
    checkForUpdate: async () => {
      set({ update: { status: 'checking' } });
      setTimeout(() => set({ update: { status: 'available', version: '0.2.0' } }), 500);
    },
    downloadUpdate: async () => {
      const version = state.update.version;
      const step = (percent: number) => {
        if (percent >= 100) return set({ update: { status: 'downloaded', version } });
        set({ update: { status: 'downloading', version, percent } });
        setTimeout(() => step(percent + 25), 300);
      };
      step(0);
    },
    installUpdate: async () => undefined,
    dismissUpdatePrompt: async (skip) => {
      const { version } = state.update;
      if (skip && version) set({ prefs: { ...state.prefs, skippedUpdateVersion: version } });
      set({ update: { ...state.update, prompt: false } });
    },
    dismissOpenedThemeFile: async (id) =>
      set({ openedThemeFiles: state.openedThemeFiles.filter((file) => file.id !== id) }),
    setChatPaused: async (chatPaused) => set({ chatPaused }),
    clearChatOnScreen: async () => undefined,
    // The browser cannot take global keys; Ctrl+Alt+Delete stands in for keys another app holds.
    setShortcut: async (action, accelerator) => {
      const other = duplicateOf(state.shortcuts.bindings, action, accelerator);
      if (other) return { ok: false, reason: 'duplicate', action: other };
      if (accelerator === 'Ctrl+Alt+Delete') return { ok: false, reason: 'unavailable' };
      set({ shortcuts: { ...state.shortcuts, bindings: { ...state.shortcuts.bindings, [action]: accelerator } } });
      return { ok: true };
    },
    share: (method, ...args) => {
      const call = share[method] as (...params: unknown[]) => unknown;
      return Promise.resolve(call.apply(share, args)) as never;
    },
    // The browser cannot capture the page; published themes get no thumbnail here.
    // The browser preview has no log or files; e2e tests see the export as saved.
    exportDiagnostics: async () => params.has('e2e'),
    revealDiagnostics: async () => undefined,
    captureThumbnail: async () => null,
  };
}

/** Browser-only stand-in for the asset picker: reads the chosen image as a data URL. */
function pickImageAsDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/webp,image/gif';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export const api: ChattoApi = window.chatto ?? createMockApi();
export const isMockApi = !window.chatto;
