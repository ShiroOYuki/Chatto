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
import { hasRedemptionScope, TwitchChatProvider, type TwitchIdentity } from '@chatto/provider-twitch';
import { app, nativeTheme } from 'electron';
import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import type {
  AppPrefs,
  AppState,
  CssFileChange,
  CssFileOpenResult,
  DeviceCodeInfo,
  OpenedThemeFile,
  OverlayWindowId,
  UpdateState,
} from '../shared/ipc';
import { normalizeOverlayLook, type OverlayLook } from '../shared/overlayLook';
import {
  duplicateOf,
  emptyShortcuts,
  type ShortcutAction,
  type ShortcutBindings,
  type ShortcutResult,
} from '../shared/shortcuts';
import { OutputFeed } from './output-feed';
import type { GlobalShortcuts } from './shortcuts';
import type { ShareClient } from '../shared/share/client';
import { isRedemption } from '@chatto/chat-ui/events';
import { alertCue, markAfterSilence, SilenceTracker } from './alerts';
import { ChatHub } from './chat-hub';
import type { CssFiles } from './css-files';
import type { LocalServer, Routed, ThemeSummary } from './server';
import type { OverlayWindow } from './overlay-window';
import { mainMessages, type MainMessages } from './messages';
import { normalizePrefs, type SettingsStore } from './settings';
import { MAX_ASSET_BYTES, type ThemeAssets } from './theme-assets';
import { packTheme, themeAssetFiles, unpackTheme } from './theme-package';
import { SafeTokenStore } from './token-store';

const signedIn = (identity: TwitchIdentity): AppState['auth'] => ({
  status: 'signed-in',
  login: identity.login,
  redemptionScope: hasRedemptionScope(identity.scopes),
});

/**
 * Owns the app's runtime state and is the only place that mutates it.
 * IPC handlers call into this class; it notifies the renderer via `onChange`.
 */
export class AppController {
  readonly hub = new ChatHub();
  /** What the overlays and OBS get: the hub, unless paused or cleared (#53). */
  readonly output = new OutputFeed(this.hub);
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
  /** Theme sharing; supplied by index.ts. */
  share?: ShareClient;
  onChange: (state: AppState) => void = () => undefined;
  /** Plays a reminder sound in the control panel (it runs even when no overlay is open). */
  onAlertSound: (sound: SoundSetting) => void = () => undefined;
  /** Rebuilds native surfaces (tray menu) in the interface language; supplied by index.ts. */
  onLocaleChange: (locale: Locale) => void = () => undefined;
  /** Supplied by index.ts, which owns the main window. */
  isWindowMaximized: () => boolean = () => false;
  /** Supplied by index.ts, which owns the app updater. */
  updateState: () => UpdateState = () => ({ status: 'unsupported' });
  /** Supplied by index.ts: theme files opened from Windows, waiting to be confirmed (#40). */
  openedThemeFiles: () => OpenedThemeFile[] = () => [];
  /** System-wide shortcuts; supplied by index.ts (Electron's globalShortcut). */
  shortcuts?: GlobalShortcuts;

  /** `builtInClientId` is the Twitch Client ID baked into this build, used unless the user set their own. */
  constructor(
    private readonly settings: SettingsStore,
    private readonly builtInClientId = '',
  ) {}

  async init(): Promise<void> {
    this.#applyPrefs(this.settings.get().prefs);
    this.#createProvider();
    const identity = await this.#provider?.auth.currentIdentity();
    if (identity) this.#auth = signedIn(identity);
    const { channelLogin, overlay, alertsOverlay } = this.settings.get();
    this.overlay.setLook(overlay.look);
    this.alertsOverlay.setLook(alertsOverlay.look);
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

  /**
   * The theme a viewer gets: `themeId` when given and it exists (an OBS source
   * with its own theme), otherwise the target's selected theme. Built-in
   * themes speak the chat language.
   */
  themeFor(target: ViewerTarget, themeId?: string): ChatTheme {
    const themes = this.themes();
    const id = this.settings.get().selectedThemes[target];
    const theme =
      (themeId ? themes.find((item) => item.id === themeId) : undefined) ??
      themes.find((item) => item.id === id) ??
      PRESET_THEMES[0]!;
    return localizeTheme(theme, this.chatLocale());
  }

  /** Every theme's id and name in the interface language, for the OBS plugin's theme picker. */
  themeSummaries(): ThemeSummary[] {
    const locale = this.settings.get().prefs.locale;
    return this.themes().map((theme) => ({ id: theme.id, name: localizeTheme(theme, locale).name }));
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
      update: this.updateState(),
      window: { maximized: this.isWindowMaximized() },
      prefs: settings.prefs,
      clientId: {
        source: settings.twitchClientId ? 'custom' : this.builtInClientId ? 'built-in' : 'none',
        hasBuiltIn: Boolean(this.builtInClientId),
      },
      auth: this.#auth,
      channel: { ...this.#channel, login: settings.channelLogin || undefined },
      overlay: { enabled: this.overlay.isOpen, editing: this.overlay.editing, look: settings.overlay.look },
      alertsOverlay: {
        enabled: this.alertsOverlay.isOpen,
        editing: this.alertsOverlay.editing,
        look: settings.alertsOverlay.look,
      },
      alerts: settings.alerts,
      server: { port: this.server.port, embedUrl: this.server.url('embed'), overlayUrl: this.server.url('overlay') },
      themes: this.themes(),
      selectedThemes: settings.selectedThemes,
      share: this.share?.state() ?? {
        session: { status: 'signed-out' },
        termsAccepted: settings.share.termsAccepted,
      },
      openedThemeFiles: this.openedThemeFiles(),
      chatPaused: this.output.paused,
      shortcuts: { bindings: this.#shortcutBindings(), failed: this.shortcuts?.failed ?? [] },
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
      this.server.refreshThemes();
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

  /** The Client ID in use: the user's own, else the built-in one, else empty. */
  #clientId(): string {
    return this.settings.get().twitchClientId || this.builtInClientId;
  }

  /** Saves the user's own Client ID; an empty one (or the built-in one) goes back to the built-in ID. */
  async setClientId(clientId: string): Promise<void> {
    const before = this.#clientId();
    const custom = clientId.trim();
    this.settings.update((draft) => {
      draft.twitchClientId = custom === this.builtInClientId ? '' : custom;
    });
    if (this.#clientId() !== before) {
      // A token belongs to the Client ID it was issued for, so a new ID means signing in again.
      this.cancelSignIn();
      if (this.#auth.status === 'signed-in') await this.signOut();
      this.#createProvider();
    }
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
      this.#auth = signedIn(identity);
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
    const clientId = this.#clientId();
    if (!clientId) {
      this.#provider = null;
      return;
    }
    this.#provider = new TwitchChatProvider({
      clientId,
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
   * What each output receives. OBS gets everything as is, except redemptions
   * when the streamer keeps them off stream; the desktop chat overlay
   * additionally marks messages that broke a quiet spell (and can leave out
   * events the alert overlay shows); the alert overlay only gets events that
   * pass their alert rule, with a cue for duration and sound. Notices whose
   * chat message is the same event (`meta.shownAsMessage`) go nowhere.
   */
  route(target: ViewerTarget, event: ChatEvent): Routed {
    const { alerts } = this.settings.get();
    // The redemption's own chat message (a highlighted message) shows it already; only the control panel lists both.
    if (event.type === 'notice' && event.notice.meta.shownAsMessage === true) return null;
    if (target === 'embed' && event.type === 'notice' && isRedemption(event.notice) && !alerts.redemptions.showInObs) {
      return null;
    }
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

  // ---------- pause, clear and shortcuts (#53) ----------

  setChatPaused(paused: boolean): void {
    if (paused === this.output.paused) return;
    this.output.setPaused(paused);
    this.#emit();
  }

  /** Empties the chat on every overlay and OBS source; the control panel keeps its log. */
  clearChatOnScreen(): void {
    this.output.clear();
    this.server.broadcastClear();
  }

  #shortcutBindings(): ShortcutBindings {
    return this.settings.get().shortcuts ?? emptyShortcuts();
  }

  /** Saves a global shortcut once it is free: not used by another action, and Windows lets Chatto have it. */
  setShortcut(action: ShortcutAction, accelerator: string): ShortcutResult {
    const value = accelerator.trim();
    const other = value ? duplicateOf(this.#shortcutBindings(), action, value) : null;
    if (other) return { ok: false, reason: 'duplicate', action: other };
    if (this.shortcuts && !this.shortcuts.set(action, value)) return { ok: false, reason: 'unavailable' };
    this.settings.update((draft) => {
      draft.shortcuts = { ...this.#shortcutBindings(), [action]: value };
    });
    this.#emit();
    return { ok: true };
  }

  /** What a global shortcut does. */
  runShortcut(action: ShortcutAction): void {
    switch (action) {
      case 'toggleOverlay':
        return this.setOverlayEnabled(!this.overlay.isOpen);
      case 'toggleAlertsOverlay':
        return this.setAlertsOverlayEnabled(!this.alertsOverlay.isOpen);
      case 'toggleClickThrough': {
        // Both open windows move together: unlocked if either one is locked, otherwise back to click-through.
        const open = [this.overlay, this.alertsOverlay].filter((window) => window.isOpen);
        if (!open.length) return;
        const editing = !open.some((window) => window.editing);
        if (this.overlay.isOpen) this.overlay.setEditing(editing);
        if (this.alertsOverlay.isOpen) this.alertsOverlay.setEditing(editing);
        return this.#emit();
      }
      case 'togglePause':
        return this.setChatPaused(!this.output.paused);
      case 'clearChat':
        return this.clearChatOnScreen();
      default: {
        const unhandled: never = action;
        throw new Error(`Unknown shortcut ${String(unhandled)}`);
      }
    }
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
      redemptions: next.redemptions,
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

  /** A desktop window's backdrop and chat opacity. OBS never gets it: only the window is styled. */
  setOverlayLook(window: OverlayWindowId, look: OverlayLook): void {
    const next = normalizeOverlayLook(look);
    this.settings.update((draft) => {
      draft[window === 'overlay' ? 'overlay' : 'alertsOverlay'].look = next;
    });
    (window === 'overlay' ? this.overlay : this.alertsOverlay).setLook(next);
    this.#emit();
  }

  // ---------- themes ----------

  selectTheme(target: ViewerTarget, themeId: string): void {
    if (!this.themes().some((theme) => theme.id === themeId)) throw new Error(`Unknown theme ${themeId}`);
    this.settings.update((draft) => {
      draft.selectedThemes[target] = themeId;
    });
    this.server.refreshThemes();
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
    // Outputs and OBS sources that use this theme update live.
    this.server.refreshThemes();
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
    this.server.refreshThemes();
    this.#emit();
  }
}
