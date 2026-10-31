import type { ChatTheme, ViewerTarget } from '@chatto/core';
import { api } from '../api';
import { runAction } from './run';

export const themes = {
  select: (target: ViewerTarget, themeId: string) => runAction('selectTheme', api.selectTheme(target, themeId)),
  /** Awaitable: callers show their own error when saving fails. */
  save: (theme: ChatTheme): Promise<void> => api.saveTheme(theme),
  remove: (themeId: string) => runAction('deleteTheme', api.deleteTheme(themeId)),
};
