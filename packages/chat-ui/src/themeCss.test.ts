import type { ChatTheme } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import { FONT_STACKS } from './fontStacks';
import { exitDurationMs, scopeCustomCss, themeToCss } from './themeCss';
import { BASE_THEME, createTheme, getPresetTheme, normalizeTheme, PLAIN_PRESET, PRESET_THEMES } from './themes';

describe('theme base', () => {
  it('every styled preset is generated from the same base', () => {
    for (const theme of PRESET_THEMES.filter((item) => item.base === 'styled')) {
      const css = themeToCss(theme, '.s');
      expect(css).toContain(':where(.s) .chatto-message');
      expect(css).toContain(':where(.s) .chatto-author');
      // Same structural keys as the base: presets only change values.
      const keys = (value: object) =>
        Object.keys(value)
          .filter((key) => key !== 'builtIn')
          .sort();
      expect(keys(theme)).toEqual(keys(BASE_THEME));
    }
  });

  it('the parametric blank zeroes every visual parameter', () => {
    const css = themeToCss(PLAIN_PRESET, '.s');
    expect(PLAIN_PRESET.base).toBe('styled');
    expect(css).toContain(':where(.s) .chatto-message');
    for (const fill of ['rgba(', 'border-left', '@keyframes', 'backdrop-filter']) expect(css).not.toContain(fill);
    expect(css).not.toMatch(/background: (?!transparent)/);
    expect(css).not.toMatch(/padding: (?!0px 0px 0px 0px|0;)/);
    expect(css).not.toMatch(/box-shadow: (?!none)/);
  });

  it('rows never shrink when the list overflows', () => {
    for (const theme of PRESET_THEMES.filter((item) => item.base === 'styled')) {
      expect(themeToCss(theme, '.s')).toContain(':where(.s) .chatto-list > li {\n  flex-shrink: 0;\n}');
    }
  });

  it('clips the oldest rows when chat overflows', () => {
    const list = (theme: ChatTheme) => themeToCss(theme, '.s').split(':where(.s) .chatto-list {')[1]!.split('}')[0]!;
    expect(list(BASE_THEME)).toContain('justify-content: flex-end');
    expect(list(createTheme('t', 't', { list: { direction: 'top-down' } }))).toContain('justify-content: flex-start');
  });

  it('styles regular viewers without outranking other roles', () => {
    const css = themeToCss(createTheme('t', 't', { roles: { viewer: { nameColor: '#123456' } } }), '.s');
    expect(css).toContain(
      ':where(.s) .chatto-message:where(:not([data-roles~="broadcaster"]):not([data-roles~="moderator"]):not([data-roles~="vip"]):not([data-roles~="subscriber"]):not([data-roles~="founder"])) .chatto-author',
    );
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
    expect(css).not.toContain('@keyframes chatto-enter');
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

describe('event message frame', () => {
  const bubble = getPresetTheme('bubble')!;
  const rulesFor = (css: string, selector: string) =>
    css
      .split('}')
      .filter((block) =>
        block
          .split('{')[0]!
          .split(',')
          .some((part) => part.trim() === selector),
      )
      .join('}');

  it('wrap frames the whole message', () => {
    const css = themeToCss({ ...bubble, notice: { ...bubble.notice, messageFrame: 'wrap' } }, '.s');
    expect(rulesFor(css, ':where(.s) .chatto-message[data-event]')).toContain('background: #FAECE7');
  });

  it('surface restyles the bubble instead of drawing a frame around it', () => {
    const css = themeToCss(bubble, '.s');
    expect(bubble.notice.messageFrame).toBe('surface');
    expect(rulesFor(css, ':where(.s) .chatto-message[data-event]')).toBe('');
    const body = rulesFor(css, ':where(.s) .chatto-message[data-event] .chatto-body');
    expect(body).toContain('background: #FAECE7');
    // Keeps the bubble's own shape.
    expect(body).not.toContain('border-radius');
    expect(body).not.toContain('padding');
    // System notices still get the whole box.
    expect(rulesFor(css, ':where(.s) .chatto-notice')).toContain('border-radius: 16px 16px 16px 16px');
  });

  it('surface falls back to the message box when the body has no fill', () => {
    const glass = getPresetTheme('matcha-glass')!;
    const css = themeToCss({ ...glass, notice: { ...glass.notice, messageFrame: 'surface' } }, '.s');
    expect(rulesFor(css, ':where(.s) .chatto-message[data-event]')).toContain('rgba(30, 70, 50, 0.72)');
  });

  it('an event with its own mode undoes what the generic style set', () => {
    const cheer = ':where(.s) .chatto-message[data-event="twitch:cheer"]';
    const wrapped = themeToCss(
      {
        ...bubble,
        events: {
          'twitch:cheer': {
            linked: false,
            style: { ...bubble.notice, messageFrame: 'wrap', box: { ...bubble.notice.box, background: '#111111' } },
          },
        },
      },
      '.s',
    );
    expect(rulesFor(wrapped, cheer)).toContain('background: #111111');
    expect(rulesFor(wrapped, `${cheer} .chatto-body`)).toContain(`background: ${bubble.body.box.background}`);

    const glass = getPresetTheme('matcha-glass')!;
    const restyled = themeToCss(
      {
        ...glass,
        body: { ...glass.body, box: { ...glass.body.box, background: '#222222' } },
        events: { 'twitch:cheer': { linked: false, style: { ...glass.notice, messageFrame: 'surface' } } },
      },
      '.s',
    );
    expect(rulesFor(restyled, cheer)).toContain(`background: ${glass.message.box.background}`);
  });
});

describe('event title', () => {
  const title = ':where(.s) .chatto-message[data-event] .chatto-event-title';
  const block = (css: string, selector: string) =>
    css
      .split('}')
      .filter((part) =>
        part
          .split('{')[0]!
          .split(',')
          .some((item) => item.trim() === selector),
      )
      .join('}');

  it('keeps the title on its own line by default', () => {
    expect(BASE_THEME.notice.titlePlacement).toBe('line');
    expect(block(themeToCss(BASE_THEME, '.s'), title)).not.toContain('border-radius: 999px');
  });

  it('puts the bubble title on the corner of the bubble', () => {
    const bubble = getPresetTheme('bubble')!;
    const css = themeToCss(bubble, '.s');
    const sticker = block(css, title);
    expect(sticker).toContain('background: #F0997B');
    expect(sticker).toContain('grid-row: 3');
    expect(sticker).toContain('rotate(4deg)');
    expect(block(css, ':where(.s) .chatto-message[data-event] .chatto-body')).toContain('grid-row: 3');
  });

  it('pins the sticker to the message box when the message is the surface', () => {
    const glass = getPresetTheme('matcha-glass')!;
    const css = themeToCss({ ...glass, notice: { ...glass.notice, titlePlacement: 'sticker' } }, '.s');
    expect(block(css, title)).toContain('position: absolute');
    expect(block(css, ':where(.s) .chatto-message[data-event]')).toContain('position: relative');
  });

  it('columns stop clipping so the sticker can sit on the edge, rounding the tag per part', () => {
    const noren = getPresetTheme('noren')!;
    const css = themeToCss({ ...noren, notice: { ...noren.notice, titlePlacement: 'sticker' } }, '.s');
    expect(block(css, ':where(.s) .chatto-message[data-event]')).toContain('overflow: visible');
    expect(block(css, ':where(.s) .chatto-message[data-event] .chatto-header')).toContain(
      'border-radius: 6px 0px 0px 6px',
    );
    expect(block(css, ':where(.s) .chatto-message[data-event] .chatto-body')).toContain(
      'border-radius: 0px 6px 6px 0px',
    );
  });

  it('an event on a line undoes the generic sticker', () => {
    const bubble = getPresetTheme('bubble')!;
    const css = themeToCss(
      { ...bubble, events: { 'twitch:cheer': { linked: false, style: { ...bubble.notice, titlePlacement: 'line' } } } },
      '.s',
    );
    const cheer = ':where(.s) .chatto-message[data-event="twitch:cheer"]';
    expect(block(css, `${cheer} .chatto-event-title`)).toContain('transform: none');
    expect(block(css, `${cheer} .chatto-content`)).toContain('display: flex');
  });
});

describe('motion', () => {
  it('generates the livelier enter animations', () => {
    for (const enter of ['bounce', 'shake', 'zoom'] as const) {
      const css = themeToCss(createTheme('t', 't', { animation: { enter } }), '.s');
      expect(css).toContain(`@keyframes chatto-enter-${enter}`);
    }
  });

  it('plays the exit animation only while the root is leaving', () => {
    const theme = createTheme('t', 't', { animation: { exit: 'zoom', duration: 300 } });
    const css = themeToCss(theme, '.s');
    expect(css).toContain('@keyframes chatto-exit-zoom');
    expect(css).toContain(
      ':where(.s)[data-leaving] .chatto-list > li {\n  animation: chatto-exit-zoom 300ms ease-in forwards;',
    );
    expect(exitDurationMs(theme)).toBe(300);
    expect(exitDurationMs(createTheme('t', 't', { animation: { exit: 'none' } }))).toBe(0);
  });
});

describe('attention after a quiet spell', () => {
  const calm = '.chatto-message[data-highlight~="after-silence"]';

  it('labels and lights up the bubble in stacked themes', () => {
    const css = themeToCss(getPresetTheme('bubble')!, '.s');
    expect(css).toContain(`:where(.s) ${calm} .chatto-body::after`);
    expect(css).toContain('content: "新留言"');
    expect(css).toContain(`:where(.s) ${calm} .chatto-body {\n  animation: chatto-attention-glow 0.9s ease-in-out 3;`);
  });

  it('switches the label text with the chat language', () => {
    const theme = createTheme('t', 't', { attention: { label: 'Hey', labels: { 'zh-TW': '嘿', en: 'Hey' } } });
    const css = themeToCss(theme, '.s');
    expect(css).toContain('content: "Hey"');
    expect(css).toContain(`:where(.s:lang(zh-TW)) ${calm}::after {\n  content: "嘿";`);
    // Same as the default: no extra rule.
    expect(css).not.toContain(':lang(en)');
    // Only translations: one of them becomes the default.
    const only = themeToCss(createTheme('t', 't', { attention: { label: '', labels: { en: 'New' } } }), '.s');
    expect(only).toContain('content: "New"');
  });

  it('keeps the row enter animation when the effect runs on the row', () => {
    const css = themeToCss(getPresetTheme('matcha-glass')!, '.s');
    expect(css).toContain(`:where(.s) .chatto-list > li${calm} {\n  animation: chatto-enter-slide-up 260ms`);
    expect(css).toContain(', chatto-attention-glow 0.9s ease-in-out 3;');
  });

  it('can be turned off', () => {
    const css = themeToCss(createTheme('t', 't', { attention: { effect: 'none', label: '' } }), '.s');
    expect(css).not.toContain('after-silence');
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

describe('fonts', () => {
  const bundled = ['Huninn', 'Noto Sans TC Variable', 'Noto Serif TC Variable', 'JetBrains Mono'];
  const firstFamily = (stack: string) => stack.split(',')[0]!.trim().replace(/^'|'$/g, '');

  it('presets lead with a bundled font so OBS looks the same on every PC', () => {
    for (const theme of PRESET_THEMES) {
      expect(bundled, theme.id).toContain(firstFamily(theme.font.family));
    }
  });

  it('upgrades stacks saved before fonts were bundled', () => {
    const old = {
      ...structuredClone(PRESET_THEMES[0]!),
      font: { ...PRESET_THEMES[0]!.font, family: "'Noto Serif TC', 'Noto Serif JP', serif" },
    };
    expect(normalizeTheme(old).font.family).toBe(FONT_STACKS.serif);
    const custom = { ...old, font: { ...old.font, family: "'My Font', serif" } };
    expect(normalizeTheme(custom).font.family).toBe("'My Font', serif");
  });
});
