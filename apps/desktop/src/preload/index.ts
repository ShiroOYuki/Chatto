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
  getControlLog: () => ipcRenderer.invoke(IPC.getControlLog),
  clearChatLog: () => ipcRenderer.invoke(IPC.clearChatLog),
  dismissRedemption: (key) => ipcRenderer.invoke(IPC.dismissRedemption, key),
  setUnsavedWork: (unsaved) => ipcRenderer.invoke(IPC.setUnsavedWork, unsaved),
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
  setOverlayLook: (window, look) => ipcRenderer.invoke(IPC.setOverlayLook, window, look),
  importSound: () => ipcRenderer.invoke(IPC.importSound),
  selectTheme: (target, themeId) => ipcRenderer.invoke(IPC.selectTheme, target, themeId),
  saveTheme: (theme) => ipcRenderer.invoke(IPC.saveTheme, theme),
  deleteTheme: (themeId) => ipcRenderer.invoke(IPC.deleteTheme, themeId),
  updateThemeLibrary: (op) => ipcRenderer.invoke(IPC.updateThemeLibrary, op),
  restoreTheme: (trashId) => ipcRenderer.invoke(IPC.restoreTheme, trashId),
  purgeTrashedTheme: (trashId) => ipcRenderer.invoke(IPC.purgeTrashedTheme, trashId),
  emptyThemeTrash: () => ipcRenderer.invoke(IPC.emptyThemeTrash),
  importThemeAsset: () => ipcRenderer.invoke(IPC.importThemeAsset),
  exportThemePackage: (theme) => ipcRenderer.invoke(IPC.exportThemePackage, theme),
  importThemePackage: (bytes) => ipcRenderer.invoke(IPC.importThemePackage, bytes),
  openCssFile: (themeId) => ipcRenderer.invoke(IPC.openCssFile, themeId),
  onCssFileChanged: (listener) => listen(IPC.cssFileChanged, listener),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
  getObsPluginStatus: () => ipcRenderer.invoke(IPC.getObsPluginStatus),
  installObsPlugin: () => ipcRenderer.invoke(IPC.installObsPlugin),
  uninstallObsPlugin: () => ipcRenderer.invoke(IPC.uninstallObsPlugin),
  checkForUpdate: () => ipcRenderer.invoke(IPC.checkForUpdate),
  downloadUpdate: () => ipcRenderer.invoke(IPC.downloadUpdate),
  installUpdate: () => ipcRenderer.invoke(IPC.installUpdate),
  dismissUpdatePrompt: (skip) => ipcRenderer.invoke(IPC.dismissUpdatePrompt, skip),
  dismissOpenedThemeFile: (id) => ipcRenderer.invoke(IPC.dismissOpenedThemeFile, id),
  setChatPaused: (paused) => ipcRenderer.invoke(IPC.setChatPaused, paused),
  clearChatOnScreen: () => ipcRenderer.invoke(IPC.clearChatOnScreen),
  setShortcut: (action, accelerator) => ipcRenderer.invoke(IPC.setShortcut, action, accelerator),
  share: (method, ...args) => ipcRenderer.invoke(IPC.share, method, ...args),
  captureThumbnail: (rect) => ipcRenderer.invoke(IPC.captureThumbnail, rect),
  exportDiagnostics: (options) => ipcRenderer.invoke(IPC.exportDiagnostics, options),
  revealDiagnostics: () => ipcRenderer.invoke(IPC.revealDiagnostics),
};

contextBridge.exposeInMainWorld('chatto', api);
