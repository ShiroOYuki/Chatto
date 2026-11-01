import { decodeServerFrame, encodeFrame, PROTOCOL_VERSION, type ServerFrame } from '@chatto/core';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
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

test.beforeEach(async () => {
  userData = mkdtempSync(join(tmpdir(), 'chatto-e2e-'));
  port = 41000 + Math.floor(Math.random() * 10000);
  writeFileSync(join(userData, 'settings.json'), JSON.stringify({ serverPort: port, twitchClientId: '' }));
  app = await electron.launch({
    executablePath: electronPath,
    args: [appDir],
    env: { ...process.env, CHATTO_USER_DATA: userData, ELECTRON_RENDERER_URL: '' },
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
