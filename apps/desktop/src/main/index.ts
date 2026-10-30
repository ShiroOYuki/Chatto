import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, shell, Tray } from 'electron';
import { join } from 'node:path';
import { IPC, type AppState } from '../shared/ipc';
import { AppController } from './app-controller';
import { OverlayWindow } from './overlay-window';
import { LocalServer } from './server';
import { SettingsStore, type Rect } from './settings';

const isDev = !app.isPackaged;
const resourcesDir = isDev ? join(__dirname, '../../resources') : join(process.resourcesPath, 'resources');
const viewerDir = isDev ? join(__dirname, '../../../viewer/dist') : join(process.resourcesPath, 'viewer');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) app.quit();

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

function createTray(): void {
  const icon = nativeImage.createFromPath(join(resourcesDir, 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Chatto');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '開啟 Chatto', click: showMainWindow },
      { type: 'separator' },
      { label: '結束', click: () => app.quit() },
    ]),
  );
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
  ipcMain.handle(IPC.selectTheme, (_e, target, id: string) => controller.selectTheme(target, id));
  ipcMain.handle(IPC.saveTheme, (_e, theme) => controller.saveTheme(theme));
  ipcMain.handle(IPC.deleteTheme, (_e, id: string) => controller.deleteTheme(id));
  ipcMain.handle(IPC.openExternal, (_e, url: string) => openExternal(url));
}

async function bootstrap(): Promise<void> {
  await app.whenReady();
  app.setAppUserModelId('dev.ciel.chatto');
  Menu.setApplicationMenu(null);

  const settings = new SettingsStore();
  const controller = new AppController(settings);

  controller.server = new LocalServer({
    port: settings.get().serverPort,
    viewerDir,
    hub: controller.hub,
    themeFor: (target) => controller.themeFor(target),
  });
  await controller.server.start();

  controller.overlay = new OverlayWindow(controller.server.url('overlay'), (bounds) =>
    settings.update((draft) => {
      draft.overlay.bounds = bounds;
    }),
  );

  const send = (channel: string, payload: unknown) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
  };
  controller.onChange = (state: AppState) => send(IPC.state, state);
  controller.isWindowMaximized = () => Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized());
  controller.hub.subscribe((event) => send(IPC.chatEvent, event));

  registerIpc(controller, settings);
  mainWindow = createMainWindow(settings, controller);
  createTray();
  await controller.init();

  app.on('second-instance', showMainWindow);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow(settings, controller);
  });
  app.on('before-quit', () => {
    quitting = true;
    void controller.server.stop();
  });
}

// Chatto keeps running in the tray so the overlay and OBS keep working.
app.on('window-all-closed', () => undefined);

void bootstrap();
