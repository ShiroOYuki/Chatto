import type { ChatTheme, ViewerTarget } from '@chatto/core';
import { useCallback } from 'react';
import { api } from '../api';
import { useDisplaySettings } from '../store';
import { runAction } from './run';
import type { LibraryOp } from '../../../shared/themeLibrary';

export const themes = {
  select: (target: ViewerTarget, themeId: string) => runAction('selectTheme', api.selectTheme(target, themeId)),
  /** Awaitable: callers show their own error when saving fails. */
  save: (theme: ChatTheme): Promise<void> => api.saveTheme(theme),
  /** Moves a custom theme to the trash (#41). */
  remove: (themeId: string) => runAction('deleteTheme', api.deleteTheme(themeId)),
  /** Folders, order and collapsed sections of the themes page (#42). */
  library: (op: LibraryOp) => runAction('updateThemeLibrary', api.updateThemeLibrary(op)),
  /** Resolves to the restored theme's id. */
  restore: (trashId: string): Promise<string> => api.restoreTheme(trashId),
  purge: (trashId: string) => runAction('purgeTrashedTheme', api.purgeTrashedTheme(trashId)),
  emptyTrash: () => runAction('emptyThemeTrash', api.emptyThemeTrash()),
  /** Opens an image picker for a frame; resolves to its source, or null when cancelled. Rejects on bad files. */
  importAsset: (): Promise<string | null> => api.importThemeAsset(),
  /** Saves a `.chattotheme` package; resolves false when cancelled. */
  exportPackage: (theme: ChatTheme): Promise<boolean> => api.exportThemePackage(theme),
  /** Stores a package's images and resolves to its (unsaved) theme. */
  importPackage: (bytes: Uint8Array): Promise<ChatTheme> => api.importThemePackage(bytes),
  /** Done with a theme file opened from Windows (#40), imported or not. */
  dismissOpenedFile: (id: string) => runAction('dismissOpenedThemeFile', api.dismissOpenedThemeFile(id)),
};

/** URL of a theme frame image on the desktop app's local server. */
export const themeAssetUrl = (port: number) => (file: string) =>
  `http://localhost:${port}/theme-assets/${encodeURIComponent(file)}`;

/** Resolves frame images for chat previews in the control panel; stable while the port is. */
export function useThemeAssetUrl(): (file: string) => string {
  const port = useDisplaySettings().serverPort ?? 0;
  return useCallback((file: string) => themeAssetUrl(port)(file), [port]);
}
