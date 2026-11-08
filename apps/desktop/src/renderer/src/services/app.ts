import type { AppPrefs } from '../../../shared/ipc';
import { api } from '../api';
import { runAction } from './run';

export const appPrefs = {
  set: (patch: Partial<AppPrefs>) => runAction('setPrefs', api.setPrefs(patch)),
};

export const appWindow = {
  minimize: () => runAction('windowMinimize', api.windowMinimize()),
  toggleMaximize: () => runAction('windowToggleMaximize', api.windowToggleMaximize()),
  close: () => runAction('windowClose', api.windowClose()),
  /**
   * While something is unsaved, the window stays in memory when closed to the tray
   * (normally it is released after a while, #57).
   */
  setUnsavedWork: (unsaved: boolean) => runAction('setUnsavedWork', api.setUnsavedWork(unsaved)),
};

/** Opens an https link in the user's browser (main rejects anything else). */
export function openExternal(url: string): void {
  runAction('openExternal', api.openExternal(url));
}
