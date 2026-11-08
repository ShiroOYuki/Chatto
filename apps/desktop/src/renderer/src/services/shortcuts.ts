import type { ShortcutAction, ShortcutResult } from '../../../shared/shortcuts';
import { api } from '../api';

/** Global shortcuts (#53). */
export const shortcuts = {
  /** Awaitable: the field shows why keys were refused. An empty accelerator removes the shortcut. */
  set: (action: ShortcutAction, accelerator: string): Promise<ShortcutResult> => api.setShortcut(action, accelerator),
};
