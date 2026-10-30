import { describe, expect, it } from 'vitest';
import { scopeCustomCss, themeToCss } from './themeCss';
import { BASE_THEME, createTheme, getPresetTheme, normalizeTheme, PRESET_THEMES } from './themes';

describe('theme base', () => {
  it('every styled preset is generated from the same base', () => {
    for (const theme of PRESET_THEMES.filter((item) => item.base === 'styled')) {
      const css = themeToCss(theme, '.s');
      expect(css).toContain('.s .chatto-message');
      expect(css).toContain('.s .chatto-author');
      // Same structural keys as the base: presets only change values.
      const keys = (value: object) =>
        Object.keys(value)
          .filter((key) => key !== 'builtIn')
          .sort();
      expect(keys(theme)).toEqual(keys(BASE_THEME));
    }
  });

  it('blank generates no styles at all', () => {
    const blank = getPresetTheme('blank')!;
    expect(blank.base).toBe('blank');
    expect(themeToCss(blank, '.s')).toBe('');
    expect(blank.customCss).toContain('.chatto-root');
  });

  it('reflects parameters in the CSS', () => {
    const theme = createTheme('t', 't', {
      message: { arrangement: 'columns', box: { radius: [1, 2, 3, 4], padding: [5, 6, 7, 8] } },
      author: { prefix: '@', separator: ' » ' },
      roles: { moderator: { nameColor: '#123456' } },
      animation: { enter: 'none' },
    });
    const css = themeToCss(theme, '.s');
    expect(css).toContain('border-radius: 1px 2px 3px 4px');
    expect(css).toContain('padding: 5px 6px 7px 8px');
    expect(css).toContain('content: "@"');
    expect(css).toContain('content: " » "');
    expect(css).toContain('[data-roles~="moderator"] .chatto-author');
    expect(css).not.toContain('@keyframes');
  });

  it('escapes user text placed in CSS strings', () => {
    const css = themeToCss(createTheme('t', 't', { author: { separator: '"}body{color:red' } }), '.s');
    expect(css).toContain('content: "\\"}body{color:red"');
  });

  it('scopes custom CSS and maps .chatto-root to :scope', () => {
    const css = scopeCustomCss('.chatto-root { color: red } .chatto-root .chatto-body { x: y }', '.s');
    expect(css).toContain('@scope (.s)');
    expect(css).toContain(':scope { color: red }');
    expect(css).toContain(':scope .chatto-body');
    expect(scopeCustomCss('   ', '.s')).toBe('');
  });
});

describe('normalizeTheme', () => {
  it('fills missing fields from the base', () => {
    const theme = normalizeTheme({ schemaVersion: 2, id: 'x', name: 'x', author: { color: '#fff' } });
    expect(theme.author.color).toBe('#fff');
    expect(theme.message.box.radius).toEqual(BASE_THEME.message.box.radius);
  });

  it('migrates v1 themes', () => {
    const theme = normalizeTheme({
      schemaVersion: 1,
      id: 'old',
      name: 'Old',
      layout: 'tag',
      palette: {
        surface: '#111',
        border: 'transparent',
        text: '#eee',
        mutedText: '#999',
        accent: '#f00',
        nameSurface: '#222',
        name: '#fff',
        textStroke: 'transparent',
      },
      typography: { fontFamily: 'serif', fontSize: 20, nameWeight: 700, textStrokeWidth: 0 },
      shape: { radius: 6, borderWidth: 0, padding: [6, 10], gap: 6 },
      options: {
        showBadges: true,
        showAvatars: false,
        showTimestamps: true,
        useUserColors: false,
        direction: 'bottom-up',
        messageLifetime: 30,
        maxMessages: 40,
        enterAnimation: 'fade',
        hiddenUsers: [],
        hiddenPrefixes: ['!'],
      },
      customCss: '',
    });
    expect(theme.schemaVersion).toBe(2);
    expect(theme.message.arrangement).toBe('columns');
    expect(theme.author.box.background).toBe('#222');
    expect(theme.timestamp.show).toBe(true);
    expect(theme.options.messageLifetime).toBe(30);
  });

  it('rejects unknown versions', () => {
    expect(() => normalizeTheme({ schemaVersion: 99 })).toThrow();
  });
});
