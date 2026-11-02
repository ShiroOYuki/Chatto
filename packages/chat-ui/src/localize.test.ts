import { describe, expect, it } from 'vitest';
import { BASE_THEME, duplicateTheme, getPresetTheme, localizeTheme, normalizeTheme, PRESET_THEMES } from './themes';

describe('theme languages', () => {
  const matcha = getPresetTheme('matcha-glass')!;

  it('names built-in themes and their default texts in the given language', () => {
    expect(localizeTheme(matcha, 'en')).toMatchObject({ name: 'Matcha Glass', attention: { label: 'New' } });
    expect(localizeTheme(matcha, 'zh-TW')).toBe(matcha);
    for (const theme of PRESET_THEMES) expect(localizeTheme(theme, 'en').name, theme.id).toMatch(/^[\x20-\x7e]+$/);
  });

  it('leaves custom themes as the user wrote them', () => {
    const custom = { ...duplicateTheme(matcha, '我的主題'), attention: { ...matcha.attention, label: '有人！' } };
    expect(localizeTheme(custom, 'en')).toBe(custom);
  });

  it('copies a built-in theme in the language the user sees', () => {
    const copy = duplicateTheme(matcha, 'Matcha Glass copy', 'en');
    expect(copy.attention.label).toBe('New');
    expect(copy.builtIn).toBe(false);
    expect(localizeTheme(copy, 'zh-TW').attention.label).toBe('New');
  });

  it('keeps only non-empty custom event texts', () => {
    const theme = normalizeTheme({
      ...structuredClone(BASE_THEME),
      eventText: { 'twitch:resub': '謝謝 {user}', 'twitch:sub': '  ', 'twitch:raid': 42 },
    });
    expect(theme.eventText).toEqual({ 'twitch:resub': '謝謝 {user}' });
    const { eventText: _eventText, ...old } = structuredClone(BASE_THEME);
    expect(normalizeTheme(old).eventText).toEqual({});
  });
});
