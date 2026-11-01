import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC, type ChattoApi } from '../shared/ipc';

function listen<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: ChattoApi = {
  getState: () => ipcRenderer.invoke(IPC.getState),
  onState: (listener) => listen(IPC.state, listener),
  onChatEvent: (listener) => listen(IPC.chatEvent, listener),
  onAlertSound: (listener) => listen(IPC.alertSound, listener),
  windowMinimize: () => ipcRenderer.invoke(IPC.windowMinimize),
  windowToggleMaximize: () => ipcRenderer.invoke(IPC.windowToggleMaximize),
  windowClose: () => ipcRenderer.invoke(IPC.windowClose),
  setPrefs: (patch) => ipcRenderer.invoke(IPC.setPrefs, patch),
  setClientId: (clientId) => ipcRenderer.invoke(IPC.setClientId, clientId),
  signIn: () => ipcRenderer.invoke(IPC.signIn),
  cancelSignIn: () => ipcRenderer.invoke(IPC.cancelSignIn),
  signOut: () => ipcRenderer.invoke(IPC.signOut),
  connect: (login) => ipcRenderer.invoke(IPC.connect, login),
  disconnect: () => ipcRenderer.invoke(IPC.disconnect),
  setOverlayEnabled: (enabled) => ipcRenderer.invoke(IPC.setOverlayEnabled, enabled),
  setOverlayEditing: (editing) => ipcRenderer.invoke(IPC.setOverlayEditing, editing),
  resetOverlayBounds: () => ipcRenderer.invoke(IPC.resetOverlayBounds),
  setAlertSettings: (settings) => ipcRenderer.invoke(IPC.setAlertSettings, settings),
  setAlertsOverlayEnabled: (enabled) => ipcRenderer.invoke(IPC.setAlertsOverlayEnabled, enabled),
  setAlertsOverlayEditing: (editing) => ipcRenderer.invoke(IPC.setAlertsOverlayEditing, editing),
  resetAlertsOverlayBounds: () => ipcRenderer.invoke(IPC.resetAlertsOverlayBounds),
  importSound: () => ipcRenderer.invoke(IPC.importSound),
  selectTheme: (target, themeId) => ipcRenderer.invoke(IPC.selectTheme, target, themeId),
  saveTheme: (theme) => ipcRenderer.invoke(IPC.saveTheme, theme),
  deleteTheme: (themeId) => ipcRenderer.invoke(IPC.deleteTheme, themeId),
  openCssFile: (themeId) => ipcRenderer.invoke(IPC.openCssFile, themeId),
  onCssFileChanged: (listener) => listen(IPC.cssFileChanged, listener),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
};

contextBridge.exposeInMainWorld('chatto', api);
