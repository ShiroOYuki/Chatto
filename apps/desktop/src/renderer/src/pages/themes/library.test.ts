import { localizeTheme, PRESET_THEMES } from '@chatto/chat-ui';
import { LOCALES, type ChatTheme } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import type { ThemeLibrary } from '../../../../shared/themeLibrary';
import {
  contentFilterCount,
  EMPTY_FILTER,
  hasImageFrame,
  isFiltering,
  stepFolder,
  stepTheme,
  themeSections,
  type MatchContext,
} from './library';

const custom = (id: string, extra: Partial<ChatTheme> = {}): ChatTheme => ({
  ...PRESET_THEMES[0]!,
  id,
  name: id,
  builtIn: false,
  ...extra,
});
const THEMES = [...PRESET_THEMES, custom('a'), custom('b', { customCss: 'x {}' }), custom('c'), custom('d')];
const LIBRARY: ThemeLibrary = {
  folders: [
    { id: 'f1', name: 'Games' },
    { id: 'f2', name: 'Empty' },
  ],
  folderOf: { a: 'f1', c: 'f1', d: 'gone' },
  collapsed: [],
};
const context: MatchContext = {
  names: (theme) => (theme.builtIn ? LOCALES.map((locale) => localizeTheme(theme, locale).name) : [theme.name]),
  inUse: (theme) => theme.id === 'washi' || theme.id === 'c',
};
const shape = (sections: ReturnType<typeof themeSections>) =>
  sections.map((section) => [section.id, section.themes.map((theme) => theme.id)]);

describe('themeSections', () => {
  it('puts built-in themes first, then folders, then unfiled ones', () => {
    expect(shape(themeSections(THEMES, LIBRARY))).toEqual([
      ['built-in', PRESET_THEMES.map((theme) => theme.id)],
      ['f1', ['a', 'c']],
      ['f2', []],
      ['unfiled', ['b', 'd']],
    ]);
  });

  it('has no unfiled section without custom themes', () => {
    expect(themeSections(PRESET_THEMES, LIBRARY).map((section) => section.id)).toEqual(['built-in', 'f1', 'f2']);
  });

  it('finds built-in themes by their name in any language and hides empty sections', () => {
    const washi = localizeTheme(
      PRESET_THEMES.find((theme) => theme.id === 'washi')!,
      'en',
    ).name;
    expect(shape(themeSections(THEMES, LIBRARY, { ...EMPTY_FILTER, text: washi.toUpperCase() }, context))).toEqual([
      ['built-in', ['washi']],
    ]);
    const zh = localizeTheme(
      PRESET_THEMES.find((theme) => theme.id === 'washi')!,
      'zh-TW',
    ).name;
    expect(shape(themeSections(THEMES, LIBRARY, { ...EMPTY_FILTER, text: zh }, context))).toEqual([
      ['built-in', ['washi']],
    ]);
  });

  it('combines the search with the filters', () => {
    expect(shape(themeSections(THEMES, LIBRARY, { ...EMPTY_FILTER, inUse: true }, context))).toEqual([
      ['built-in', ['washi']],
      ['f1', ['c']],
    ]);
    const builtInCss = PRESET_THEMES.filter((theme) => theme.customCss.trim()).map((theme) => theme.id);
    expect(shape(themeSections(THEMES, LIBRARY, { ...EMPTY_FILTER, customCss: true }, context))).toEqual([
      ['built-in', builtInCss],
      ['unfiled', ['b']],
    ]);
    expect(shape(themeSections(THEMES, LIBRARY, { ...EMPTY_FILTER, customCss: true, text: 'zzz' }, context))).toEqual(
      [],
    );
  });

  it('filters by arrangement and by image frames', () => {
    const byArrangement = themeSections(THEMES, LIBRARY, { ...EMPTY_FILTER, arrangements: ['columns'] }, context);
    for (const section of byArrangement)
      for (const theme of section.themes) expect(theme.message.arrangement).toBe('columns');
    const framed = themeSections(THEMES, LIBRARY, { ...EMPTY_FILTER, imageFrame: true }, context);
    expect(framed.flatMap((section) => section.themes).every(hasImageFrame)).toBe(true);
    expect(framed.length).toBeGreaterThan(0);
  });

  it('counts the active filters', () => {
    expect(isFiltering(EMPTY_FILTER)).toBe(false);
    expect(isFiltering({ ...EMPTY_FILTER, text: '  ' })).toBe(false);
    expect(isFiltering({ ...EMPTY_FILTER, inUse: true })).toBe(true);
    expect(contentFilterCount({ ...EMPTY_FILTER, customCss: true, arrangements: ['inline', 'stacked'] })).toBe(3);
  });
});

describe('keyboard moves', () => {
  const [, folder, , unfiled] = themeSections(THEMES, LIBRARY);

  it('moves a theme up and down in its section', () => {
    expect(stepTheme(folder!, 'c', -1)).toEqual({ type: 'move-theme', themeId: 'c', folderId: 'f1', before: 'a' });
    expect(stepTheme(folder!, 'a', 1)).toEqual({ type: 'move-theme', themeId: 'a', folderId: 'f1', before: null });
    expect(stepTheme(unfiled!, 'b', 1)).toEqual({ type: 'move-theme', themeId: 'b', folderId: null, before: null });
  });

  it('stops at either end and never moves built-in themes', () => {
    expect(stepTheme(folder!, 'a', -1)).toBeNull();
    expect(stepTheme(folder!, 'c', 1)).toBeNull();
    const [builtIn] = themeSections(THEMES, LIBRARY);
    expect(stepTheme(builtIn!, PRESET_THEMES[1]!.id, -1)).toBeNull();
  });

  it('moves folders', () => {
    expect(stepFolder(LIBRARY, 'f2', -1)).toEqual({ type: 'move-folder', id: 'f2', before: 'f1' });
    expect(stepFolder(LIBRARY, 'f1', 1)).toEqual({ type: 'move-folder', id: 'f1', before: null });
    expect(stepFolder(LIBRARY, 'f1', -1)).toBeNull();
  });
});
