import {
  assetSrc,
  defaultAlertSettings,
  defaultEventAlertRule,
  type AlertSettings,
  type ChatEvent,
  type ChatTheme,
} from '@chatto/core';
import { createMockGiftBatch, mockMessage, MOCK_USERS, sampleEvent } from '@chatto/chat-ui';
import { DEFAULT_BOX_IMAGE, PRESET_THEMES } from '@chatto/chat-ui/themes';
import { strToU8, zipSync } from 'fflate';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceCodeInfo } from '../shared/ipc';
import type { Settings, SettingsStore } from './settings';
import type { LocalServer } from './server';
import type { OverlayWindow } from './overlay-window';
import type { CssFiles } from './css-files';
import { ThemeAssets } from './theme-assets';

vi.mock('electron', () => ({
  app: { getVersion: () => '0.1.0-test', isPackaged: false, setLoginItemSettings: vi.fn() },
  nativeTheme: { themeSource: 'system' },
}));
vi.mock('./token-store', () => ({ SafeTokenStore: class {} }));

/** Records every provider the controller creates, so tests can drive them. */
const created = vi.hoisted(() => ({
  providers: [] as FakeProvider[],
  /** Identity the next provider reports for a restored session. */
  identity: null as { login: string; userId: string } | null,
}));
interface FakeProvider {
  options: { clientId: string };
  auth: {
    currentIdentity: ReturnType<typeof vi.fn>;
    signIn: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
  resolveChannel: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  emit(event: ChatEvent): void;
}
vi.mock('@chatto/provider-twitch', () => ({
  TwitchChatProvider: class {
    #listeners = new Set<(event: ChatEvent) => void>();
    auth = {
      currentIdentity: vi.fn(async () => created.identity),
      signIn: vi.fn(),
      signOut: vi.fn(async () => undefined),
    };
    resolveChannel = vi.fn(async (login: string) => ({ platform: 'twitch', channelId: '42', login }));
    connect = vi.fn(async () => undefined);
    disconnect = vi.fn(async () => undefined);
    constructor(readonly options: { clientId: string }) {
      created.providers.push(this as unknown as FakeProvider);
    }
    onEvent(listener: (event: ChatEvent) => void) {
      this.#listeners.add(listener);
      return () => this.#listeners.delete(listener);
    }
    emit(event: ChatEvent) {
      this.#listeners.forEach((listener) => listener(event));
    }
  },
}));

const { AppController } = await import('./app-controller');

function fakeSettings(initial: Partial<Settings> = {}) {
  let data: Settings = {
    twitchClientId: 'client-id',
    channelLogin: '',
    serverPort: 4820,
    overlay: { enabled: false },
    alertsOverlay: { enabled: false },
    alerts: defaultAlertSettings(),
    selectedThemes: { overlay: 'matcha-glass', embed: 'matcha-glass', alerts: 'matcha-glass' },
    customThemes: [],
    prefs: { uiMode: 'full', appearance: 'system', closeToTray: true, launchAtLogin: false, editorCommand: '' },
    ...initial,
  };
  return {
    path: '',
    get: () => data,
    update: (patch: (draft: Settings) => void) => {
      const draft = structuredClone(data);
      patch(draft);
      data = draft;
      return draft;
    },
  } as unknown as SettingsStore;
}

function setup(initial?: Partial<Settings>) {
  const settings = fakeSettings(initial);
  const controller = new AppController(settings);
  const server = {
    port: 4820,
    url: (target: string) => `http://127.0.0.1:4820/${target}`,
    broadcastTheme: vi.fn(),
  };
  const fakeWindow = () => {
    let open = false;
    return {
      get isOpen() {
        return open;
      },
      editing: false,
      open: vi.fn(() => void (open = true)),
      close: vi.fn(() => void (open = false)),
      setEditing: vi.fn(),
      resetBounds: vi.fn(),
    };
  };
  const overlay = fakeWindow();
  const alertsOverlay = fakeWindow();
  controller.server = server as unknown as LocalServer;
  controller.overlay = overlay as unknown as OverlayWindow;
  controller.alertsOverlay = alertsOverlay as unknown as OverlayWindow;
  const onChange = vi.fn();
  controller.onChange = onChange;
  const onAlertSound = vi.fn();
  controller.onAlertSound = onAlertSound;
  return { controller, settings, server, overlay, alertsOverlay, onChange, onAlertSound };
}

const customTheme = (id = 'my-theme'): ChatTheme => ({
  ...structuredClone(PRESET_THEMES[0]!),
  id,
  name: '我的主題',
  builtIn: false,
});

const latestProvider = () => created.providers.at(-1)!;

beforeEach(() => {
  created.providers.length = 0;
  created.identity = null;
});

describe('AppController themes', () => {
  it('lists presets followed by custom themes and drops ones it cannot read', () => {
    const { controller } = setup({
      customThemes: [customTheme(), { schemaVersion: 999, id: 'broken' } as unknown as ChatTheme],
    });
    const ids = controller.themes().map((theme) => theme.id);
    expect(ids.slice(0, PRESET_THEMES.length)).toEqual(PRESET_THEMES.map((theme) => theme.id));
    expect(ids).toContain('my-theme');
    expect(ids).not.toContain('broken');
  });

  it('falls back to the first preset when the selected theme no longer exists', () => {
    const { controller } = setup({ selectedThemes: { overlay: 'gone', embed: 'washi', alerts: 'washi' } });
    expect(controller.themeFor('overlay').id).toBe(PRESET_THEMES[0]!.id);
    expect(controller.themeFor('embed').id).toBe('washi');
  });

  it('selects a theme, persists it and pushes it to that target only', () => {
    const { controller, settings, server } = setup();
    controller.selectTheme('embed', 'washi');
    expect(settings.get().selectedThemes.embed).toBe('washi');
    expect(server.broadcastTheme).toHaveBeenCalledWith('embed', expect.objectContaining({ id: 'washi' }));
    expect(() => controller.selectTheme('overlay', 'nope')).toThrow(/Unknown theme/);
  });

  it('refuses to overwrite a built-in theme', () => {
    const { controller } = setup();
    expect(() => controller.saveTheme(structuredClone(PRESET_THEMES[0]!))).toThrow(/read-only/);
  });

  it('saves custom themes in place and live-updates outputs that use them', () => {
    const { controller, settings, server } = setup({
      selectedThemes: { overlay: 'my-theme', embed: 'washi', alerts: 'washi' },
    });
    controller.saveTheme(customTheme());
    controller.saveTheme({ ...customTheme(), name: '改名' });

    expect(settings.get().customThemes).toHaveLength(1);
    expect(settings.get().customThemes[0]).toMatchObject({ id: 'my-theme', name: '改名', builtIn: false });
    expect(server.broadcastTheme).toHaveBeenCalledWith('overlay', expect.objectContaining({ name: '改名' }));
    expect(server.broadcastTheme).not.toHaveBeenCalledWith('embed', expect.anything());
  });

  it('resets outputs to the default theme when their theme is deleted', () => {
    const { controller, settings } = setup({
      customThemes: [customTheme()],
      selectedThemes: { overlay: 'my-theme', embed: 'washi', alerts: 'my-theme' },
    });
    controller.deleteTheme('my-theme');
    expect(settings.get().customThemes).toEqual([]);
    expect(settings.get().selectedThemes).toEqual({
      overlay: PRESET_THEMES[0]!.id,
      embed: 'washi',
      alerts: PRESET_THEMES[0]!.id,
    });
  });
});

describe('AppController theme frame images', () => {
  const PNG = new Uint8Array([0x89, ...Buffer.from('PNG\r\n\x1a\nframe')]);
  const withAssets = (initial?: Partial<Settings>) => {
    const context = setup(initial);
    context.controller.assets = new ThemeAssets(mkdtempSync(join(tmpdir(), 'chatto-assets-')));
    return context;
  };
  const framed = (src: string, id = 'framed'): ChatTheme => ({
    ...customTheme(id),
    message: { ...customTheme().message, box: { ...customTheme().message.box, image: { ...DEFAULT_BOX_IMAGE, src } } },
  });

  it('imports an image file as an asset source', () => {
    const { controller } = withAssets();
    const file = join(mkdtempSync(join(tmpdir(), 'chatto-pick-')), 'frame.png');
    writeFileSync(file, PNG);
    const src = controller.importThemeAsset(file);
    expect(src).toMatch(/^asset:[0-9a-f]{64}\.png$/);
    expect(controller.assets.has(src.slice('asset:'.length))).toBe(true);
  });

  it('exports and re-imports a theme with its images', () => {
    const source = withAssets();
    const src = assetSrc(source.controller.assets.add(PNG));
    const bytes = source.controller.exportThemePackage(framed(src));

    const target = withAssets();
    const imported = target.controller.importThemePackage(bytes);
    expect(imported.message.box.image?.src).toBe(src);
    expect(target.controller.assets.has(src.slice('asset:'.length))).toBe(true);
  });

  it('stores package images under their real hash and drops frames whose image is missing or invalid', () => {
    const { controller } = withAssets();
    const wrongName = `${'c'.repeat(64)}.png`;
    const missing = `${'d'.repeat(64)}.png`;
    const notImage = `${'e'.repeat(64)}.png`;
    const theme = {
      ...framed(assetSrc(wrongName)),
      body: {
        ...customTheme().body,
        box: { ...customTheme().body.box, image: { ...DEFAULT_BOX_IMAGE, src: assetSrc(missing) } },
      },
      roles: { vip: { frame: { ...DEFAULT_BOX_IMAGE, src: assetSrc(notImage) } } },
    };
    const bytes = zipSync({
      'theme.json': strToU8(JSON.stringify(theme)),
      [`assets/${wrongName}`]: PNG,
      [`assets/${notImage}`]: strToU8('<svg/>'),
    });
    const imported = controller.importThemePackage(bytes);
    const realName = controller.assets.add(PNG);
    expect(imported.message.box.image?.src).toBe(assetSrc(realName));
    expect(imported.body.box.image).toBeNull();
    expect(imported.roles.vip).toEqual({});
  });

  it('keeps images saved themes use and deletes the rest at startup', () => {
    const context = withAssets();
    const used = context.controller.assets.add(PNG);
    const unused = context.controller.assets.add(new Uint8Array([...Buffer.from('GIF89a-old')]));
    context.controller.saveTheme(framed(assetSrc(used)));
    expect(context.controller.collectThemeAssets()).toEqual([unused]);
    expect(context.controller.assets.has(used)).toBe(true);
  });
});

describe('AppController CSS files', () => {
  const withCssFiles = (initial?: Partial<Settings>) => {
    const context = setup(initial);
    const cssFiles = {
      open: vi.fn(async (_id: string, _css: string, _command: string) => ({ launched: 'editor', path: 'p' })),
      write: vi.fn(),
      remove: vi.fn(),
    };
    context.controller.cssFiles = cssFiles as unknown as CssFiles;
    const onCssFileChanged = vi.fn();
    context.controller.onCssFileChanged = onCssFileChanged;
    return { ...context, cssFiles, onCssFileChanged };
  };

  it('opens the saved CSS of a custom theme with the configured editor', async () => {
    const theme = { ...customTheme(), customCss: '.chatto-body {}' };
    const { controller, cssFiles } = withCssFiles({
      customThemes: [theme],
      prefs: {
        uiMode: 'full',
        appearance: 'system',
        closeToTray: true,
        launchAtLogin: false,
        editorCommand: 'notepad++',
      },
    });
    await controller.openCssFile('my-theme');
    expect(cssFiles.open).toHaveBeenCalledWith('my-theme', '.chatto-body {}', 'notepad++');
    expect(() => controller.openCssFile(PRESET_THEMES[0]!.id)).toThrow(/Unknown custom theme/);
  });

  it('saves the theme and updates its outputs when its file is saved outside Chatto', () => {
    const { controller, settings, server, onCssFileChanged } = withCssFiles({
      customThemes: [customTheme()],
      selectedThemes: { overlay: 'washi', embed: 'my-theme', alerts: 'washi' },
    });
    controller.applyExternalCss('my-theme', '.chatto-author { color: red; }');
    expect(settings.get().customThemes[0]!.customCss).toBe('.chatto-author { color: red; }');
    expect(server.broadcastTheme).toHaveBeenCalledWith(
      'embed',
      expect.objectContaining({ customCss: '.chatto-author { color: red; }' }),
    );
    expect(onCssFileChanged).toHaveBeenCalledWith({ themeId: 'my-theme', css: '.chatto-author { color: red; }' });
  });

  it('ignores files of unknown themes and unchanged CSS', () => {
    const { controller, server, onCssFileChanged } = withCssFiles({ customThemes: [customTheme()] });
    controller.applyExternalCss('gone', 'x');
    controller.applyExternalCss('my-theme', customTheme().customCss);
    expect(server.broadcastTheme).not.toHaveBeenCalled();
    expect(onCssFileChanged).not.toHaveBeenCalled();
  });

  it('writes saved CSS back to the file and deletes the file with the theme', () => {
    const { controller, cssFiles } = withCssFiles();
    controller.saveTheme({ ...customTheme(), customCss: 'a {}' });
    expect(cssFiles.write).toHaveBeenCalledWith('my-theme', 'a {}');
    controller.deleteTheme('my-theme');
    expect(cssFiles.remove).toHaveBeenCalledWith('my-theme');
  });
});

describe('AppController overlay', () => {
  it('opens and closes the overlay and remembers the choice', () => {
    const { controller, settings, overlay, onChange } = setup();
    controller.setOverlayEnabled(true);
    expect(overlay.open).toHaveBeenCalled();
    expect(settings.get().overlay.enabled).toBe(true);
    expect(controller.state().overlay.enabled).toBe(true);

    controller.setOverlayEnabled(false);
    expect(overlay.close).toHaveBeenCalled();
    expect(settings.get().overlay.enabled).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('forgets saved bounds on reset', () => {
    const { controller, settings, overlay } = setup({
      overlay: { enabled: true, bounds: { x: 1, y: 2, width: 3, height: 4 } },
    });
    controller.resetOverlayBounds();
    expect(settings.get().overlay.bounds).toBeUndefined();
    expect(overlay.resetBounds).toHaveBeenCalled();
  });

  it('reopens the overlay on launch when it was enabled', async () => {
    const { controller, overlay } = setup({ overlay: { enabled: true } });
    await controller.init();
    expect(overlay.open).toHaveBeenCalled();
  });
});

describe('AppController Twitch', () => {
  it('has no provider until a client id is configured', async () => {
    const { controller } = setup({ twitchClientId: '' });
    await controller.init();
    expect(created.providers).toHaveLength(0);
    expect(controller.state().clientIdConfigured).toBe(false);
    await expect(controller.connect('ciel')).rejects.toThrow(/Client ID/);
  });

  it('recreates the provider when the client id changes', async () => {
    const { controller, settings } = setup();
    await controller.init();
    const first = latestProvider();
    controller.setClientId('  new-id  ');
    expect(settings.get().twitchClientId).toBe('new-id');
    expect(first.disconnect).toHaveBeenCalled();
    expect(latestProvider().options.clientId).toBe('new-id');
  });

  it('runs the device flow and fills in the channel with the signed-in login', async () => {
    const { controller, settings } = setup();
    await controller.init();
    const prompt: DeviceCodeInfo = {
      userCode: 'ABCD',
      verificationUri: 'https://www.twitch.tv/activate',
      expiresAt: 0,
    };
    const seen: string[] = [];
    controller.onChange = (state) => seen.push(state.auth.status);
    latestProvider().auth.signIn.mockImplementation(async (onPrompt: (p: DeviceCodeInfo) => void) => {
      onPrompt(prompt);
      expect(controller.state().auth.deviceCode).toEqual(prompt);
      return { login: 'shiraine_ciel', userId: '1' };
    });
    const openUrl = vi.fn();

    await controller.signIn(openUrl);

    expect(openUrl).toHaveBeenCalledWith(prompt.verificationUri);
    expect(seen).toEqual(['pending', 'pending', 'signed-in']);
    expect(controller.state().auth).toEqual({ status: 'signed-in', login: 'shiraine_ciel' });
    expect(settings.get().channelLogin).toBe('shiraine_ciel');
  });

  it('reports a failed sign-in and lets it be cancelled', async () => {
    const { controller } = setup();
    await controller.init();
    latestProvider().auth.signIn.mockImplementation(
      (_onPrompt: unknown, signal: AbortSignal) =>
        new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')))),
    );
    const pending = controller.signIn(() => undefined);
    controller.cancelSignIn();
    await pending;
    expect(controller.state().auth).toEqual({ status: 'signed-out', error: 'cancelled' });
  });

  it('normalizes the channel login and surfaces connection errors', async () => {
    const { controller, settings } = setup();
    await controller.init();
    await controller.connect('  ShiRaine_Ciel ');
    expect(settings.get().channelLogin).toBe('shiraine_ciel');
    expect(latestProvider().connect).toHaveBeenCalledWith(expect.objectContaining({ channelId: '42' }));

    latestProvider().resolveChannel.mockRejectedValueOnce(new Error('Twitch channel "x" not found'));
    await expect(controller.connect('x')).rejects.toThrow(/not found/);
    expect(controller.state().channel).toMatchObject({ state: 'error', detail: 'Twitch channel "x" not found' });
  });

  it('forwards provider events to the hub and mirrors connection state', async () => {
    const { controller } = setup();
    await controller.init();
    const received: ChatEvent[] = [];
    controller.hub.subscribe((event) => received.push(event));

    latestProvider().emit({
      type: 'connection',
      platform: 'twitch',
      channelId: '42',
      state: 'reconnecting',
      detail: 'x',
    });

    expect(received).toHaveLength(1);
    expect(controller.state().channel).toMatchObject({ state: 'reconnecting', detail: 'x' });
  });

  it('restores the session and reconnects to the saved channel on launch', async () => {
    const { controller } = setup({ channelLogin: 'shiraine_ciel' });
    created.identity = { login: 'shiraine_ciel', userId: '1' };
    await controller.init();
    await vi.waitFor(() => expect(latestProvider().connect).toHaveBeenCalled());
    expect(controller.state().auth).toEqual({ status: 'signed-in', login: 'shiraine_ciel' });
  });

  it('disconnects before signing out', async () => {
    const { controller } = setup();
    await controller.init();
    await controller.signOut();
    expect(latestProvider().disconnect).toHaveBeenCalled();
    expect(latestProvider().auth.signOut).toHaveBeenCalled();
    expect(controller.state().auth.status).toBe('signed-out');
    expect(controller.state().channel.state).toBe('closed');
  });
});

describe('AppController preferences', () => {
  it('merges preference patches and applies the appearance', async () => {
    const { controller, settings } = setup();
    const { nativeTheme } = await import('electron');
    controller.setPrefs({ appearance: 'dark' });
    expect(settings.get().prefs).toMatchObject({ appearance: 'dark', uiMode: 'full' });
    expect(nativeTheme.themeSource).toBe('dark');
  });
});

/** Alert settings with the raid category switched off. */
const raidOff = (alerts: AlertSettings): AlertSettings => ({
  ...alerts,
  events: {
    ...alerts.events,
    rules: { ...alerts.events.rules, 'any:raid': { ...defaultEventAlertRule(), enabled: false } },
  },
});

describe('AppController alerts', () => {
  const say = (text: string): ChatEvent => ({
    type: 'message',
    message: mockMessage(MOCK_USERS[1]!, [{ type: 'text', text }]),
  });
  const connected: ChatEvent = { type: 'connection', platform: 'twitch', channelId: '42', state: 'connected' };

  it('marks the message that breaks a quiet spell for the desktop overlay only, and plays the reminder', async () => {
    vi.useFakeTimers({ now: 0 });
    try {
      const { controller, onAlertSound } = setup();
      await controller.init();
      latestProvider().emit(connected);
      vi.setSystemTime(10_000);
      const early = say('早安');
      latestProvider().emit(early);
      vi.setSystemTime(10_000 + 130_000);
      const late = say('有人在嗎');
      latestProvider().emit(late);

      const highlightsOf = (target: 'overlay' | 'embed', event: ChatEvent) => {
        const routed = controller.route(target, event)?.event;
        return routed?.type === 'message' ? routed.message.highlights : [];
      };
      expect(highlightsOf('overlay', early)).not.toContain('after-silence');
      expect(highlightsOf('overlay', late)).toContain('after-silence');
      expect(highlightsOf('embed', late)).not.toContain('after-silence');
      expect(onAlertSound).toHaveBeenCalledTimes(1);
      expect(onAlertSound).toHaveBeenCalledWith(defaultAlertSettings().silence.sound);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sends the alert overlay only events that pass their rule, with a cue', () => {
    const { controller } = setup();
    // Every event shows by default, silently.
    expect(controller.route('alerts', sampleEvent('twitch:raid'))?.alert).toEqual({ durationMs: 5000 });
    controller.setAlertSettings(raidOff(controller.state().alerts));
    expect(controller.route('alerts', sampleEvent('twitch:raid'))).toBeNull();
    expect(controller.route('alerts', say('hi'))).toBeNull();
    expect(controller.route('alerts', connected)).toBeNull();
    const deleted: ChatEvent = { type: 'message-deleted', platform: 'twitch', channelId: '42', messageId: 'x' };
    expect(controller.route('alerts', deleted)).toEqual({ event: deleted });
  });

  it('alerts a community gift once instead of once per gifted sub', async () => {
    const { controller, settings } = setup();
    await controller.init();
    const [lead, ...gifts] = createMockGiftBatch(3);
    const [, earlyGift] = createMockGiftBatch(1);
    // A gifted sub whose batch has not been announced still alerts on its own.
    latestProvider().emit(earlyGift!);
    expect(controller.route('alerts', earlyGift!)).not.toBeNull();

    latestProvider().emit(lead!);
    expect(controller.route('alerts', lead!)?.alert).toBeDefined();
    for (const gift of gifts) {
      latestProvider().emit(gift);
      expect(controller.route('alerts', gift)).toBeNull();
      // OBS still receives them; its feed merges them into the lead.
      expect(controller.route('embed', gift)).toEqual({ event: gift });
    }

    // With the chat overlay hiding alerted events, the gifted subs stay out of it too.
    const { alerts } = settings.get();
    controller.setAlertSettings({ ...alerts, events: { ...alerts.events, hideInChatOverlay: true } });
    controller.setAlertsOverlayEnabled(true);
    expect(controller.route('overlay', gifts[0]!)).toBeNull();
  });

  it('leaves alerted events out of the chat overlay only when asked and the alert overlay is open', () => {
    const { controller, settings } = setup();
    const raid = sampleEvent('twitch:raid');
    const { alerts } = settings.get();
    controller.setAlertSettings({ ...alerts, events: { ...alerts.events, hideInChatOverlay: true } });
    expect(controller.route('overlay', raid)).not.toBeNull();
    controller.setAlertsOverlayEnabled(true);
    expect(controller.route('overlay', raid)).toBeNull();
    expect(controller.route('embed', raid)).not.toBeNull();
  });

  it('clamps alert settings before saving them', () => {
    const { controller, settings, onChange } = setup();
    const alerts = defaultAlertSettings();
    controller.setAlertSettings({
      silence: { ...alerts.silence, thresholdSeconds: 5, sound: { ...alerts.silence.sound, volume: 3 } },
      events: {
        ...alerts.events,
        durationSeconds: 0,
        rules: { 'twitch:cheer': { enabled: true, minimum: -4, sound: alerts.silence.sound } },
      },
    });
    const saved = settings.get().alerts;
    expect(saved.silence.thresholdSeconds).toBe(30);
    expect(saved.silence.sound.volume).toBe(1);
    expect(saved.events.durationSeconds).toBe(1);
    expect(saved.events.rules['twitch:cheer']!.minimum).toBe(0);
    expect(onChange).toHaveBeenCalled();
  });

  it('opens the alert overlay and remembers it', async () => {
    const { controller, settings, alertsOverlay } = setup();
    controller.setAlertsOverlayEnabled(true);
    expect(alertsOverlay.open).toHaveBeenCalled();
    expect(settings.get().alertsOverlay.enabled).toBe(true);
    expect(controller.state().alertsOverlay.enabled).toBe(true);
    controller.resetAlertsOverlayBounds();
    expect(alertsOverlay.resetBounds).toHaveBeenCalled();
  });
});
