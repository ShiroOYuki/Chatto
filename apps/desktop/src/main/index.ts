import { app, BrowserWindow, ipcMain, Menu, nativeImage, shell, Tray } from 'electron';
import { join } from 'node:path';
import { IPC, type AppState } from '../shared/ipc';
import { AppController } from './app-controller';
import { OverlayWindow } from './overlay-window';
import { LocalServer } from './server';
import { SettingsStore } from './settings';

const isDev = !app.isPackaged;
const resourcesDir = isDev ? join(__dirname, '../../resources') : join(process.resourcesPath, 'resources');
const viewerDir = isDev ? join(__dirname, '../../../viewer/dist') : join(process.resourcesPath, 'viewer');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

if (!app.requestSingleInstanceLock()) app.quit();

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    show: false,
    title: 'Chatto',
    icon: join(resourcesDir, 'icon.png'),
    backgroundColor: '#F3F6EF',
    autoHideMenuBar: true,
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

  if (isDev && process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void window.loadFile(join(__dirname, '../renderer/index.html'));
  return window;
}

function createTray(): void {
  const icon = nativeImage.createFromPath(join(resourcesDir, 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Chatto');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '開啟 Chatto', click: () => mainWindow?.show() },
      { type: 'separator' },
      { label: '結束', click: () => app.quit() },
    ]),
  );
  tray.on('click', () => mainWindow?.show());
}

function registerIpc(controller: AppController): void {
  const openExternal = (url: string) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url);
  };
  ipcMain.handle(IPC.getState, () => controller.state());
  ipcMain.handle(IPC.setClientId, (_e, clientId: string) => controller.setClientId(clientId));
  ipcMain.handle(IPC.signIn, () => controller.signIn(openExternal));
  ipcMain.handle(IPC.cancelSignIn, () => controller.cancelSignIn());
  ipcMain.handle(IPC.signOut, () => controller.signOut());
  ipcMain.handle(IPC.connect, (_e, login: string) => controller.connect(login));
  ipcMain.handle(IPC.disconnect, () => controller.disconnect());
  ipcMain.handle(IPC.setOverlayEnabled, (_e, enabled: boolean) => controller.setOverlayEnabled(enabled));
  ipcMain.handle(IPC.setOverlayEditing, (_e, editing: boolean) => controller.setOverlayEditing(editing));
  ipcMain.handle(IPC.selectTheme, (_e, target, id: string) => controller.selectTheme(target, id));
  ipcMain.handle(IPC.saveTheme, (_e, theme) => controller.saveTheme(theme));
  ipcMain.handle(IPC.deleteTheme, (_e, id: string) => controller.deleteTheme(id));
  ipcMain.handle(IPC.openExternal, (_e, url: string) => openExternal(url));
}

async function bootstrap(): Promise<void> {
  await app.whenReady();
  app.setAppUserModelId('dev.ciel.chatto');

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
  controller.hub.subscribe((event) => send(IPC.chatEvent, event));

  registerIpc(controller);
  mainWindow = createMainWindow();
  createTray();
  await controller.init();

  app.on('second-instance', () => mainWindow?.show());
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
  });
  app.on('before-quit', () => void controller.server.stop());
}

// Closing the control panel keeps Chatto in the tray so the overlay and OBS keep working.
app.on('window-all-closed', () => undefined);

void bootstrap();
