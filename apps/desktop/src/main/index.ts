import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, screen, shell, Tray } from 'electron';
import { autoUpdater } from 'electron-updater';
import { execFile } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ChatTheme, Locale } from '@chatto/core';
import { IPC, isShareMethod, type AppState, type CaptureRect } from '../shared/ipc';
import { ShareClient } from '../shared/share/client';
import { canOpenSignInPage, createShareBackend } from './share-backend';
import { openSignInLoopback } from './share-loopback';
import { SafeSessionStore } from './share-session';
import { AppController } from './app-controller';
import { CssFiles } from './css-files';
import { mainMessages } from './messages';
import { OBS_PLUGIN_NAME, ObsPlugin } from './obs-plugin';
import { OverlayWindow } from './overlay-window';
import { LocalServer } from './server';
import { BUILT_IN_CLIENT_ID, SettingsStore, type Rect } from './settings';
import { ThemeAssets } from './theme-assets';
import { packageFileName, THEME_PACKAGE_EXTENSION } from './theme-package';
import { Updater } from './updater';

const isDev = !app.isPackaged;
const resourcesDir = isDev ? join(__dirname, '../../resources') : join(process.resourcesPath, 'resources');
const viewerDir = isDev ? join(__dirname, '../../../viewer/dist') : join(process.resourcesPath, 'viewer');

let mainWindow: BrowserWindow | null = null;
let updater = new Updater(null);
let tray: Tray | null = null;
let quitting = false;

// Lets end-to-end tests run against an isolated profile (and its own single-instance lock).
if (!app.isPackaged && process.env.CHATTO_USER_DATA) app.setPath('userData', process.env.CHATTO_USER_DATA);

/** A second launch only brings the running Chatto forward (via `second-instance`) and must not start anything. */
const isFirstInstance = app.requestSingleInstanceLock();
if (!isFirstInstance) app.quit();

/** Restores saved bounds only when they still fit on a connected display. */
function restorableBounds(bounds?: Rect): Partial<Rect> {
  if (!bounds) return { width: 1280, height: 820 };
  const visible = screen.getAllDisplays().some(({ workArea }) => {
    const overlapX = Math.min(bounds.x + bounds.width, workArea.x + workArea.width) - Math.max(bounds.x, workArea.x);
    const overlapY = Math.min(bounds.y + bounds.height, workArea.y + workArea.height) - Math.max(bounds.y, workArea.y);
    return overlapX > 120 && overlapY > 80;
  });
  return visible ? bounds : { width: bounds.width, height: bounds.height };
}

function createMainWindow(settings: SettingsStore, controller: AppController): BrowserWindow {
  const window = new BrowserWindow({
    ...restorableBounds(settings.get().windowBounds),
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'Chatto',
    icon: join(resourcesDir, 'icon.png'),
    backgroundColor: '#F3F6EF',
    // The renderer draws its own title bar with integrated window controls.
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
    },
  });
  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const syncState = () => controller.emit();
  window.on('maximize', syncState);
  window.on('unmaximize', syncState);

  const saveBounds = () => {
    if (window.isMaximized() || window.isMinimized()) return;
    settings.update((draft) => {
      draft.windowBounds = window.getBounds();
    });
  };
  window.on('resized', saveBounds);
  window.on('moved', saveBounds);

  // Alt+F4 and the taskbar close follow the same preference as the title bar button.
  window.on('close', (event) => {
    if (!quitting && settings.get().prefs.closeToTray) {
      event.preventDefault();
      window.hide();
    }
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void window.loadFile(join(__dirname, '../renderer/index.html'));
  return window;
}

function showMainWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

/** The tray menu in the interface language; rebuilt when the language changes. */
function trayMenu(locale: Locale): Menu {
  const m = mainMessages(locale).tray;
  return Menu.buildFromTemplate([
    { label: m.open, click: showMainWindow },
    { type: 'separator' },
    { label: m.quit, click: () => app.quit() },
  ]);
}

function createTray(locale: Locale): void {
  const icon = nativeImage.createFromPath(join(resourcesDir, 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Chatto');
  tray.setContextMenu(trayMenu(locale));
  tray.on('click', showMainWindow);
}

function registerIpc(controller: AppController, settings: SettingsStore): void {
  const openExternal = (url: string) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url);
  };
  ipcMain.handle(IPC.getState, () => controller.state());

  ipcMain.handle(IPC.windowMinimize, () => mainWindow?.minimize());
  ipcMain.handle(IPC.windowToggleMaximize, () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.handle(IPC.windowClose, () => {
    if (settings.get().prefs.closeToTray) mainWindow?.hide();
    else app.quit();
  });
  ipcMain.handle(IPC.setPrefs, (_e, patch) => controller.setPrefs(patch));

  ipcMain.handle(IPC.setClientId, (_e, clientId: string) => controller.setClientId(clientId));
  ipcMain.handle(IPC.signIn, () => controller.signIn(openExternal));
  ipcMain.handle(IPC.cancelSignIn, () => controller.cancelSignIn());
  ipcMain.handle(IPC.signOut, () => controller.signOut());
  ipcMain.handle(IPC.connect, (_e, login: string) => controller.connect(login));
  ipcMain.handle(IPC.disconnect, () => controller.disconnect());
  ipcMain.handle(IPC.setOverlayEnabled, (_e, enabled: boolean) => controller.setOverlayEnabled(enabled));
  ipcMain.handle(IPC.setOverlayEditing, (_e, editing: boolean) => controller.setOverlayEditing(editing));
  ipcMain.handle(IPC.resetOverlayBounds, () => controller.resetOverlayBounds());
  ipcMain.handle(IPC.setAlertSettings, (_e, next) => controller.setAlertSettings(next));
  ipcMain.handle(IPC.setAlertsOverlayEnabled, (_e, enabled: boolean) => controller.setAlertsOverlayEnabled(enabled));
  ipcMain.handle(IPC.setAlertsOverlayEditing, (_e, editing: boolean) => controller.setAlertsOverlayEditing(editing));
  ipcMain.handle(IPC.resetAlertsOverlayBounds, () => controller.resetAlertsOverlayBounds());
  ipcMain.handle(IPC.importSound, async () => {
    const m = controller.messages().dialogs;
    const options = {
      title: m.chooseSound,
      properties: ['openFile' as const],
      filters: [{ name: m.audioFiles, extensions: ['mp3', 'ogg', 'wav'] }],
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    const file = result.filePaths[0];
    return result.canceled || !file ? null : controller.importSound(file);
  });
  ipcMain.handle(IPC.selectTheme, (_e, target, id: string) => controller.selectTheme(target, id));
  ipcMain.handle(IPC.saveTheme, (_e, theme) => controller.saveTheme(theme));
  ipcMain.handle(IPC.deleteTheme, (_e, id: string) => controller.deleteTheme(id));
  ipcMain.handle(IPC.importThemeAsset, async () => {
    const m = controller.messages().dialogs;
    const options = {
      title: m.chooseFrameImage,
      properties: ['openFile' as const],
      filters: [{ name: m.imageFiles, extensions: ['png', 'webp', 'gif'] }],
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    const file = result.filePaths[0];
    return result.canceled || !file ? null : controller.importThemeAsset(file);
  });
  ipcMain.handle(IPC.exportThemePackage, async (_e, theme: ChatTheme) => {
    const m = controller.messages().dialogs;
    const options = {
      title: m.exportThemePackage,
      defaultPath: packageFileName(theme),
      filters: [{ name: m.themePackageFiles, extensions: [THEME_PACKAGE_EXTENSION] }],
    };
    const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return false;
    writeFileSync(result.filePath, controller.exportThemePackage(theme));
    return true;
  });
  ipcMain.handle(IPC.importThemePackage, (_e, bytes: Uint8Array) => controller.importThemePackage(bytes));
  ipcMain.handle(IPC.openCssFile, (_e, id: string) => controller.openCssFile(id));
  ipcMain.handle(IPC.openExternal, (_e, url: string) => openExternal(url));
  ipcMain.handle(IPC.getObsPluginStatus, () => obsPlugin.status());
  ipcMain.handle(IPC.installObsPlugin, () => obsPlugin.install());
  ipcMain.handle(IPC.uninstallObsPlugin, () => obsPlugin.uninstall());
  ipcMain.handle(IPC.checkForUpdate, () => updater.check());
  ipcMain.handle(IPC.downloadUpdate, () => updater.download());
  ipcMain.handle(IPC.installUpdate, () => updater.install());
  ipcMain.handle(IPC.share, (_e, method: unknown, ...args: unknown[]) => {
    if (!isShareMethod(method) || !controller.share) throw new Error('Unknown share call');
    const call = controller.share[method] as (...params: unknown[]) => unknown;
    return call.apply(controller.share, args);
  });
  ipcMain.handle(IPC.captureThumbnail, async (_e, rect: CaptureRect) => {
    if (!mainWindow || mainWindow.isDestroyed()) return null;
    const image = await mainWindow.webContents.capturePage({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
    return image.isEmpty() ? null : image.toDataURL();
  });
}

/** The OBS plugin as this build ships it: packaged with the app, or the local CMake install in development. */
const obsPlugin = new ObsPlugin({
  bundledDir: isDev
    ? join(__dirname, '../../../../obs-plugin/release', OBS_PLUGIN_NAME)
    : join(process.resourcesPath, 'obs-plugin', OBS_PLUGIN_NAME),
  pluginsDir: join(process.env.ProgramData ?? 'C:\\ProgramData', 'obs-studio', 'plugins'),
  obsDirs: [
    join(process.env.ProgramData ?? 'C:\\ProgramData', 'obs-studio'),
    join(app.getPath('appData'), 'obs-studio'),
  ],
  isObsRunning: () =>
    new Promise((resolve) =>
      execFile('tasklist', ['/FI', 'IMAGENAME eq obs64.exe', '/FO', 'CSV', '/NH'], (error, stdout) =>
        resolve(!error && stdout.toLowerCase().includes('obs64.exe')),
      ),
    ),
});

/** Another Chatto (say, the installed copy next to a development one) already serves this port. */
async function isChattoListening(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/ping`, { signal: AbortSignal.timeout(1000) });
    const body = (await response.json()) as { app?: unknown };
    return body.app === 'chatto';
  } catch {
    return false;
  }
}

async function bootstrap(): Promise<void> {
  await app.whenReady();
  app.setAppUserModelId('dev.ciel.chatto');
  Menu.setApplicationMenu(null);

  const send = (channel: string, payload: unknown) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
  };
  const settings = new SettingsStore();
  const controller = new AppController(settings, BUILT_IN_CLIENT_ID);
  controller.soundsDir = join(app.getPath('userData'), 'sounds');
  controller.assets = new ThemeAssets(join(app.getPath('userData'), 'theme-assets'), () => controller.messages());
  // Safe here: no theme editor is open yet, so no unsaved theme can be using an image.
  controller.collectThemeAssets();
  controller.cssFiles = new CssFiles({
    dir: join(app.getPath('userData'), 'custom-css'),
    onExternalChange: (themeId, css) => controller.applyExternalCss(themeId, css),
    openWithSystem: async (path) => (await shell.openPath(path)) === '',
    // Reference files follow the interface language (rewritten on open and on a language change).
    locale: () => settings.get().prefs.locale,
  });
  controller.onCssFileChanged = (change) => send(IPC.cssFileChanged, change);
  controller.cssFiles.start();
  controller.share = new ShareClient({
    backend: createShareBackend({ version: app.getVersion(), isDev }),
    session: new SafeSessionStore(),
    clientId: () => settings.get().share.clientId,
    termsAccepted: () => settings.get().share.termsAccepted,
    setTermsAccepted: (version) =>
      settings.update((draft) => {
        draft.share.termsAccepted = version;
      }),
    openExternal: (url) => {
      if (canOpenSignInPage(url, isDev)) void shell.openExternal(url);
    },
    themes: () => controller.themes(),
    saveTheme: (theme) => controller.saveTheme(theme),
    assets: controller.assets,
    onChange: () => controller.emit(),
    loopback: openSignInLoopback,
  });

  controller.server = new LocalServer({
    port: settings.get().serverPort,
    viewerDir,
    hub: controller.hub,
    themeFor: (target, themeId) => controller.themeFor(target, themeId),
    themeList: () => controller.themeSummaries(),
    appVersion: app.getVersion(),
    locale: () => controller.chatLocale(),
    route: (target, event) => controller.route(target, event),
    soundsDir: controller.soundsDir,
    assets: controller.assets,
  });
  try {
    await controller.server.start();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
    // The overlay and OBS need this port, so Chatto cannot run without it: say why and leave.
    const port = settings.get().serverPort;
    const m = controller.messages().dialogs;
    dialog.showErrorBox(m.cannotStart, (await isChattoListening(port)) ? m.alreadyRunning : m.portInUse(port));
    app.exit(1);
    return;
  }

  controller.overlay = new OverlayWindow(controller.server.url('overlay'), (bounds) =>
    settings.update((draft) => {
      draft.overlay.bounds = bounds;
    }),
  );
  controller.alertsOverlay = new OverlayWindow(
    controller.server.url('alerts'),
    (bounds) =>
      settings.update((draft) => {
        draft.alertsOverlay.bounds = bounds;
      }),
    OverlayWindow.alertBounds,
  );

  controller.onChange = (state: AppState) => send(IPC.state, state);
  controller.isWindowMaximized = () => Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized());
  // Development builds have no installer to update from.
  updater = new Updater(app.isPackaged ? autoUpdater : null, () => controller.emit());
  controller.updateState = () => updater.state;
  controller.hub.subscribe((event) => send(IPC.chatEvent, event));
  controller.onAlertSound = (sound) => send(IPC.alertSound, sound);

  registerIpc(controller, settings);
  mainWindow = createMainWindow(settings, controller);
  let trayLocale = settings.get().prefs.locale;
  createTray(trayLocale);
  // Called after every preference change; menus built once with text are rebuilt in the new language.
  controller.onLocaleChange = (locale) => {
    if (locale === trayLocale) return;
    trayLocale = locale;
    tray?.setContextMenu(trayMenu(locale));
  };
  await controller.init();
  void controller.share?.init();
  updater.start();

  app.on('second-instance', showMainWindow);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow(settings, controller);
  });
  app.on('before-quit', () => {
    quitting = true;
    updater.stop();
    controller.cssFiles?.stop();
    void controller.server.stop();
  });
}

// Chatto keeps running in the tray so the overlay and OBS keep working.
app.on('window-all-closed', () => undefined);

if (isFirstInstance) void bootstrap();
