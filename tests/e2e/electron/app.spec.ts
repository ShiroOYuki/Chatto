import { decodeServerFrame, encodeFrame, PROTOCOL_VERSION, type ServerFrame } from '@chatto/core';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { PRESET_THEMES } from '@chatto/chat-ui/themes';
import { strToU8, zipSync } from 'fflate';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Drives the built desktop app (`npm run build` first) with an isolated
 * profile and its own server port, so it never touches the real settings or
 * a Chatto instance that is already running.
 */
const appDir = resolve(import.meta.dirname, '../../../apps/desktop');
const electronPath = createRequire(join(appDir, 'package.json'))('electron') as unknown as string;

let app: ElectronApplication;
let mainWindow: Page;
let userData: string;
let port: number;

/** A `.chattotheme` package with one theme, as Chatto exports it. */
function themePackage(path: string, name: string): string {
  const theme = { ...PRESET_THEMES[1]!, id: `file-${name}`, name, builtIn: false };
  writeFileSync(path, zipSync({ 'theme.json': strToU8(JSON.stringify(theme)) }));
  return path;
}

/** The environment every launch of the app under test gets. */
const appEnv = () => ({
  ...process.env,
  CHATTO_USER_DATA: userData,
  ELECTRON_RENDERER_URL: '',
  CHATTO_SHARE_API: 'fake',
});

test.beforeEach(async () => {
  userData = mkdtempSync(join(tmpdir(), 'chatto-e2e-'));
  port = 41000 + Math.floor(Math.random() * 10000);
  // A fixed language: a fresh profile would otherwise follow the machine's (English on CI runners).
  writeFileSync(
    join(userData, 'settings.json'),
    JSON.stringify({ serverPort: port, twitchClientId: '', prefs: { locale: 'zh-TW' } }),
  );
  // `[open-file]` tests start the app the way Windows does for a double-clicked theme file (#40).
  const opened = test.info().title.includes('[open-file]')
    ? [themePackage(join(userData, '雙擊的主題.chattotheme'), '雙擊的主題')]
    : [];
  app = await electron.launch({
    executablePath: electronPath,
    args: [appDir, ...opened],
    // The built app would talk to the real sharing service; tests keep to the in-memory fake.
    env: {
      ...appEnv(),
      // Tests about the tray release the hidden window quickly instead of after five minutes.
      CHATTO_TRAY_RELEASE_MS: test.info().title.includes('[tray]') ? '1500' : '',
      CHATTO_MINIMIZE_RELEASE_MS: test.info().title.includes('[minimize]') ? '1500' : '',
    },
  });
  mainWindow = await app.firstWindow();
  await mainWindow.waitForLoadState('domcontentloaded');
});

test.afterEach(async () => {
  await app.evaluate(({ app: electronApp }) => electronApp.exit(0)).catch(() => undefined);
  await app.close().catch(() => undefined);
  rmSync(userData, { recursive: true, force: true });
});

const settings = () => JSON.parse(readFileSync(join(userData, 'settings.json'), 'utf8'));
const windows = () =>
  app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().map((w) => ({
      url: w.webContents.getURL(),
      visible: w.isVisible(),
      alwaysOnTop: w.isAlwaysOnTop(),
      focusable: w.isFocusable(),
      bounds: w.getBounds(),
    })),
  );

test('opens the frameless control panel with the preload API', async () => {
  await expect(mainWindow.getByRole('navigation')).toBeVisible();
  await expect(mainWindow.getByRole('button', { name: /^總覽/ })).toHaveAttribute('aria-current', 'page');
  const exposed = await mainWindow.evaluate(() => Object.keys(window.chatto ?? {}).sort());
  expect(exposed).toContain('getState');
  // The renderer must never see tokens.
  const state = await mainWindow.evaluate(() => window.chatto!.getState());
  expect(JSON.stringify(state)).not.toMatch(/token/i);
  expect(state.server.port).toBe(port);
});

test('[tray] closes the hidden control panel to free memory and builds it again on open', async () => {
  await expect(mainWindow.getByRole('navigation')).toBeVisible();
  await mainWindow.evaluate(() => window.chatto!.windowClose());
  await expect.poll(async () => (await windows()).length, { timeout: 10_000 }).toBe(0);
  // The local server keeps serving OBS while the window is gone.
  expect((await fetch(`http://127.0.0.1:${port}/api/ping`)).status).toBe(200);

  // What a click on the tray icon or a second launch does.
  const reopened = app.waitForEvent('window');
  await app.evaluate(({ app: electronApp }) => electronApp.emit('second-instance'));
  const reopenedWindow = await reopened;
  await expect(reopenedWindow.getByRole('navigation')).toBeVisible();
  expect((await windows()).filter((w) => w.visible)).toHaveLength(1);

  const log = readFileSync(join(userData, 'logs', 'chatto.log'), 'utf8');
  expect(log).toContain('[window] control panel closed in the tray to free memory');
});

test('[minimize] rebuilds a window left minimized, still minimized and on the same page', async () => {
  await mainWindow.getByRole('navigation').getByRole('button', { name: /^主題/ }).click();
  await expect(mainWindow).toHaveURL(/page=themes/);
  const rebuilt = app.waitForEvent('window');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.minimize());
  const rebuiltWindow = await rebuilt;
  await expect.poll(async () => (await windows()).length, { timeout: 10_000 }).toBe(1);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.isMinimized())).toBe(true);
  expect((await windows())[0]!.url).toContain('page=themes');

  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.restore());
  await expect(rebuiltWindow.getByRole('navigation').getByRole('button', { name: /^主題/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  // Not rebuilt again while it was never used since.
  expect(readFileSync(join(userData, 'logs', 'chatto.log'), 'utf8').match(/rebuilt to free memory/g)).toHaveLength(1);
});

test('[tray] keeps a window with an unsaved theme', async () => {
  await mainWindow.evaluate(() => window.chatto!.setUnsavedWork(true));
  await mainWindow.evaluate(() => window.chatto!.windowClose());
  await mainWindow.waitForTimeout(3000);
  expect(await windows()).toHaveLength(1);
});

test('plays a reminder sound from the small sound page', async () => {
  const player = app.waitForEvent('window');
  const query = {
    sound: JSON.stringify({ enabled: true, volume: 0.1, sound: { kind: 'builtin', id: 'bubble' } }),
    port: String(port),
  };
  // The same window `main/sound-player.ts` opens while the control panel is released to the tray.
  await app.evaluate(
    ({ BrowserWindow }, { file, query }) => {
      const window = new BrowserWindow({ show: false, webPreferences: { autoplayPolicy: 'no-user-gesture-required' } });
      void window.loadFile(file, { query });
    },
    { file: join(appDir, 'out/renderer/sound.html'), query },
  );
  const page = await player;
  await expect(page).toHaveTitle(/played|failed/);
  expect(await page.title()).toBe('played');
});

test('writes a log and exports diagnostics without private settings', async () => {
  const file = join(userData, 'diagnostics.zip');
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: path })) as typeof dialog.showSaveDialog;
  }, file);
  expect(await mainWindow.evaluate(() => window.chatto!.exportDiagnostics({ includeChannel: false }))).toBe(true);
  const { unzipSync, strFromU8 } = await import('fflate');
  const zip = unzipSync(readFileSync(file));
  expect(Object.keys(zip)).toEqual(expect.arrayContaining(['info.json', 'settings.json', 'logs/chatto.log']));
  const info = JSON.parse(strFromU8(zip['info.json']!));
  expect(info.app.version).toMatch(/^\d+\.\d+\.\d+/);
  expect(strFromU8(zip['logs/chatto.log']!)).toContain(`[server] local server on port ${port}`);
  // The anonymous sharing id stays on this computer.
  expect(JSON.parse(strFromU8(zip['settings.json']!)).share).toEqual({ termsAccepted: 0 });
});

test('serves the viewer pages on loopback', async () => {
  const embed = await fetch(`http://127.0.0.1:${port}/embed`);
  expect(embed.status).toBe(200);
  expect(await embed.text()).toContain('<div id="root">');
});

test('the overlay window is transparent-ready, on top and click-through', async () => {
  await mainWindow.evaluate(() => window.chatto!.setOverlayEnabled(true));
  const overlayWindow = async () => (await windows()).find((w) => w.url.includes('/overlay'));
  await expect.poll(overlayWindow).toBeTruthy();
  const overlay = (await overlayWindow())!;
  expect(overlay.alwaysOnTop).toBe(true);
  expect(overlay.focusable).toBe(false);
  expect(settings().overlay.enabled).toBe(true);

  await mainWindow.evaluate(() => window.chatto!.setOverlayEditing(true));
  await expect.poll(async () => (await overlayWindow())?.focusable).toBe(true);

  await mainWindow.evaluate(() => window.chatto!.setOverlayEnabled(false));
  await expect.poll(async () => (await windows()).length).toBe(1);
  expect(settings().overlay.enabled).toBe(false);
});

test('the event alert overlay opens as its own click-through window', async () => {
  await mainWindow.evaluate(() => window.chatto!.setAlertsOverlayEnabled(true));
  const alertsWindow = async () => (await windows()).find((w) => w.url.includes('/alerts'));
  await expect.poll(alertsWindow).toBeTruthy();
  const alerts = (await alertsWindow())!;
  expect(alerts.alwaysOnTop).toBe(true);
  expect(alerts.focusable).toBe(false);
  expect(settings().alertsOverlay.enabled).toBe(true);

  await mainWindow.evaluate(() => window.chatto!.setAlertsOverlayEnabled(false));
  await expect.poll(async () => (await windows()).length).toBe(1);
  expect(settings().alertsOverlay.enabled).toBe(false);
});

test('alert settings persist to the settings file', async () => {
  await mainWindow.evaluate(async () => {
    const { alerts } = await window.chatto!.getState();
    await window.chatto!.setAlertSettings({ ...alerts, silence: { ...alerts.silence, thresholdSeconds: 300 } });
  });
  expect(settings().alerts.silence.thresholdSeconds).toBe(300);
});

test('saving and selecting a theme persists it and live-updates OBS', async () => {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const frames: ServerFrame[] = [];
  socket.addEventListener('message', (message) => {
    const frame = decodeServerFrame(String(message.data));
    if (frame) frames.push(frame);
  });
  await new Promise((resolveOpen) => socket.addEventListener('open', resolveOpen));
  socket.send(encodeFrame({ v: PROTOCOL_VERSION, type: 'subscribe', target: 'embed' }));
  await expect.poll(() => frames[0]?.type).toBe('hello');

  await mainWindow.evaluate(async () => {
    const state = await window.chatto!.getState();
    const base = state.themes[0]!;
    await window.chatto!.saveTheme({ ...base, id: 'e2e-theme', name: 'E2E', builtIn: false });
    await window.chatto!.selectTheme('embed', 'e2e-theme');
  });

  await expect.poll(() => frames.at(-1)).toMatchObject({ type: 'theme', theme: { id: 'e2e-theme' } });
  expect(settings().customThemes.map((theme: { id: string }) => theme.id)).toContain('e2e-theme');
  expect(settings().selectedThemes.embed).toBe('e2e-theme');
  socket.close();
});

test('closing the window hides it to the tray instead of quitting', async () => {
  await mainWindow.evaluate(() => window.chatto!.windowClose());
  await expect.poll(async () => (await windows())[0]?.visible).toBe(false);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
});

test('persists preference changes to the settings file', async () => {
  await mainWindow.evaluate(() => window.chatto!.setPrefs({ uiMode: 'compact', closeToTray: false }));
  expect(settings().prefs).toMatchObject({ uiMode: 'compact', closeToTray: false });
});

test('saving a theme CSS file outside Chatto saves the theme', async () => {
  const themeId = 'custom-e2e';
  await mainWindow.evaluate(async (id) => {
    const api = window.chatto!;
    const [preset] = (await api.getState()).themes;
    await api.saveTheme({ ...preset!, id, name: 'E2E', builtIn: false, customCss: '' });
    // A command that exits at once without opening anything.
    await api.setPrefs({ editorCommand: 'rem {file}' });
  }, themeId);
  const opened = await mainWindow.evaluate((id) => window.chatto!.openCssFile(id), themeId);
  expect(opened.launched).toBe('editor');
  expect(opened.path).toBe(join(userData, 'custom-css', `${themeId}.css`));

  writeFileSync(opened.path, '.chatto-author { color: red; }');
  const savedCss = () => settings().customThemes.find((theme: { id: string }) => theme.id === themeId)?.customCss;
  await expect.poll(savedCss).toBe('.chatto-author { color: red; }');

  // Saving in Chatto writes the file back.
  await mainWindow.evaluate(async (id) => {
    const api = window.chatto!;
    const theme = (await api.getState()).themes.find((item) => item.id === id)!;
    await api.saveTheme({ ...theme, customCss: '.chatto-body { color: blue; }' });
  }, themeId);
  expect(readFileSync(opened.path, 'utf8')).toBe('.chatto-body { color: blue; }');
});

test('[open-file] a theme file Chatto is opened with is imported after confirming, also when already running', async () => {
  const dialog = mainWindow.getByRole('dialog', { name: '匯入主題' });
  await expect(dialog.getByText('來自 雙擊的主題.chattotheme')).toBeVisible();
  await expect(dialog.getByTestId('opened-theme-preview').locator('.chatto-message').first()).toBeVisible();
  await dialog.getByRole('button', { name: '匯入', exact: true }).click();
  await expect(dialog.getByText('已匯入「雙擊的主題（匯入）」')).toBeVisible();
  await dialog.getByRole('button', { name: '完成' }).click();
  await expect(dialog).toHaveCount(0);
  expect(settings().customThemes.map((theme: { name: string }) => theme.name)).toEqual(['雙擊的主題（匯入）']);

  // Opening another file starts a second Chatto, which hands it to this one and quits.
  const second = themePackage(join(userData, 'second.chattotheme'), '第二個');
  const exited = new Promise<number | null>((done) =>
    spawn(electronPath, [appDir, second], { env: appEnv(), stdio: 'ignore' }).on('exit', done),
  );
  await expect(dialog.getByText('來自 second.chattotheme')).toBeVisible({ timeout: 15_000 });
  await exited;
  await dialog.getByRole('button', { name: '取消' }).click();
  await expect(dialog).toHaveCount(0);
  expect(settings().customThemes).toHaveLength(1);
});

test('a theme package brings its frame image, which the server and previews use', async () => {
  const image = readFileSync(resolve(import.meta.dirname, '../../fixtures/frame.png'));
  const file = `${createHash('sha256').update(image).digest('hex')}.png`;
  const frame = {
    src: `asset:${file}`,
    slice: [32, 32, 32, 32],
    fill: true,
    scale: 0.5,
    repeat: 'stretch',
    outset: [0, 0, 0, 0],
  };
  const theme = {
    ...PRESET_THEMES[0]!,
    id: 'framed',
    name: '有圖片外框',
    builtIn: false,
    message: { ...PRESET_THEMES[0]!.message, box: { ...PRESET_THEMES[0]!.message.box, image: frame } },
  };
  const bytes = zipSync({ 'theme.json': strToU8(JSON.stringify(theme)), [`assets/${file}`]: new Uint8Array(image) });

  const imported = await mainWindow.evaluate(
    async (data) => {
      const api = window.chatto!;
      const result = await api.importThemePackage(new Uint8Array(data));
      await api.saveTheme({ ...result, id: 'framed' });
      return result;
    },
    [...bytes],
  );
  expect(imported.message.box.image?.src).toBe(`asset:${file}`);

  const served = await fetch(`http://127.0.0.1:${port}/theme-assets/${file}`);
  expect(served.headers.get('content-type')).toBe('image/png');
  expect(Buffer.from(await served.arrayBuffer()).equals(image)).toBe(true);

  await mainWindow.getByRole('button', { name: /^主題/ }).click();
  // Card previews are drawn once they near the viewport; the new theme comes after the built-in ones.
  await mainWindow.getByRole('heading', { name: '有圖片外框', level: 2 }).scrollIntoViewIfNeeded();
  const card = mainWindow.locator('.chatto-root[data-theme-id="framed"] .chatto-message').first();
  await expect(card).toHaveCSS('border-image-source', `url("http://localhost:${port}/theme-assets/${file}")`);
  // The control panel's CSP must let the image load, not just name it.
  const loads = await mainWindow.evaluate(
    (src) =>
      new Promise<boolean>((done) => {
        const img = new Image();
        img.onload = () => done(true);
        img.onerror = () => done(false);
        img.src = src;
      }),
    `http://localhost:${port}/theme-assets/${file}`,
  );
  expect(loads).toBe(true);
});
