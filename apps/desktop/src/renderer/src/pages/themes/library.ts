import { mapThemeImages } from '@chatto/chat-ui';
import type { ChatTheme } from '@chatto/core';
import {
  BUILT_IN_SECTION,
  UNFILED_SECTION,
  type LibraryOp,
  type ThemeFolder,
  type ThemeLibrary,
} from '../../../../shared/themeLibrary';

/** How messages are laid out; what the arrangement filter picks from. */
export const ARRANGEMENTS = ['inline', 'stacked', 'columns'] as const;
export type Arrangement = (typeof ARRANGEMENTS)[number];

/** Search and filters of the themes page (#42); all of them must match. */
export interface ThemeFilter {
  /** Part of a name, in any language a built-in theme has. */
  text: string;
  /** Only themes an output uses. */
  inUse: boolean;
  imageFrame: boolean;
  customCss: boolean;
  /** Any of these; empty means all. */
  arrangements: Arrangement[];
}

export const EMPTY_FILTER: ThemeFilter = {
  text: '',
  inUse: false,
  imageFrame: false,
  customCss: false,
  arrangements: [],
};

export const isFiltering = (filter: ThemeFilter): boolean =>
  filter.text.trim() !== '' || filter.inUse || filter.imageFrame || filter.customCss || filter.arrangements.length > 0;

/** How many content filters are on, for the filter button's count. */
export const contentFilterCount = (filter: ThemeFilter): number =>
  Number(filter.imageFrame) + Number(filter.customCss) + filter.arrangements.length;

/** Whether any frame of the theme is an image (an `asset:` file or a built-in data URL). */
export function hasImageFrame(theme: ChatTheme): boolean {
  let found = false;
  mapThemeImages(theme, (image) => {
    if (image.src) found = true;
    return image;
  });
  return found;
}

const fold = (text: string) => text.normalize('NFKC').toLocaleLowerCase();

export interface MatchContext {
  /** Every name the theme goes by (a built-in theme's name in each language). */
  names: (theme: ChatTheme) => string[];
  inUse: (theme: ChatTheme) => boolean;
}

export function themeMatches(theme: ChatTheme, filter: ThemeFilter, context: MatchContext): boolean {
  const text = fold(filter.text.trim());
  if (text && !context.names(theme).some((name) => fold(name).includes(text))) return false;
  if (filter.inUse && !context.inUse(theme)) return false;
  if (filter.imageFrame && !hasImageFrame(theme)) return false;
  if (filter.customCss && !theme.customCss.trim()) return false;
  if (filter.arrangements.length > 0) {
    if (theme.base === 'blank') return false;
    if (!filter.arrangements.includes(theme.message.arrangement as Arrangement)) return false;
  }
  return true;
}

export type ThemeSection =
  | { kind: 'built-in'; id: typeof BUILT_IN_SECTION; themes: ChatTheme[] }
  | { kind: 'folder'; id: string; folder: ThemeFolder; themes: ChatTheme[] }
  | { kind: 'unfiled'; id: typeof UNFILED_SECTION; themes: ChatTheme[] };

/**
 * The sections of the themes page in order: built-in, the folders, then unfiled (only once there
 * are custom themes). Custom themes keep their saved order. While searching or filtering, only
 * matching themes show and sections left empty are hidden.
 */
export function themeSections(
  themes: ChatTheme[],
  library: ThemeLibrary,
  filter: ThemeFilter = EMPTY_FILTER,
  context?: MatchContext,
): ThemeSection[] {
  const folders = new Set(library.folders.map((folder) => folder.id));
  const custom = themes.filter((theme) => !theme.builtIn);
  const folderOf = (theme: ChatTheme) => {
    const id = library.folderOf[theme.id];
    return id !== undefined && folders.has(id) ? id : null;
  };
  const sections: ThemeSection[] = [
    { kind: 'built-in', id: BUILT_IN_SECTION, themes: themes.filter((theme) => theme.builtIn) },
    ...library.folders.map((folder): ThemeSection => ({
      kind: 'folder',
      id: folder.id,
      folder,
      themes: custom.filter((theme) => folderOf(theme) === folder.id),
    })),
  ];
  if (custom.length > 0)
    sections.push({ kind: 'unfiled', id: UNFILED_SECTION, themes: custom.filter((theme) => folderOf(theme) === null) });
  if (!isFiltering(filter) || !context) return sections;
  return sections
    .map((section) => ({ ...section, themes: section.themes.filter((theme) => themeMatches(theme, filter, context)) }))
    .filter((section) => section.themes.length > 0);
}

/** The folder id a section files themes in: null for unfiled; undefined for built-in (no moves). */
export function sectionFolder(section: ThemeSection): string | null | undefined {
  if (section.kind === 'folder') return section.id;
  if (section.kind === 'unfiled') return null;
  return undefined;
}

/**
 * The move that shifts a custom theme one place up or down within its section, the keyboard
 * alternative to dragging; null at either end.
 */
export function stepTheme(section: ThemeSection, themeId: string, step: -1 | 1): LibraryOp | null {
  const folderId = sectionFolder(section);
  if (folderId === undefined) return null;
  const ids = section.themes.map((theme) => theme.id);
  const index = ids.indexOf(themeId);
  const target = index + step;
  if (index < 0 || target < 0 || target >= ids.length) return null;
  // Up: before the one above. Down: before the one after the next, or last.
  const before = step < 0 ? ids[target]! : (ids[target + 1] ?? null);
  return { type: 'move-theme', themeId, folderId, before };
}

/** The move that shifts a folder one place up or down; null at either end. */
export function stepFolder(library: ThemeLibrary, folderId: string, step: -1 | 1): LibraryOp | null {
  const ids = library.folders.map((folder) => folder.id);
  const index = ids.indexOf(folderId);
  const target = index + step;
  if (index < 0 || target < 0 || target >= ids.length) return null;
  const before = step < 0 ? ids[target]! : (ids[target + 1] ?? null);
  return { type: 'move-folder', id: folderId, before };
}

/** Folder of a custom theme (null: unfiled), for "move to…" menus. */
export const folderOfTheme = (library: ThemeLibrary, themeId: string): string | null => {
  const id = library.folderOf[themeId];
  return id !== undefined && library.folders.some((folder) => folder.id === id) ? id : null;
};

/** Drag data types: a theme card or a folder header. */
export const DRAG_THEME = 'application/x-chatto-theme';
export const DRAG_FOLDER = 'application/x-chatto-folder';
