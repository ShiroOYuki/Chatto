import type { CssFileChange, CssFileOpenResult } from '../../../shared/ipc';
import { api } from '../api';
import { runAction } from './run';

/** Syncs a theme's custom CSS with a file the user edits in VSCode (or another editor). */
export const cssFiles = {
  /** Awaitable: the editor shows how the file was opened, or the error. */
  open: (themeId: string, css: string): Promise<CssFileOpenResult> => api.openCssFile(themeId, css),
  write: (themeId: string, css: string) => runAction('writeCssFile', api.writeCssFile(themeId, css)),
  close: (themeId: string) => runAction('closeCssFile', api.closeCssFile(themeId)),
  onChange: (listener: (change: CssFileChange) => void) => api.onCssFileChanged(listener),
};
