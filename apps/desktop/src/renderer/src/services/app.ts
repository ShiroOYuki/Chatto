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
};

/** Opens an https link in the user's browser (main rejects anything else). */
export function openExternal(url: string): void {
  runAction('openExternal', api.openExternal(url));
}
