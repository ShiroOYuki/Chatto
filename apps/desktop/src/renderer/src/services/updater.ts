import { api } from '../api';
import { runAction } from './run';

/** App updates. Progress and errors arrive through `state.update`. */
export const updater = {
  check: () => runAction('checkForUpdate', api.checkForUpdate()),
  download: () => runAction('downloadUpdate', api.downloadUpdate()),
  /** Quits, installs and starts the new version. */
  install: () => runAction('installUpdate', api.installUpdate()),
  /** Closes the update dialog without updating; `skip` keeps it closed for this version (#39). */
  dismissPrompt: (skip: boolean) => runAction('dismissUpdatePrompt', api.dismissUpdatePrompt(skip)),
};
