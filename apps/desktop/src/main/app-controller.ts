import type { ChatTheme, ConnectionState, ViewerTarget } from '@chatto/core';
import { PRESET_THEMES, getPresetTheme, normalizeTheme } from '@chatto/chat-ui/themes';
import { TwitchChatProvider } from '@chatto/provider-twitch';
import { app, nativeTheme } from 'electron';
import type { AppPrefs, AppState, DeviceCodeInfo } from '../shared/ipc';
import { ChatHub } from './chat-hub';
import type { LocalServer } from './server';
import type { OverlayWindow } from './overlay-window';
import type { SettingsStore } from './settings';
import { SafeTokenStore } from './token-store';

/**
 * Owns the app's runtime state and is the only place that mutates it.
 * IPC handlers call into this class; it notifies the renderer via `onChange`.
 */
export class AppController {
  readonly hub = new ChatHub();
  #provider: TwitchChatProvider | null = null;
  #providerUnsubscribe: (() => void) | null = null;
  #signInAbort: AbortController | null = null;

  #auth: AppState['auth'] = { status: 'signed-out' };
  #channel: AppState['channel'] = { state: 'idle' };

  server!: LocalServer;
  overlay!: OverlayWindow;
  onChange: (state: AppState) => void = () => undefined;
  /** Supplied by index.ts, which owns the main window. */
  isWindowMaximized: () => boolean = () => false;

  constructor(private readonly settings: SettingsStore) {}

  async init(): Promise<void> {
    this.#applyPrefs(this.settings.get().prefs);
    this.#createProvider();
    const identity = await this.#provider?.auth.currentIdentity();
    if (identity) this.#auth = { status: 'signed-in', login: identity.login };
    const { channelLogin, overlay } = this.settings.get();
    if (overlay.enabled) this.overlay.open(overlay.bounds);
    if (identity && channelLogin) void this.connect(channelLogin).catch(() => undefined);
  }

  // ---------- state ----------

  themes(): ChatTheme[] {
    const custom = this.settings.get().customThemes.flatMap((theme) => {
      try {
        return [normalizeTheme(theme)]; // migrates themes saved by older versions
      } catch {
        return [];
      }
    });
    return [...PRESET_THEMES, ...custom];
  }

  themeFor(target: ViewerTarget): ChatTheme {
    const id = this.settings.get().selectedThemes[target];
    return this.themes().find((theme) => theme.id === id) ?? PRESET_THEMES[0]!;
  }

  state(): AppState {
    const settings = this.settings.get();
    return {
      appInfo: { version: app.getVersion(), platform: process.platform },
      window: { maximized: this.isWindowMaximized() },
      prefs: settings.prefs,
      clientIdConfigured: Boolean(settings.twitchClientId),
      auth: this.#auth,
      channel: { ...this.#channel, login: settings.channelLogin || undefined },
      overlay: { enabled: this.overlay.isOpen, editing: this.overlay.editing },
      server: { port: this.server.port, embedUrl: this.server.url('embed'), overlayUrl: this.server.url('overlay') },
      themes: this.themes(),
      selectedThemes: settings.selectedThemes,
    };
  }

  /** Public so window events (maximize/restore) can push a fresh state. */
  emit(): void {
    this.onChange(this.state());
  }

  #emit(): void {
    this.emit();
  }

  // ---------- preferences ----------

  setPrefs(patch: Partial<AppPrefs>): void {
    const next = this.settings.update((draft) => {
      draft.prefs = { ...draft.prefs, ...patch };
    });
    this.#applyPrefs(next.prefs);
    this.#emit();
  }

  #applyPrefs(prefs: AppPrefs): void {
    // Keeps native surfaces (context menus, scrollbars) in step with the app theme.
    nativeTheme.themeSource = prefs.appearance;
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: prefs.launchAtLogin });
  }

  // ---------- auth ----------

  setClientId(clientId: string): void {
    this.settings.update((draft) => {
      draft.twitchClientId = clientId.trim();
    });
    this.#createProvider();
    this.#emit();
  }

  async signIn(openUrl: (url: string) => void): Promise<void> {
    if (!this.#provider) throw new Error('Twitch Client ID is not configured');
    this.#signInAbort?.abort();
    const abort = new AbortController();
    this.#signInAbort = abort;
    this.#auth = { status: 'pending' };
    this.#emit();
    try {
      const identity = await this.#provider.auth.signIn((prompt: DeviceCodeInfo) => {
        this.#auth = { status: 'pending', deviceCode: prompt };
        this.#emit();
        openUrl(prompt.verificationUri);
      }, abort.signal);
      this.#auth = { status: 'signed-in', login: identity.login };
      if (!this.settings.get().channelLogin) {
        this.settings.update((draft) => {
          draft.channelLogin = identity.login;
        });
      }
    } catch (error) {
      this.#auth = { status: 'signed-out', error: error instanceof Error ? error.message : String(error) };
    } finally {
      this.#signInAbort = null;
      this.#emit();
    }
  }

  cancelSignIn(): void {
    this.#signInAbort?.abort();
  }

  async signOut(): Promise<void> {
    await this.disconnect();
    await this.#provider?.auth.signOut();
    this.#auth = { status: 'signed-out' };
    this.#emit();
  }

  // ---------- chat ----------

  async connect(login: string): Promise<void> {
    if (!this.#provider) throw new Error('Twitch Client ID is not configured');
    this.settings.update((draft) => {
      draft.channelLogin = login.trim().toLowerCase();
    });
    this.#setChannelState('connecting');
    try {
      const channel = await this.#provider.resolveChannel(login);
      await this.#provider.connect(channel);
    } catch (error) {
      this.#setChannelState('error', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.#provider?.disconnect();
    this.#setChannelState('closed');
  }

  #setChannelState(state: ConnectionState, detail?: string): void {
    this.#channel = { state, detail };
    this.#emit();
  }

  #createProvider(): void {
    this.#providerUnsubscribe?.();
    void this.#provider?.disconnect();
    const { twitchClientId } = this.settings.get();
    if (!twitchClientId) {
      this.#provider = null;
      return;
    }
    this.#provider = new TwitchChatProvider({
      clientId: twitchClientId,
      tokenStore: new SafeTokenStore('twitch'),
    });
    this.#providerUnsubscribe = this.#provider.onEvent((event) => {
      if (event.type === 'connection') this.#setChannelState(event.state, event.detail);
      this.hub.publish(event);
    });
  }

  // ---------- overlay ----------

  setOverlayEnabled(enabled: boolean): void {
    if (enabled) this.overlay.open(this.settings.get().overlay.bounds);
    else this.overlay.close();
    this.settings.update((draft) => {
      draft.overlay.enabled = enabled;
    });
    this.#emit();
  }

  setOverlayEditing(editing: boolean): void {
    this.overlay.setEditing(editing);
    this.#emit();
  }

  resetOverlayBounds(): void {
    this.settings.update((draft) => {
      delete draft.overlay.bounds;
    });
    this.overlay.resetBounds();
    this.#emit();
  }

  // ---------- themes ----------

  selectTheme(target: ViewerTarget, themeId: string): void {
    if (!this.themes().some((theme) => theme.id === themeId)) throw new Error(`Unknown theme ${themeId}`);
    this.settings.update((draft) => {
      draft.selectedThemes[target] = themeId;
    });
    this.server.broadcastTheme(target, this.themeFor(target));
    this.#emit();
  }

  saveTheme(theme: ChatTheme): void {
    if (getPresetTheme(theme.id)) throw new Error('Built-in themes are read-only; duplicate it first');
    theme = normalizeTheme(theme);
    this.settings.update((draft) => {
      const index = draft.customThemes.findIndex((item) => item.id === theme.id);
      const stored = { ...theme, builtIn: false };
      if (index >= 0) draft.customThemes[index] = stored;
      else draft.customThemes.push(stored);
    });
    for (const target of ['overlay', 'embed'] as const) {
      if (this.settings.get().selectedThemes[target] === theme.id) this.server.broadcastTheme(target, theme);
    }
    this.#emit();
  }

  deleteTheme(themeId: string): void {
    this.settings.update((draft) => {
      draft.customThemes = draft.customThemes.filter((theme) => theme.id !== themeId);
      for (const target of ['overlay', 'embed'] as const) {
        if (draft.selectedThemes[target] === themeId) draft.selectedThemes[target] = PRESET_THEMES[0]!.id;
      }
    });
    this.#emit();
  }
}
