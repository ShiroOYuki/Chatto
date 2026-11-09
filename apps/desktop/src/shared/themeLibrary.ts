import type { ChatTheme } from '@chatto/core';

/**
 * The user's theme library: custom themes in their order, the folders they sit in (#42) and
 * the trash (#41). Pure functions shared by the main process and the browser preview.
 * Folders and order live in the settings, never in a theme: a theme from Explore stays
 * unmodified when it moves, and an exported package carries no folder.
 */

/** Days a deleted theme stays in the trash before it is cleared at startup. */
export const TRASH_DAYS = 30;
const DAY_MS = 86_400_000;
const TRASH_MS = TRASH_DAYS * DAY_MS;

/** Longest folder name; longer names are cut. */
export const FOLDER_NAME_MAX = 40;

/** Section ids of the two sections that are not folders, for `collapsed`. */
export const BUILT_IN_SECTION = 'built-in';
export const UNFILED_SECTION = 'unfiled';

export interface ThemeFolder {
  id: string;
  name: string;
}

export interface ThemeLibrary {
  /** Custom folders, in the order the themes page shows them. */
  folders: ThemeFolder[];
  /** Folder id of each filed custom theme; a theme missing here is unfiled. */
  folderOf: Record<string, string>;
  /** Collapsed sections: folder ids, `BUILT_IN_SECTION` or `UNFILED_SECTION`. */
  collapsed: string[];
}

export const emptyLibrary = (): ThemeLibrary => ({ folders: [], folderOf: {}, collapsed: [] });

export type TrashReason = 'deleted' | 'overwritten';

/** A theme in the trash, as stored in the settings. */
export interface TrashedTheme {
  /** The trash entry's own id (a theme can be in the trash more than once). */
  id: string;
  theme: ChatTheme;
  deletedAt: number;
  reason: TrashReason;
  /** The folder it was in, so restoring puts it back. */
  folderId?: string;
}

/** What the control panel gets of a trash entry: no theme body. */
export interface TrashEntry {
  id: string;
  themeId: string;
  name: string;
  deletedAt: number;
  /** When startup clears it. */
  expiresAt: number;
  reason: TrashReason;
}

/** Custom themes in order plus their folders: what library operations change. */
export interface LibraryState {
  themes: ChatTheme[];
  library: ThemeLibrary;
}

export type LibraryOp =
  | { type: 'create-folder'; id: string; name: string }
  | { type: 'rename-folder'; id: string; name: string }
  /** Its themes become unfiled; none are deleted. */
  | { type: 'delete-folder'; id: string }
  /** Puts the folder before `before`, or last when null. */
  | { type: 'move-folder'; id: string; before: string | null }
  | { type: 'set-collapsed'; section: string; collapsed: boolean }
  /** Files a custom theme in a folder (null: unfiled), before the theme `before` or last. */
  | { type: 'move-theme'; themeId: string; folderId: string | null; before: string | null };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A folder name as stored: trimmed, single-line and not too long; null when empty. */
export function cleanFolderName(name: string): string | null {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, FOLDER_NAME_MAX);
  return clean || null;
}

/**
 * A library saved by an older version or edited by hand: unknown folders and themes are
 * dropped, so a theme never points at a folder that is gone.
 */
export function normalizeLibrary(raw: unknown, themeIds: readonly string[]): ThemeLibrary {
  if (!isRecord(raw)) return emptyLibrary();
  const folders: ThemeFolder[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(raw.folders) ? raw.folders : []) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id || seen.has(item.id)) continue;
    const name = typeof item.name === 'string' ? cleanFolderName(item.name) : null;
    if (!name) continue;
    seen.add(item.id);
    folders.push({ id: item.id, name });
  }
  const themes = new Set(themeIds);
  const folderOf: Record<string, string> = {};
  if (isRecord(raw.folderOf)) {
    for (const [themeId, folderId] of Object.entries(raw.folderOf)) {
      if (themes.has(themeId) && typeof folderId === 'string' && seen.has(folderId)) folderOf[themeId] = folderId;
    }
  }
  const sections = new Set([...seen, BUILT_IN_SECTION, UNFILED_SECTION]);
  const collapsed = Array.isArray(raw.collapsed)
    ? [...new Set(raw.collapsed.filter((id): id is string => typeof id === 'string' && sections.has(id)))]
    : [];
  return { folders, folderOf, collapsed };
}

/** Trash entries from the settings, dropping anything that is not one. */
export function normalizeTrash(raw: unknown): TrashedTheme[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): TrashedTheme[] => {
    if (!isRecord(item) || typeof item.id !== 'string' || !isRecord(item.theme)) return [];
    if (typeof item.deletedAt !== 'number' || !Number.isFinite(item.deletedAt)) return [];
    const reason: TrashReason = item.reason === 'overwritten' ? 'overwritten' : 'deleted';
    const folderId = typeof item.folderId === 'string' ? item.folderId : undefined;
    return [{ id: item.id, theme: item.theme as unknown as ChatTheme, deletedAt: item.deletedAt, reason, folderId }];
  });
}

/** Moves `id` before `before` (or to the end) in a list of items with ids. */
function placeBefore<T>(items: T[], idOf: (item: T) => string, id: string, before: string | null): T[] {
  const item = items.find((entry) => idOf(entry) === id);
  if (!item || before === id) return items;
  const rest = items.filter((entry) => idOf(entry) !== id);
  const index = before === null ? -1 : rest.findIndex((entry) => idOf(entry) === before);
  if (index < 0) return [...rest, item];
  return [...rest.slice(0, index), item, ...rest.slice(index)];
}

const withoutKey = (record: Record<string, string>, key: string) => {
  const next = { ...record };
  delete next[key];
  return next;
};

/** Applies one change from the themes page; throws on an unknown folder or theme. */
export function applyLibraryOp(state: LibraryState, op: LibraryOp): LibraryState {
  const { themes, library } = state;
  const hasFolder = (id: string) => library.folders.some((folder) => folder.id === id);
  const requireFolder = (id: string) => {
    if (!hasFolder(id)) throw new Error(`Unknown theme folder ${id}`);
  };
  switch (op.type) {
    case 'create-folder': {
      const name = cleanFolderName(op.name);
      if (!name) throw new Error('A folder needs a name');
      if (hasFolder(op.id) || op.id === BUILT_IN_SECTION || op.id === UNFILED_SECTION)
        throw new Error(`Theme folder ${op.id} exists`);
      return { themes, library: { ...library, folders: [...library.folders, { id: op.id, name }] } };
    }
    case 'rename-folder': {
      requireFolder(op.id);
      const name = cleanFolderName(op.name);
      if (!name) throw new Error('A folder needs a name');
      const folders = library.folders.map((folder) => (folder.id === op.id ? { ...folder, name } : folder));
      return { themes, library: { ...library, folders } };
    }
    case 'delete-folder': {
      requireFolder(op.id);
      const folderOf = Object.fromEntries(Object.entries(library.folderOf).filter(([, folder]) => folder !== op.id));
      return {
        themes,
        library: {
          folders: library.folders.filter((folder) => folder.id !== op.id),
          folderOf,
          collapsed: library.collapsed.filter((id) => id !== op.id),
        },
      };
    }
    case 'move-folder': {
      requireFolder(op.id);
      return { themes, library: { ...library, folders: placeBefore(library.folders, (f) => f.id, op.id, op.before) } };
    }
    case 'set-collapsed': {
      const collapsed = library.collapsed.filter((id) => id !== op.section);
      return { themes, library: { ...library, collapsed: op.collapsed ? [...collapsed, op.section] : collapsed } };
    }
    case 'move-theme': {
      if (!themes.some((theme) => theme.id === op.themeId)) throw new Error(`Unknown custom theme ${op.themeId}`);
      if (op.folderId !== null) requireFolder(op.folderId);
      const folderOf =
        op.folderId === null
          ? withoutKey(library.folderOf, op.themeId)
          : { ...library.folderOf, [op.themeId]: op.folderId };
      // Only a theme in the same folder can be the one to stand before; otherwise it goes last.
      const before =
        op.before !== null && (folderOf[op.before] ?? null) === op.folderId && op.before !== op.themeId
          ? op.before
          : null;
      return { themes: placeBefore(themes, (t) => t.id, op.themeId, before), library: { ...library, folderOf } };
    }
  }
}

/** Forgets a theme that left the library (deleted or replaced): its folder entry goes too. */
export function forgetTheme(library: ThemeLibrary, themeId: string): ThemeLibrary {
  return { ...library, folderOf: withoutKey(library.folderOf, themeId) };
}

/** Moves a custom theme to the trash; returns the state unchanged when it is not there. */
export function trashTheme(
  state: LibraryState & { trash: TrashedTheme[] },
  themeId: string,
  entry: { id: string; now: number; reason?: TrashReason },
): LibraryState & { trash: TrashedTheme[] } {
  const theme = state.themes.find((item) => item.id === themeId);
  if (!theme) return state;
  const trashed: TrashedTheme = {
    id: entry.id,
    theme,
    deletedAt: entry.now,
    reason: entry.reason ?? 'deleted',
    folderId: state.library.folderOf[themeId],
  };
  return {
    themes: state.themes.filter((item) => item.id !== themeId),
    library: forgetTheme(state.library, themeId),
    trash: [...state.trash, trashed],
  };
}

/**
 * Brings a trash entry back as the last theme of its old folder (unfiled when the folder is
 * gone). `freshId` gives the theme a new id when its own is taken. Returns the restored id.
 */
export function restoreTheme(
  state: LibraryState & { trash: TrashedTheme[] },
  trashId: string,
  options: { isTaken: (themeId: string) => boolean; freshId: () => string },
): { state: LibraryState & { trash: TrashedTheme[] }; themeId: string } {
  const entry = state.trash.find((item) => item.id === trashId);
  if (!entry) throw new Error(`Unknown trash entry ${trashId}`);
  const taken = (id: string) => options.isTaken(id) || state.themes.some((theme) => theme.id === id);
  const themeId = taken(entry.theme.id) ? options.freshId() : entry.theme.id;
  const theme: ChatTheme = { ...entry.theme, id: themeId, builtIn: false };
  const folderOk = entry.folderId !== undefined && state.library.folders.some((f) => f.id === entry.folderId);
  const folderOf = folderOk ? { ...state.library.folderOf, [themeId]: entry.folderId! } : state.library.folderOf;
  return {
    themeId,
    state: {
      themes: [...state.themes, theme],
      library: { ...state.library, folderOf },
      trash: state.trash.filter((item) => item.id !== trashId),
    },
  };
}

/** Removes a trash entry for good. */
export const purgeTrashed = (trash: TrashedTheme[], trashId: string): TrashedTheme[] =>
  trash.filter((item) => item.id !== trashId);

/** Entries younger than `TRASH_DAYS`; the rest are cleared at startup. */
export const unexpiredTrash = (trash: TrashedTheme[], now: number): TrashedTheme[] =>
  trash.filter((item) => item.deletedAt + TRASH_MS > now);

/** The trash as the control panel lists it, newest first. */
export function trashEntries(trash: TrashedTheme[]): TrashEntry[] {
  return trash
    .map((item) => ({
      id: item.id,
      themeId: item.theme.id,
      name: item.theme.name,
      deletedAt: item.deletedAt,
      expiresAt: item.deletedAt + TRASH_MS,
      reason: item.reason,
    }))
    .sort((a, b) => b.deletedAt - a.deletedAt);
}

/** Whole days left before an entry is cleared, at least 0 (rounded up: "1 day" until the last moment). */
export const trashDaysLeft = (entry: Pick<TrashEntry, 'expiresAt'>, now: number): number =>
  Math.max(0, Math.ceil((entry.expiresAt - now) / DAY_MS));
