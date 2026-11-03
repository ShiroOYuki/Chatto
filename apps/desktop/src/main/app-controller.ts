import {
  chatLocaleOf,
  noticeGroup,
  assetFileOf,
  assetSrc,
  SILENCE_THRESHOLD,
  VIEWER_TARGETS,
  type AlertSettings,
  type ChatEvent,
  type ChatMessage,
  type ChatNotice,
  type Locale,
  type ChatTheme,
  type ConnectionState,
  type SoundRef,
  type SoundSetting,
  type ViewerTarget,
} from '@chatto/core';
import { PRESET_THEMES, getPresetTheme, localizeTheme, mapThemeImages, normalizeTheme } from '@chatto/chat-ui/themes';
import { TwitchChatProvider } from '@chatto/provider-twitch';
import { app, nativeTheme } from 'electron';
import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import type { AppPrefs, AppState, CssFileChange, CssFileOpenResult, DeviceCodeInfo } from '../shared/ipc';
import { alertCue, markAfterSilence, SilenceTracker } from './alerts';
import { ChatHub } from './chat-hub';
import type { CssFiles } from './css-files';
import type { LocalServer, Routed } from './server';
import type { OverlayWindow } from './overlay-window';
import { mainMessages, type MainMessages } from './messages';
import { normalizePrefs, type SettingsStore } from './settings';
import { MAX_ASSET_BYTES, type ThemeAssets } from './theme-assets';
import { packTheme, themeAssetFiles, unpackTheme } from './theme-package';
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

  #silence = new SilenceTracker();
  /** Messages (by `${platform}:${id}`) that broke a quiet spell, recent ones only. */
  #afterSilence = new Set<string>();
  /** Batches (`noticeGroup` ids) whose lead notice already went out, recent ones only. */
  #announcedGroups = new Set<string>();

  server!: LocalServer;
  overlay!: OverlayWindow;
  /** The event alert overlay window. */
  alertsOverlay!: OverlayWindow;
  /** Keeps each custom theme's CSS in a file for external editors. */
  cssFiles?: CssFiles;
  /** Tells an open theme editor that a CSS file save already updated the theme. */
  onCssFileChanged: (change: CssFileChange) => void = () => undefined;
  /** Folder for user alert sounds, served by the local server. */
  soundsDir = '';
  /** Frame images used by themes, served by the local server. */
  assets!: ThemeAssets;
  onChange: (state: AppState) => void = () => undefined;
  /** Plays a reminder sound in the control panel (it runs even when no overlay is open). */
  onAlertSound: (sound: SoundSetting) => void = () => undefined;
  /** Rebuilds native surfaces (tray menu) in the interface language; supplied by index.ts. */
  onLocaleChange: (locale: Locale) => void = () => undefined;
  /** Supplied by index.ts, which owns the main window. */
  isWindowMaximized: () => boolean = () => false;

  constructor(private readonly settings: SettingsStore) {}

  async init(): Promise<void> {
    this.#applyPrefs(this.settings.get().prefs);
    this.#createProvider();
    const identity = await this.#provider?.auth.currentIdentity();
    if (identity) this.#auth = { status: 'signed-in', login: identity.login };
    const { channelLogin, overlay, alertsOverlay } = this.settings.get();
    if (overlay.enabled) this.overlay.open(overlay.bounds);
    if (alertsOverlay.enabled) this.alertsOverlay.open(alertsOverlay.bounds);
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

  /** A target's theme as viewers get it: built-in themes speak the chat language. */
  themeFor(target: ViewerTarget): ChatTheme {
    const id = this.settings.get().selectedThemes[target];
    const theme = this.themes().find((item) => item.id === id) ?? PRESET_THEMES[0]!;
    return localizeTheme(theme, this.chatLocale());
  }

  /** Main-process text (dialogs, tray, errors) in the interface language. */
  messages(): MainMessages {
    return mainMessages(this.settings.get().prefs.locale);
  }

  /** Language of event texts on the overlays and OBS. */
  chatLocale(): Locale {
    const { prefs } = this.settings.get();
    return chatLocaleOf(prefs.chatLocale, prefs.locale);
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
      alertsOverlay: { enabled: this.alertsOverlay.isOpen, editing: this.alertsOverlay.editing },
      alerts: settings.alerts,
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
    const before = this.chatLocale();
    const uiBefore = this.settings.get().prefs.locale;
    const next = this.settings.update((draft) => {
      draft.prefs = normalizePrefs({ ...draft.prefs, ...patch }, draft.prefs);
    });
    this.#applyPrefs(next.prefs);
    // The editor reference files are written in the interface language.
    if (next.prefs.locale !== uiBefore) this.cssFiles?.refreshReference();
    const locale = this.chatLocale();
    if (locale !== before) {
      // Event texts and built-in theme texts (the reminder label) follow the chat language.
      this.server.broadcastLocale(locale);
      for (const target of VIEWER_TARGETS) this.server.broadcastTheme(target, this.themeFor(target));
    }
    this.onLocaleChange(next.prefs.locale);
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
    this.#providerUnsubscribe = this.#provider.onEvent((event) => this.#receive(event));
  }

  /** Every provider event passes through here before reaching the hub. */
  #receive(event: ChatEvent): void {
    if (event.type === 'connection') {
      this.#setChannelState(event.state, event.detail);
      // Count the quiet spell from the moment chat opens, so a slow start still reminds.
      if (event.state === 'connected') this.#silence.reset(Date.now());
    }
    if (event.type === 'message') this.#checkSilence(event.message);
    if (event.type === 'notice') this.#trackGroup(event.notice);
    this.hub.publish(event);
  }

  #trackGroup(notice: ChatNotice): void {
    const group = noticeGroup(notice);
    if (!group?.lead) return;
    this.#announcedGroups.add(group.id);
    if (this.#announcedGroups.size > 100) this.#announcedGroups.delete(this.#announcedGroups.values().next().value!);
  }

  /** A gifted sub (or other batch member) whose batch already got its own alert card. */
  #isAnnouncedMember(event: ChatEvent): boolean {
    if (event.type !== 'notice') return false;
    const group = noticeGroup(event.notice);
    return group !== null && !group.lead && this.#announcedGroups.has(group.id);
  }

  #checkSilence(message: ChatMessage): void {
    const { silence } = this.settings.get().alerts;
    const display = this.themeFor('overlay').options;
    if (!this.#silence.observe(message, Date.now(), silence, display)) return;
    if (silence.flash) {
      this.#afterSilence.add(`${message.platform}:${message.id}`);
      if (this.#afterSilence.size > 200) this.#afterSilence.delete(this.#afterSilence.values().next().value!);
    }
    if (silence.sound.enabled) this.onAlertSound(silence.sound);
  }

  // ---------- outputs ----------

  /**
   * What each output receives. OBS gets everything as is; the desktop chat
   * overlay additionally marks messages that broke a quiet spell (and can leave
   * out events the alert overlay shows); the alert overlay only gets events
   * that pass their alert rule, with a cue for duration and sound.
   */
  route(target: ViewerTarget, event: ChatEvent): Routed {
    const { alerts } = this.settings.get();
    if (target === 'alerts') {
      if (event.type === 'connection') return null;
      if (event.type !== 'message' && event.type !== 'notice') return { event }; // moderation removes alerts too
      // One card per batch: "gifted 5 subs" alerts once, its 5 gifted subs do not queue their own.
      if (this.#isAnnouncedMember(event)) return null;
      const alert = alertCue(event, alerts.events);
      return alert ? { event, alert } : null;
    }
    if (target === 'overlay') {
      if (
        alerts.events.hideInChatOverlay &&
        this.alertsOverlay.isOpen &&
        (alertCue(event, alerts.events) || this.#isAnnouncedMember(event))
      ) {
        return null;
      }
      if (event.type === 'message' && this.#afterSilence.has(`${event.message.platform}:${event.message.id}`)) {
        return { event: { ...event, message: markAfterSilence(event.message) } };
      }
    }
    return { event };
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

  // ---------- alerts ----------

  setAlertSettings(next: AlertSettings): void {
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));
    const volume = (sound: SoundSetting): SoundSetting => ({
      ...sound,
      volume: Math.min(1, Math.max(0, sound.volume)),
    });
    const alerts: AlertSettings = {
      silence: {
        ...next.silence,
        thresholdSeconds: clamp(next.silence.thresholdSeconds, SILENCE_THRESHOLD.min, SILENCE_THRESHOLD.max),
        sound: volume(next.silence.sound),
      },
      events: {
        ...next.events,
        durationSeconds: clamp(next.events.durationSeconds, 1, 60),
        rules: Object.fromEntries(
          Object.entries(next.events.rules).map(([key, rule]) => [
            key,
            { ...rule, minimum: Math.max(0, Math.round(rule.minimum)), sound: volume(rule.sound) },
          ]),
        ),
      },
    };
    this.settings.update((draft) => {
      draft.alerts = alerts;
    });
    this.#emit();
  }

  /** Copies a user's audio file into the sounds folder under a fresh name. */
  importSound(file: string): SoundRef {
    const ext = extname(file).toLowerCase();
    if (!['.mp3', '.ogg', '.wav'].includes(ext)) throw new Error(`Unsupported sound file ${basename(file)}`);
    const id = `${randomUUID()}${ext}`;
    mkdirSync(this.soundsDir, { recursive: true });
    copyFileSync(file, join(this.soundsDir, id));
    return { kind: 'file', id, name: basename(file) };
  }

  setAlertsOverlayEnabled(enabled: boolean): void {
    if (enabled) this.alertsOverlay.open(this.settings.get().alertsOverlay.bounds);
    else this.alertsOverlay.close();
    this.settings.update((draft) => {
      draft.alertsOverlay.enabled = enabled;
    });
    this.#emit();
  }

  setAlertsOverlayEditing(editing: boolean): void {
    this.alertsOverlay.setEditing(editing);
    this.#emit();
  }

  resetAlertsOverlayBounds(): void {
    this.settings.update((draft) => {
      delete draft.alertsOverlay.bounds;
    });
    this.alertsOverlay.resetBounds();
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
    for (const target of VIEWER_TARGETS) {
      if (this.settings.get().selectedThemes[target] === theme.id) this.server.broadcastTheme(target, theme);
    }
    this.cssFiles?.write(theme.id, theme.customCss);
    this.#emit();
  }

  /** Opens the theme's saved custom CSS in the user's editor. */
  openCssFile(themeId: string): Promise<CssFileOpenResult> {
    if (!this.cssFiles) throw new Error('CSS files are not available');
    const theme = this.#customTheme(themeId);
    if (!theme) throw new Error(`Unknown custom theme ${themeId}`);
    return this.cssFiles.open(themeId, theme.customCss, this.settings.get().prefs.editorCommand);
  }

  /** A theme's CSS file was saved outside Chatto: save the theme so every output updates. */
  applyExternalCss(themeId: string, css: string): void {
    const theme = this.#customTheme(themeId);
    if (!theme || theme.customCss === css) return;
    this.saveTheme({ ...theme, customCss: css });
    this.onCssFileChanged({ themeId, css });
  }

  #customTheme(themeId: string): ChatTheme | undefined {
    return this.themes().find((theme) => theme.id === themeId && !getPresetTheme(theme.id));
  }

  // ---------- theme frame images ----------

  /** Copies an image file into the asset folder; returns the `asset:` source for a frame. */
  importThemeAsset(file: string): string {
    if (statSync(file).size > MAX_ASSET_BYTES) throw new Error(this.messages().errors.imageTooLarge);
    return assetSrc(this.assets.add(readFileSync(file)));
  }

  /** A theme package (`.chattotheme`) with the theme and every image it uses. */
  exportThemePackage(theme: ChatTheme): Uint8Array {
    return packTheme(theme, (file) => this.assets.read(file));
  }

  /**
   * Stores a package's images and returns its theme, normalized but not saved:
   * the control panel gives it a fresh id like any imported theme.
   */
  importThemePackage(bytes: Uint8Array): ChatTheme {
    const { theme, assets } = unpackTheme(bytes, this.messages());
    // Store by content: a renamed or tampered file ends up under its real hash or is rejected.
    const stored = new Map<string, string>();
    for (const [name, data] of assets) {
      try {
        stored.set(name, this.assets.add(data));
      } catch {
        // Not an image Chatto accepts; frames that use it are dropped below.
      }
    }
    return mapThemeImages(normalizeTheme(theme), (image) => {
      const file = assetFileOf(image.src);
      if (!file) return image;
      const kept = stored.get(file) ?? (this.assets.has(file) ? file : undefined);
      return kept ? { ...image, src: assetSrc(kept) } : null;
    });
  }

  /** Deletes images no saved theme uses. Run at startup, never while an editor may hold unsaved ones. */
  collectThemeAssets(): string[] {
    return this.assets.collect(new Set(this.themes().flatMap(themeAssetFiles)));
  }

  deleteTheme(themeId: string): void {
    this.cssFiles?.remove(themeId);
    this.settings.update((draft) => {
      draft.customThemes = draft.customThemes.filter((theme) => theme.id !== themeId);
      for (const target of VIEWER_TARGETS) {
        if (draft.selectedThemes[target] === themeId) draft.selectedThemes[target] = PRESET_THEMES[0]!.id;
      }
    });
    this.#emit();
  }
}
