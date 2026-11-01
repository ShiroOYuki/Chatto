import type { CssFileChange, CssFileOpenResult } from '../../../shared/ipc';
import { api } from '../api';

/**
 * Each custom theme's CSS also lives in a file for VSCode (or another editor).
 * The file always holds the saved CSS: saving it outside Chatto saves the theme.
 */
export const cssFiles = {
  /** Awaitable: the editor shows how the file was opened, or the error. */
  open: (themeId: string): Promise<CssFileOpenResult> => api.openCssFile(themeId),
  onChange: (listener: (change: CssFileChange) => void) => api.onCssFileChanged(listener),
};
