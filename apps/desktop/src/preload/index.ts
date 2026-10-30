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
  setClientId: (clientId) => ipcRenderer.invoke(IPC.setClientId, clientId),
  signIn: () => ipcRenderer.invoke(IPC.signIn),
  cancelSignIn: () => ipcRenderer.invoke(IPC.cancelSignIn),
  signOut: () => ipcRenderer.invoke(IPC.signOut),
  connect: (login) => ipcRenderer.invoke(IPC.connect, login),
  disconnect: () => ipcRenderer.invoke(IPC.disconnect),
  setOverlayEnabled: (enabled) => ipcRenderer.invoke(IPC.setOverlayEnabled, enabled),
  setOverlayEditing: (editing) => ipcRenderer.invoke(IPC.setOverlayEditing, editing),
  selectTheme: (target, themeId) => ipcRenderer.invoke(IPC.selectTheme, target, themeId),
  saveTheme: (theme) => ipcRenderer.invoke(IPC.saveTheme, theme),
  deleteTheme: (themeId) => ipcRenderer.invoke(IPC.deleteTheme, themeId),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
};

contextBridge.exposeInMainWorld('chatto', api);
