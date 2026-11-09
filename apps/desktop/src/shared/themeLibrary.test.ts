import { PRESET_THEMES } from '@chatto/chat-ui';
import type { ChatTheme } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import {
  applyLibraryOp,
  emptyLibrary,
  normalizeLibrary,
  normalizeTrash,
  purgeTrashed,
  restoreTheme,
  trashDaysLeft,
  trashEntries,
  trashTheme,
  unexpiredTrash,
  type LibraryState,
  type TrashedTheme,
} from './themeLibrary';

const DAY = 86_400_000;
const theme = (id: string): ChatTheme => ({ ...PRESET_THEMES[0]!, id, name: id, builtIn: false });
const ids = (state: LibraryState) => state.themes.map((item) => item.id);

function sample(): LibraryState & { trash: TrashedTheme[] } {
  return {
    themes: [theme('a'), theme('b'), theme('c'), theme('d')],
    library: {
      folders: [
        { id: 'f1', name: 'Games' },
        { id: 'f2', name: 'Talks' },
      ],
      folderOf: { a: 'f1', b: 'f1', c: 'f2' },
      collapsed: ['f2'],
    },
    trash: [],
  };
}

describe('applyLibraryOp', () => {
  it('creates, renames and reorders folders', () => {
    let state = applyLibraryOp(sample(), { type: 'create-folder', id: 'f3', name: '  New\n folder ' });
    expect(state.library.folders.at(-1)).toEqual({ id: 'f3', name: 'New folder' });
    state = applyLibraryOp(state, { type: 'rename-folder', id: 'f3', name: 'Music' });
    state = applyLibraryOp(state, { type: 'move-folder', id: 'f3', before: 'f1' });
    expect(state.library.folders.map((folder) => folder.name)).toEqual(['Music', 'Games', 'Talks']);
    state = applyLibraryOp(state, { type: 'move-folder', id: 'f3', before: null });
    expect(state.library.folders.map((folder) => folder.id)).toEqual(['f1', 'f2', 'f3']);
  });

  it('rejects empty names and unknown folders', () => {
    expect(() => applyLibraryOp(sample(), { type: 'create-folder', id: 'x', name: '   ' })).toThrow();
    expect(() => applyLibraryOp(sample(), { type: 'create-folder', id: 'unfiled', name: 'x' })).toThrow();
    expect(() => applyLibraryOp(sample(), { type: 'rename-folder', id: 'nope', name: 'x' })).toThrow();
    expect(() =>
      applyLibraryOp(sample(), { type: 'move-theme', themeId: 'a', folderId: 'nope', before: null }),
    ).toThrow();
  });

  it('cuts long folder names', () => {
    const state = applyLibraryOp(sample(), { type: 'create-folder', id: 'f3', name: 'x'.repeat(100) });
    expect(state.library.folders.at(-1)!.name).toHaveLength(40);
  });

  it('deleting a folder leaves its themes unfiled', () => {
    const state = applyLibraryOp(sample(), { type: 'delete-folder', id: 'f2' });
    expect(state.library.folders.map((folder) => folder.id)).toEqual(['f1']);
    expect(state.library.folderOf).toEqual({ a: 'f1', b: 'f1' });
    expect(state.library.collapsed).toEqual([]);
    expect(ids(state)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('moves a theme to the end of another folder', () => {
    const state = applyLibraryOp(sample(), { type: 'move-theme', themeId: 'a', folderId: 'f2', before: null });
    expect(state.library.folderOf.a).toBe('f2');
    expect(ids(state)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('places a theme before another one in the same folder', () => {
    const state = applyLibraryOp(sample(), { type: 'move-theme', themeId: 'b', folderId: 'f1', before: 'a' });
    expect(ids(state)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('ignores a "before" theme from another folder', () => {
    const state = applyLibraryOp(sample(), { type: 'move-theme', themeId: 'd', folderId: 'f1', before: 'c' });
    expect(ids(state)).toEqual(['a', 'b', 'c', 'd']);
    expect(state.library.folderOf.d).toBe('f1');
  });

  it('unfiles a theme', () => {
    const state = applyLibraryOp(sample(), { type: 'move-theme', themeId: 'c', folderId: null, before: null });
    expect(state.library.folderOf.c).toBeUndefined();
  });

  it('remembers collapsed sections', () => {
    let state = applyLibraryOp(sample(), { type: 'set-collapsed', section: 'built-in', collapsed: true });
    state = applyLibraryOp(state, { type: 'set-collapsed', section: 'f2', collapsed: false });
    expect(state.library.collapsed).toEqual(['built-in']);
  });
});

describe('normalizeLibrary', () => {
  it('drops entries pointing at missing folders or themes', () => {
    const raw = {
      folders: [{ id: 'f1', name: 'Games' }, { id: 'f1', name: 'Dup' }, { id: 'f2', name: ' ' }, 'junk'],
      folderOf: { a: 'f1', b: 'f2', gone: 'f1', c: 3 },
      collapsed: ['f1', 'f2', 'built-in', 'built-in', 7],
    };
    expect(normalizeLibrary(raw, ['a', 'b', 'c'])).toEqual({
      folders: [{ id: 'f1', name: 'Games' }],
      folderOf: { a: 'f1' },
      collapsed: ['f1', 'built-in'],
    });
  });

  it('starts empty without saved data', () => {
    expect(normalizeLibrary(undefined, [])).toEqual(emptyLibrary());
  });
});

describe('trash', () => {
  const now = 1_000 * DAY;

  it('moves a theme to the trash with its folder', () => {
    const state = trashTheme(sample(), 'a', { id: 't1', now });
    expect(ids(state)).toEqual(['b', 'c', 'd']);
    expect(state.library.folderOf.a).toBeUndefined();
    expect(state.trash).toEqual([{ id: 't1', theme: theme('a'), deletedAt: now, reason: 'deleted', folderId: 'f1' }]);
  });

  it('restores into its folder as the last theme', () => {
    const trashed = trashTheme(sample(), 'a', { id: 't1', now });
    const { state, themeId } = restoreTheme(trashed, 't1', { isTaken: () => false, freshId: () => 'new' });
    expect(themeId).toBe('a');
    expect(ids(state)).toEqual(['b', 'c', 'd', 'a']);
    expect(state.library.folderOf.a).toBe('f1');
    expect(state.trash).toEqual([]);
  });

  it('restores unfiled when the folder is gone, and keeps where it came from', () => {
    let trashed = trashTheme(sample(), 'a', { id: 't1', now });
    trashed = { ...trashed, ...applyLibraryOp(trashed, { type: 'delete-folder', id: 'f1' }) };
    const origin = { themeId: 'x', version: 2 } as unknown as ChatTheme['origin'];
    trashed.trash[0]!.theme = { ...trashed.trash[0]!.theme, origin };
    const { state } = restoreTheme(trashed, 't1', { isTaken: () => false, freshId: () => 'new' });
    expect(state.library.folderOf.a).toBeUndefined();
    expect(state.themes.at(-1)!.origin).toEqual(origin);
  });

  it('gives a new id when the old one is taken', () => {
    const trashed = trashTheme(sample(), 'a', { id: 't1', now });
    trashed.themes.push(theme('a'));
    const { state, themeId } = restoreTheme(trashed, 't1', { isTaken: () => false, freshId: () => 'a2' });
    expect(themeId).toBe('a2');
    expect(ids(state)).toEqual(['b', 'c', 'd', 'a', 'a2']);
  });

  it('throws for an unknown entry', () => {
    expect(() => restoreTheme(sample(), 'nope', { isTaken: () => false, freshId: () => 'x' })).toThrow();
  });

  it('keeps entries for 30 days', () => {
    const trash: TrashedTheme[] = [
      { id: 'old', theme: theme('a'), deletedAt: now - 30 * DAY, reason: 'deleted' },
      { id: 'young', theme: theme('b'), deletedAt: now - 29 * DAY, reason: 'overwritten' },
    ];
    expect(unexpiredTrash(trash, now).map((item) => item.id)).toEqual(['young']);
    expect(purgeTrashed(trash, 'young').map((item) => item.id)).toEqual(['old']);
  });

  it('lists entries newest first with the days left', () => {
    const trash: TrashedTheme[] = [
      { id: 'old', theme: theme('a'), deletedAt: now - 10 * DAY, reason: 'deleted' },
      { id: 'young', theme: theme('b'), deletedAt: now - DAY / 2, reason: 'overwritten' },
    ];
    const entries = trashEntries(trash);
    expect(entries.map((entry) => entry.id)).toEqual(['young', 'old']);
    expect(entries.map((entry) => trashDaysLeft(entry, now))).toEqual([30, 20]);
    expect(trashDaysLeft(entries[1]!, now + 25 * DAY)).toBe(0);
  });

  it('normalizes saved entries', () => {
    const raw = [
      { id: 't1', theme: theme('a'), deletedAt: 5, reason: 'weird', folderId: 'f1' },
      { id: 't2', theme: 'nope', deletedAt: 5 },
      { theme: theme('a'), deletedAt: 5 },
    ];
    expect(normalizeTrash(raw)).toEqual([
      { id: 't1', theme: theme('a'), deletedAt: 5, reason: 'deleted', folderId: 'f1' },
    ]);
    expect(normalizeTrash(null)).toEqual([]);
  });
});
