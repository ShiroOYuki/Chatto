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
import { DEFAULT_OVERLAY_LOOK } from '../shared/overlayLook';
import { emptyShortcuts } from '../shared/shortcuts';
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
  identity: null as { login: string; userId: string; scopes: string[] } | null,
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
vi.mock('@chatto/provider-twitch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@chatto/provider-twitch')>()),
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
    overlay: { enabled: false, look: DEFAULT_OVERLAY_LOOK },
    alertsOverlay: { enabled: false, look: DEFAULT_OVERLAY_LOOK },
    alerts: defaultAlertSettings(),
    selectedThemes: { overlay: 'matcha-glass', embed: 'matcha-glass', alerts: 'matcha-glass' },
    customThemes: [],
    prefs: {
      uiMode: 'full',
      appearance: 'system',
      closeToTray: true,
      launchAtLogin: false,
      editorCommand: '',
      locale: 'zh-TW',
      chatLocale: 'auto',
      obsPluginPromptDismissed: false,
      skippedUpdateVersion: '',
      onboardingDismissed: false,
      visitedThemes: false,
      visitedAlerts: false,
    },
    share: { clientId: 'client', termsAccepted: 0 },
    shortcuts: emptyShortcuts(),
    themeLibrary: { folders: [], folderOf: {}, collapsed: [] },
    themeTrash: [],
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

function setup(initial?: Partial<Settings>, builtInClientId = '') {
  const settings = fakeSettings(initial);
  const controller = new AppController(settings, builtInClientId);
  const server = {
    port: 4820,
    url: (target: string) => `http://127.0.0.1:4820/${target}`,
    refreshThemes: vi.fn(),
    broadcastLocale: vi.fn(),
    broadcastClear: vi.fn(),
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
      setLook: vi.fn(),
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

  it('selects a theme, persists it and pushes it to the outputs', () => {
    const { controller, settings, server } = setup();
    controller.selectTheme('embed', 'washi');
    expect(settings.get().selectedThemes.embed).toBe('washi');
    expect(controller.themeFor('embed').id).toBe('washi');
    expect(server.refreshThemes).toHaveBeenCalledOnce();
    expect(() => controller.selectTheme('overlay', 'nope')).toThrow(/Unknown theme/);
  });

  it("gives an OBS source its own theme, or the target's when that theme is gone", () => {
    const { controller } = setup({ customThemes: [customTheme()] });
    expect(controller.themeFor('embed', 'my-theme').id).toBe('my-theme');
    expect(controller.themeFor('embed', 'gone').id).toBe(controller.themeFor('embed').id);
  });

  it('lists theme ids and names in the interface language for the OBS plugin', () => {
    const { controller } = setup({ customThemes: [customTheme()] });
    controller.setPrefs({ locale: 'en' });
    const list = controller.themeSummaries();
    expect(list).toContainEqual({ id: 'washi', name: 'Washi Paper' });
    expect(list).toContainEqual({ id: 'my-theme', name: customTheme().name });
    expect(Object.keys(list[0]!)).toEqual(['id', 'name']);
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
    expect(controller.themeFor('overlay').name).toBe('改名');
    expect(server.refreshThemes).toHaveBeenCalledTimes(2);
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

  it('moves deleted themes to the trash and restores them into their folder (#41)', () => {
    const { controller, settings, onChange } = setup({
      customThemes: [customTheme('a'), customTheme('b')],
      themeLibrary: { folders: [{ id: 'f1', name: 'Games' }], folderOf: { a: 'f1' }, collapsed: [] },
      selectedThemes: { overlay: 'a', embed: 'washi', alerts: 'washi' },
    });
    controller.now = () => 1000;
    controller.deleteTheme('a');
    const [entry] = onChange.mock.lastCall![0].themeTrash;
    expect(entry).toMatchObject({ themeId: 'a', name: '我的主題', deletedAt: 1000, reason: 'deleted' });
    expect(settings.get().themeLibrary.folderOf).toEqual({});

    expect(controller.restoreTheme(entry.id)).toBe('a');
    expect(settings.get().customThemes.map((theme) => theme.id)).toEqual(['b', 'a']);
    expect(settings.get().themeLibrary.folderOf).toEqual({ a: 'f1' });
    expect(settings.get().themeTrash).toEqual([]);
    // Outputs that switched to the default theme stay there.
    expect(settings.get().selectedThemes.overlay).toBe(PRESET_THEMES[0]!.id);
  });

  it('refuses to delete built-in or unknown themes', () => {
    const { controller } = setup();
    expect(() => controller.deleteTheme(PRESET_THEMES[0]!.id)).toThrow(/Unknown custom theme/);
    expect(() => controller.deleteTheme('gone')).toThrow(/Unknown custom theme/);
  });

  it('purges, empties and expires the trash after 30 days', () => {
    const day = 86_400_000;
    const { controller, settings } = setup({ customThemes: [customTheme('a'), customTheme('b'), customTheme('c')] });
    controller.now = () => 0;
    controller.deleteTheme('a');
    controller.now = () => 20 * day;
    controller.deleteTheme('b');
    controller.deleteTheme('c');
    controller.purgeTrashedTheme(settings.get().themeTrash.find((entry) => entry.theme.id === 'c')!.id);
    controller.now = () => 31 * day;
    controller.expireThemeTrash();
    expect(settings.get().themeTrash.map((entry) => entry.theme.id)).toEqual(['b']);
    controller.emptyThemeTrash();
    expect(settings.get().themeTrash).toEqual([]);
  });

  it('files and orders themes in folders (#42)', () => {
    const { controller, settings, server } = setup({ customThemes: [customTheme('a'), customTheme('b')] });
    controller.updateThemeLibrary({ type: 'create-folder', id: 'f1', name: 'Games' });
    controller.updateThemeLibrary({ type: 'move-theme', themeId: 'a', folderId: 'f1', before: null });
    expect(settings.get().themeLibrary).toEqual({
      folders: [{ id: 'f1', name: 'Games' }],
      folderOf: { a: 'f1' },
      collapsed: [],
    });
    expect(settings.get().customThemes.map((theme) => theme.id)).toEqual(['b', 'a']);
    expect(server.refreshThemes).toHaveBeenCalledOnce();
    // Themes themselves never change, so installed ones stay unmodified.
    expect(settings.get().customThemes[1]).toEqual(customTheme('a'));
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

  it('keeps images of themes in the trash until they are purged (#41)', () => {
    const context = withAssets();
    const used = context.controller.assets.add(PNG);
    context.controller.saveTheme(framed(assetSrc(used)));
    context.controller.deleteTheme(framed(assetSrc(used)).id);
    expect(context.controller.collectThemeAssets()).toEqual([]);
    context.controller.emptyThemeTrash();
    expect(context.controller.collectThemeAssets()).toEqual([used]);
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
        locale: 'zh-TW',
        chatLocale: 'auto',
        obsPluginPromptDismissed: false,
        skippedUpdateVersion: '',
        onboardingDismissed: false,
        visitedThemes: false,
        visitedAlerts: false,
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
    expect(controller.themeFor('embed').customCss).toBe('.chatto-author { color: red; }');
    expect(server.refreshThemes).toHaveBeenCalled();
    expect(onCssFileChanged).toHaveBeenCalledWith({ themeId: 'my-theme', css: '.chatto-author { color: red; }' });
  });

  it('ignores files of unknown themes and unchanged CSS', () => {
    const { controller, server, onCssFileChanged } = withCssFiles({ customThemes: [customTheme()] });
    controller.applyExternalCss('gone', 'x');
    controller.applyExternalCss('my-theme', customTheme().customCss);
    expect(server.refreshThemes).not.toHaveBeenCalled();
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
      overlay: { enabled: true, bounds: { x: 1, y: 2, width: 3, height: 4 }, look: DEFAULT_OVERLAY_LOOK },
    });
    controller.resetOverlayBounds();
    expect(settings.get().overlay.bounds).toBeUndefined();
    expect(overlay.resetBounds).toHaveBeenCalled();
  });

  it('reopens the overlay on launch when it was enabled', async () => {
    const { controller, overlay } = setup({ overlay: { enabled: true, look: DEFAULT_OVERLAY_LOOK } });
    await controller.init();
    expect(overlay.open).toHaveBeenCalled();
  });

  it('gives each window its saved look on launch', async () => {
    const look = { color: '#1b2230', backgroundOpacity: 0.5, chatOpacity: 0.8 };
    const { controller, overlay, alertsOverlay } = setup({ overlay: { enabled: false, look } });
    await controller.init();
    expect(overlay.setLook).toHaveBeenCalledWith(look);
    expect(alertsOverlay.setLook).toHaveBeenCalledWith(DEFAULT_OVERLAY_LOOK);
  });

  it('saves and applies a look to the window it is for only', () => {
    const { controller, settings, overlay, alertsOverlay, server, onChange } = setup();
    controller.setOverlayLook('alerts', { color: '#FFFFFF', backgroundOpacity: 0.3, chatOpacity: 2 });
    const saved = { color: '#ffffff', backgroundOpacity: 0.3, chatOpacity: 1 };
    expect(settings.get().alertsOverlay.look).toEqual(saved);
    expect(settings.get().overlay.look).toEqual(DEFAULT_OVERLAY_LOOK);
    expect(alertsOverlay.setLook).toHaveBeenCalledWith(saved);
    expect(overlay.setLook).not.toHaveBeenCalled();
    expect(controller.state().alertsOverlay.look).toEqual(saved);
    // A window setting: nothing goes to the viewers, so OBS never sees it.
    expect(server.refreshThemes).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalled();
  });
});

describe('AppController Twitch', () => {
  it('has no provider until a client id is configured', async () => {
    const { controller } = setup({ twitchClientId: '' });
    await controller.init();
    expect(created.providers).toHaveLength(0);
    expect(controller.state().clientId).toEqual({ source: 'none', hasBuiltIn: false });
    await expect(controller.connect('ciel')).rejects.toThrow(/Client ID/);
  });

  it('recreates the provider when the client id changes', async () => {
    const { controller, settings } = setup();
    await controller.init();
    const first = latestProvider();
    await controller.setClientId('  new-id  ');
    expect(settings.get().twitchClientId).toBe('new-id');
    expect(first.disconnect).toHaveBeenCalled();
    expect(latestProvider().options.clientId).toBe('new-id');
  });

  it('uses the built-in client id until the user sets their own, and can go back to it', async () => {
    const { controller, settings } = setup({ twitchClientId: '' }, 'built-in-id');
    await controller.init();
    expect(latestProvider().options.clientId).toBe('built-in-id');
    expect(controller.state().clientId).toEqual({ source: 'built-in', hasBuiltIn: true });

    await controller.setClientId('own-id');
    expect(latestProvider().options.clientId).toBe('own-id');
    expect(controller.state().clientId.source).toBe('custom');

    await controller.setClientId('');
    expect(settings.get().twitchClientId).toBe('');
    expect(latestProvider().options.clientId).toBe('built-in-id');
    expect(controller.state().clientId.source).toBe('built-in');
  });

  it('does not store the built-in client id as the user’s own', async () => {
    const { controller, settings } = setup({ twitchClientId: '' }, 'built-in-id');
    await controller.init();
    const count = created.providers.length;
    await controller.setClientId(' built-in-id ');
    expect(settings.get().twitchClientId).toBe('');
    expect(created.providers).toHaveLength(count);
  });

  it('signs out when the client id in use changes, since the token belongs to the old one', async () => {
    created.identity = { login: 'ciel', userId: '1', scopes: ['user:read:chat'] };
    const { controller } = setup();
    await controller.init();
    const first = latestProvider();
    expect(controller.state().auth.status).toBe('signed-in');
    await controller.setClientId('new-id');
    expect(first.auth.signOut).toHaveBeenCalled();
    expect(controller.state().auth.status).toBe('signed-out');
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
      return { login: 'shiraine_ciel', userId: '1', scopes: ['user:read:chat', 'channel:read:redemptions'] };
    });
    const openUrl = vi.fn();

    await controller.signIn(openUrl);

    expect(openUrl).toHaveBeenCalledWith(prompt.verificationUri);
    expect(seen).toEqual(['pending', 'pending', 'signed-in']);
    expect(controller.state().auth).toEqual({ status: 'signed-in', login: 'shiraine_ciel', redemptionScope: true });
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
    // A token from before Chatto asked for redemptions still signs in; it just cannot read them.
    created.identity = { login: 'shiraine_ciel', userId: '1', scopes: ['user:read:chat'] };
    await controller.init();
    await vi.waitFor(() => expect(latestProvider().connect).toHaveBeenCalled());
    expect(controller.state().auth).toEqual({ status: 'signed-in', login: 'shiraine_ciel', redemptionScope: false });
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
  it('sends outputs the chat language and built-in themes in it', () => {
    const { controller, server } = setup();
    expect(controller.chatLocale()).toBe('zh-TW');
    expect(controller.themeFor('overlay').attention.label).toBe('新留言');

    controller.setPrefs({ locale: 'en' });
    expect(server.broadcastLocale).toHaveBeenLastCalledWith('en');
    expect(controller.themeFor('overlay').attention.label).toBe('New');
    expect(controller.themeFor('embed').name).toBe('Matcha Glass');
    expect(server.refreshThemes).toHaveBeenCalled();

    // A fixed chat language no longer follows the interface.
    controller.setPrefs({ chatLocale: 'zh-TW' });
    server.broadcastLocale.mockClear();
    controller.setPrefs({ locale: 'zh-TW' });
    controller.setPrefs({ locale: 'en' });
    expect(server.broadcastLocale).not.toHaveBeenCalled();
    expect(controller.chatLocale()).toBe('zh-TW');
  });

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

  it('shows redemptions everywhere unless the streamer keeps them out of OBS', () => {
    const { controller, settings } = setup();
    const redemption = sampleEvent('twitch:redemption');
    const auto = sampleEvent('twitch:auto-redemption');
    for (const target of ['overlay', 'embed', 'alerts'] as const) {
      expect(controller.route(target, redemption)?.event, target).toEqual(redemption);
      expect(controller.route(target, auto)?.event, target).toEqual(auto);
    }
    const { alerts } = settings.get();
    controller.setAlertSettings({ ...alerts, redemptions: { showInObs: false } });
    expect(settings.get().alerts.redemptions.showInObs).toBe(false);
    expect(controller.route('embed', redemption)).toBeNull();
    expect(controller.route('embed', auto)).toBeNull();
    expect(controller.route('overlay', redemption)).not.toBeNull();
    expect(controller.route('alerts', redemption)).not.toBeNull();
    expect(controller.route('embed', sampleEvent('twitch:raid'))).not.toBeNull();
  });

  it('one switch turns off alerts for both kinds of redemption', () => {
    const { controller, settings } = setup();
    const { alerts } = settings.get();
    controller.setAlertSettings({
      ...alerts,
      events: { ...alerts.events, rules: { 'twitch:redemption': { ...defaultEventAlertRule(), enabled: false } } },
    });
    expect(controller.route('alerts', sampleEvent('twitch:redemption'))).toBeNull();
    expect(controller.route('alerts', sampleEvent('twitch:auto-redemption'))).toBeNull();
    expect(controller.route('overlay', sampleEvent('twitch:redemption'))).not.toBeNull();
  });

  it('leaves out a redemption that reaches chat as its own message', () => {
    const { controller } = setup();
    const sample = sampleEvent('twitch:auto-redemption');
    if (sample.type !== 'notice') throw new Error('expected a notice');
    const highlighted: ChatEvent = {
      type: 'notice',
      notice: { ...sample.notice, meta: { ...sample.notice.meta, shownAsMessage: true } },
    };
    for (const target of ['overlay', 'embed', 'alerts'] as const)
      expect(controller.route(target, highlighted)).toBeNull();
  });

  it('clamps alert settings before saving them', () => {
    const { controller, settings, onChange } = setup();
    const alerts = defaultAlertSettings();
    controller.setAlertSettings({
      ...alerts,
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

describe('AppController shortcuts, pause and clear (#53)', () => {
  const message = (text: string): ChatEvent => ({
    type: 'message',
    message: mockMessage(MOCK_USERS[1]!, [{ type: 'text', text }]),
  });

  it('holds messages back from the outputs while paused, but not from the control panel', () => {
    const { controller, onChange } = setup();
    const outputs: ChatEvent[] = [];
    const panel: ChatEvent[] = [];
    controller.output.subscribe((event) => outputs.push(event));
    controller.hub.subscribe((event) => panel.push(event));
    controller.runShortcut('togglePause');
    expect(controller.state().chatPaused).toBe(true);
    expect(onChange).toHaveBeenCalled();
    controller.hub.publish(message('hi'));
    expect(panel).toHaveLength(1);
    expect(outputs).toHaveLength(0);
    controller.runShortcut('togglePause');
    expect(outputs).toHaveLength(1);
    expect(controller.state().chatPaused).toBe(false);
  });

  it('clears the outputs and tells every viewer', () => {
    const { controller, server } = setup();
    controller.hub.publish(message('hi'));
    controller.runShortcut('clearChat');
    expect(controller.output.backlog()).toEqual([]);
    expect(controller.hub.backlog()).toHaveLength(1);
    expect(server.broadcastClear).toHaveBeenCalled();
  });

  it('toggles the overlays and unlocks the open ones together', () => {
    const { controller, overlay, alertsOverlay } = setup();
    controller.runShortcut('toggleClickThrough');
    expect(overlay.setEditing).not.toHaveBeenCalled();
    controller.runShortcut('toggleOverlay');
    expect(overlay.open).toHaveBeenCalled();
    controller.runShortcut('toggleClickThrough');
    expect(overlay.setEditing).toHaveBeenCalledWith(true);
    expect(alertsOverlay.setEditing).not.toHaveBeenCalled();
    controller.runShortcut('toggleAlertsOverlay');
    expect(alertsOverlay.open).toHaveBeenCalled();
    controller.runShortcut('toggleOverlay');
    expect(overlay.close).toHaveBeenCalled();
  });

  it('saves a shortcut only when no other action has it and Windows lets Chatto take it', () => {
    const { controller, settings } = setup();
    const set = vi.fn((_action: string, accelerator: string) => accelerator !== 'Ctrl+Alt+Delete');
    controller.shortcuts = { set, failed: [] } as unknown as typeof controller.shortcuts;
    expect(controller.setShortcut('togglePause', 'Ctrl+Alt+P')).toEqual({ ok: true });
    expect(settings.get().shortcuts.togglePause).toBe('Ctrl+Alt+P');
    expect(controller.setShortcut('clearChat', 'ctrl+alt+p')).toEqual({
      ok: false,
      reason: 'duplicate',
      action: 'togglePause',
    });
    expect(controller.setShortcut('clearChat', 'Ctrl+Alt+Delete')).toEqual({ ok: false, reason: 'unavailable' });
    expect(settings.get().shortcuts.clearChat).toBe('');
    expect(controller.setShortcut('togglePause', '')).toEqual({ ok: true });
    expect(controller.state().shortcuts.bindings.togglePause).toBe('');
  });
});
