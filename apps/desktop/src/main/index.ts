import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, screen, shell, Tray } from 'electron';
import { autoUpdater } from 'electron-updater';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import type { ChatTheme, Locale } from '@chatto/core';
import { IPC, isShareMethod, type AppState, type CaptureRect, type OverlayWindowId } from '../shared/ipc';
import type { OverlayLook } from '../shared/overlayLook';
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
import { fetchUpdateNotes } from '../shared/updateNotes';
import { OpenedThemeFiles, themeFilesFromArgv } from './opened-files';
import { GlobalShortcuts } from './shortcuts';
import { isShortcutAction } from '../shared/shortcuts';
import { ControlLog } from '../shared/controlLog';
import { SoundPlayer } from './sound-player';
import { WindowRelease } from './window-release';
import { Logger } from './logger';
import {
  buildDiagnosticsZip,
  connectionSummary,
  describeStateChanges,
  diagnosticsFileName,
  hideNames,
  sanitizeSettings,
} from './diagnostics';

const isDev = !app.isPackaged;
const resourcesDir = isDev ? join(__dirname, '../../resources') : join(process.resourcesPath, 'resources');
const viewerDir = isDev ? join(__dirname, '../../../viewer/dist') : join(process.resourcesPath, 'viewer');

let mainWindow: BrowserWindow | null = null;
let updater = new Updater(null);
/** Theme files opened from Windows (#40); created once the app is ready. */
let openedFiles: OpenedThemeFiles | null = null;
let tray: Tray | null = null;
let quitting = false;
/** The main process log (#56); created once the app is ready. */
let logger: Logger | null = null;
/** The last diagnostics zip the user saved, for "show in folder". */
let lastDiagnostics: string | null = null;
/** Builds the control panel window again after it was released to the tray; set in `bootstrap`. */
let openMainWindow: (options?: MainWindowOptions) => BrowserWindow = () => {
  throw new Error('Chatto is not ready yet');
};

/** Development builds can shorten the delays below (tests). */
const releaseDelay = (variable: string) =>
  !app.isPackaged && process.env[variable] ? Number(process.env[variable]) : 5 * 60_000;

/** How long the window stays hidden in the tray before it is closed to free memory (#57). */
const TRAY_RELEASE_MS = releaseDelay('CHATTO_TRAY_RELEASE_MS');
/** How long the window stays minimized before it is rebuilt with a fresh renderer (#57). */
const MINIMIZE_RELEASE_MS = releaseDelay('CHATTO_MINIMIZE_RELEASE_MS');

interface MainWindowOptions {
  /** The page to open on (`?page=`). */
  page?: string;
  /** Start minimized in the taskbar instead of showing. */
  minimized?: boolean;
}

const trayRelease = new WindowRelease({
  delayMs: TRAY_RELEASE_MS,
  release: () => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isVisible()) return;
    mainWindow.destroy();
    mainWindow = null;
    logger?.info('window', 'control panel closed in the tray to free memory');
  },
});

/**
 * Replaces a window that stayed minimized: the new one starts minimized on the
 * same page, so the taskbar button stays and restoring looks the same, but the
 * memory heavy pages left behind in the old renderer is gone.
 */
const minimizeRelease = new WindowRelease({
  delayMs: MINIMIZE_RELEASE_MS,
  release: () => {
    const old = mainWindow;
    if (!old || old.isDestroyed() || !old.isMinimized()) return;
    let page: string | undefined;
    try {
      page = new URL(old.webContents.getURL()).searchParams.get('page') ?? undefined;
    } catch {
      page = undefined;
    }
    const rebuilt = openMainWindow({ page, minimized: true });
    mainWindow = rebuilt;
    // Restored while the new one was still loading: keep the window in use.
    const keepOld = () => {
      mainWindow = old;
      if (!rebuilt.isDestroyed()) rebuilt.destroy();
    };
    old.once('restore', keepOld);
    rebuilt.once('ready-to-show', () => {
      old.removeListener('restore', keepOld);
      if (!old.isDestroyed()) old.destroy();
    });
    logger?.info('window', 'minimized control panel rebuilt to free memory');
  },
});

/** Hides the control panel to the tray; it is released later if it stays there. */
function hideToTray(window: BrowserWindow): void {
  window.hide();
  minimizeRelease.shown();
  trayRelease.hidden();
}

/** The control panel window exists (it may be hidden in the tray). */
const hasMainWindow = () => Boolean(mainWindow && !mainWindow.isDestroyed());

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

function createMainWindow(
  settings: SettingsStore,
  controller: AppController,
  options: MainWindowOptions = {},
): BrowserWindow {
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
  window.once('ready-to-show', () => (options.minimized ? window.minimize() : window.show()));
  // A window rebuilt while minimized is already fresh; it is rebuilt again only after it was used.
  let fresh = options.minimized === true;
  window.on('minimize', () => {
    if (!fresh) minimizeRelease.hidden();
  });
  window.on('restore', () => {
    fresh = false;
    minimizeRelease.shown();
  });
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
      hideToTray(window);
    }
  });
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  const query: Record<string, string> = options.page ? { page: options.page } : {};
  if (isDev && process.env.ELECTRON_RENDERER_URL)
    void window.loadURL(`${process.env.ELECTRON_RENDERER_URL}?${new URLSearchParams(query)}`);
  else void window.loadFile(join(__dirname, '../renderer/index.html'), { query });
  return window;
}

function showMainWindow(): void {
  trayRelease.shown();
  // Released to the tray earlier: build it again (it shows itself once ready).
  if (!hasMainWindow()) {
    mainWindow = openMainWindow();
    return;
  }
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
    if (!settings.get().prefs.closeToTray) app.quit();
    else if (mainWindow) hideToTray(mainWindow);
  });
  ipcMain.handle(IPC.setUnsavedWork, (_e, unsaved: boolean) => {
    trayRelease.setUnsaved(unsaved === true);
    minimizeRelease.setUnsaved(unsaved === true);
  });
  ipcMain.handle(IPC.getControlLog, () => controlLog.snapshot());
  ipcMain.handle(IPC.clearChatLog, () => controlLog.clearChat());
  ipcMain.handle(IPC.dismissRedemption, (_e, key: string) => controlLog.dismissRedemption(String(key)));
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
  ipcMain.handle(IPC.setOverlayLook, (_e, window: OverlayWindowId, look: OverlayLook) =>
    controller.setOverlayLook(window, look),
  );
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
  ipcMain.handle(IPC.installObsPlugin, async () => logObsPlugin('install', await obsPlugin.install()));
  ipcMain.handle(IPC.uninstallObsPlugin, async () => logObsPlugin('uninstall', await obsPlugin.uninstall()));
  ipcMain.handle(IPC.exportDiagnostics, async (_e, raw: unknown) => {
    const options = { includeChannel: (raw as { includeChannel?: unknown } | null)?.includeChannel === true };
    const m = controller.messages().dialogs;
    const dialogOptions = {
      title: m.exportDiagnostics,
      defaultPath: join(app.getPath('downloads'), diagnosticsFileName(new Date())),
      filters: [{ name: m.zipFiles, extensions: ['zip'] }],
    };
    const result = mainWindow
      ? await dialog.showSaveDialog(mainWindow, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);
    if (result.canceled || !result.filePath) return false;
    writeFileSync(result.filePath, await buildDiagnostics(controller, settings, options));
    lastDiagnostics = result.filePath;
    logger?.info('diagnostics', 'exported', options);
    return true;
  });
  ipcMain.handle(IPC.revealDiagnostics, () => {
    if (lastDiagnostics) shell.showItemInFolder(lastDiagnostics);
  });
  ipcMain.handle(IPC.checkForUpdate, () => updater.check());
  ipcMain.handle(IPC.downloadUpdate, () => updater.download());
  ipcMain.handle(IPC.installUpdate, () => updater.install());
  ipcMain.handle(IPC.dismissUpdatePrompt, (_e, skip: unknown) => {
    const { version } = updater.state;
    if (skip === true && version) controller.setPrefs({ skippedUpdateVersion: version });
    updater.dismissPrompt();
  });
  ipcMain.handle(IPC.dismissOpenedThemeFile, (_e, id: unknown) => openedFiles?.dismiss(String(id)));
  ipcMain.handle(IPC.setChatPaused, (_e, paused: unknown) => controller.setChatPaused(paused === true));
  ipcMain.handle(IPC.clearChatOnScreen, () => controller.clearChatOnScreen());
  ipcMain.handle(IPC.setShortcut, (_e, action: unknown, accelerator: unknown) => {
    if (!isShortcutAction(action) || typeof accelerator !== 'string' || accelerator.length > 64) {
      throw new Error('Invalid shortcut');
    }
    return controller.setShortcut(action, accelerator);
  });
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
function obsPluginStatusForDiagnostics(): unknown {
  try {
    return obsPlugin.status();
  } catch (error) {
    return `unknown: ${String(error)}`;
  }
}

function logObsPlugin<T extends { ok: boolean; status: { state: string } }>(action: string, result: T): T {
  if (result.ok) logger?.info('obs-plugin', `${action}: ${result.status.state}`);
  else logger?.warn('obs-plugin', `${action} failed`, result);
  return result;
}

/**
 * The diagnostics zip (#56): versions, connections, process memory, settings
 * without private fields, and the log. Names are replaced unless the user asked for them.
 */
async function buildDiagnostics(
  controller: AppController,
  settings: SettingsStore,
  options: { includeChannel: boolean },
): Promise<Uint8Array> {
  const state = controller.state();
  const names = options.includeChannel ? [] : [settings.get().channelLogin, state.auth.login, state.channel.login];
  const hide = (text: string) => hideNames(text, names);
  const info = {
    generatedAt: new Date().toISOString(),
    app: { version: app.getVersion(), packaged: app.isPackaged, locale: state.prefs.locale },
    runtime: { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node },
    os: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      memoryMB: Math.round(os.totalmem() / 1048576),
    },
    obsPlugin: obsPluginStatusForDiagnostics(),
    connections: connectionSummary(state, options),
    processes: app.getAppMetrics().map((p) => ({ type: p.type, memoryMB: Math.round(p.memory.workingSetSize / 1024) })),
  };
  return buildDiagnosticsZip({
    info: JSON.parse(hide(JSON.stringify(info))),
    settings: sanitizeSettings(settings.get(), options),
    logs: (logger?.read() ?? []).map((log) => ({ ...log, text: hide(log.text) })),
  });
}

/** This session's chat log and redemptions, for the control panel (see `shared/controlLog.ts`). */
const controlLog = new ControlLog();

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
  logger = new Logger(join(app.getPath('userData'), 'logs'));
  logger.captureConsole();
  logger.info('app', `Chatto ${app.getVersion()} started`, {
    electron: process.versions.electron,
    os: `${os.platform()} ${os.release()} ${os.arch()}`,
    packaged: app.isPackaged,
  });
  process.on('unhandledRejection', (reason) => logger?.error('app', 'unhandled rejection', reason));
  app.on('render-process-gone', (_e, contents, details) =>
    logger?.warn('app', 'a window stopped', { page: contents.getURL().split('?')[0], ...details }),
  );
  app.on('child-process-gone', (_e, details) => logger?.warn('app', 'a helper process stopped', details));
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
    // Overlays and OBS read the output feed, which the streamer can pause or clear (#53).
    hub: controller.output,
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
    logger.info('server', `local server on port ${settings.get().serverPort}`);
  } catch (error) {
    logger.error('server', 'local server did not start', error);
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

  let loggedState: AppState | null = null;
  controller.onChange = (state: AppState) => {
    for (const line of describeStateChanges(loggedState, state)) logger?.info('state', line);
    loggedState = state;
    send(IPC.state, state);
  };
  controller.isWindowMaximized = () => Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized());
  // Development builds have no installer to update from.
  updater = new Updater(app.isPackaged ? autoUpdater : null, () => controller.emit(), {
    isSkipped: (version) => settings.get().prefs.skippedUpdateVersion === version,
    fetchNotes: (version) => fetchUpdateNotes(app.getVersion(), version),
  });
  controller.updateState = () => updater.state;
  const opened = new OpenedThemeFiles({
    read: (path) => readFileSync(path),
    unpack: (bytes) => controller.importThemePackage(bytes),
    unreadable: () => controller.messages().errors.cannotReadThemeFile,
    tooLarge: () => controller.messages().errors.invalidThemePackage,
    onChange: () => controller.emit(),
  });
  openedFiles = opened;
  controller.openedThemeFiles = () => opened.list;
  // The session log lives here, so the control panel window can be released to the tray (#57).
  controller.hub.subscribe((event) => send(IPC.chatEvent, controlLog.receive(event)));
  const soundPlayer = new SoundPlayer((window, query) =>
    isDev && process.env.ELECTRON_RENDERER_URL
      ? window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/sound.html?${new URLSearchParams(query)}`)
      : window.loadFile(join(__dirname, '../renderer/sound.html'), { query }),
  );
  // The control panel plays the reminder; without it, a hidden sound window does.
  controller.onAlertSound = (sound) => {
    if (hasMainWindow()) send(IPC.alertSound, sound);
    else soundPlayer.play(sound, settings.get().serverPort);
  };

  registerIpc(controller, settings);
  openMainWindow = (options) => createMainWindow(settings, controller, options);
  mainWindow = openMainWindow();
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
  // Global shortcuts (#53) work from now on, also while the window is in the tray.
  controller.shortcuts = new GlobalShortcuts(globalShortcut, (action) => controller.runShortcut(action));
  controller.shortcuts.apply(settings.get().shortcuts);
  controller.emit();
  // Opened with a .chattotheme file (#40): the control panel asks before importing it.
  opened.add(themeFilesFromArgv(process.argv, process.cwd(), existsSync));

  app.on('second-instance', (_e, argv, workingDirectory) => {
    showMainWindow();
    opened.add(themeFilesFromArgv(argv, workingDirectory, existsSync));
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow(settings, controller);
  });
  app.on('will-quit', () => controller.shortcuts?.unregisterAll());
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
