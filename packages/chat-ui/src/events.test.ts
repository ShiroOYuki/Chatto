import { describe, expect, it } from 'vitest';
import { EVENT_CATALOG, eventKeyOf, findEvent } from './events';
import { createSpecimenEvents } from './mock';
import { themeToCss } from './themeCss';
import { BASE_THEME, editEventStyle, linkEvent, normalizeTheme, resolveEventStyle } from './themes';

describe('platform events', () => {
  it('every catalogued sample carries its own event key', () => {
    for (const event of EVENT_CATALOG.flatMap((group) => group.events)) {
      const sample = event.sample();
      const item = sample.type === 'message' ? sample.message : sample.type === 'notice' ? sample.notice : null;
      expect(item && eventKeyOf(item)).toBe(event.key);
      expect(findEvent(event.key)).toBe(event);
    }
  });

  it('specimen covers every event', () => {
    const keys = createSpecimenEvents().map((event) =>
      event.type === 'message'
        ? eventKeyOf(event.message)
        : event.type === 'notice'
          ? eventKeyOf(event.notice)
          : undefined,
    );
    for (const event of EVENT_CATALOG.flatMap((group) => group.events)) expect(keys).toContain(event.key);
  });

  it('linked events follow the generic style; editing unlinks', () => {
    let theme = linkEvent(BASE_THEME, 'twitch:raid');
    expect(resolveEventStyle(theme, 'twitch:raid')).toEqual(theme.notice);
    theme = { ...theme, notice: { ...theme.notice, titleColor: '#123456' } };
    expect(resolveEventStyle(theme, 'twitch:raid').titleColor).toBe('#123456');

    theme = editEventStyle(theme, 'twitch:raid', (style) => ({ ...style, accentColor: '#ff0000' }));
    expect(theme.events['twitch:raid']?.linked).toBe(false);
    const own = resolveEventStyle(theme, 'twitch:raid');
    expect(own.accentColor).toBe('#ff0000');
    expect(own.titleColor).toBe('#123456');

    const css = themeToCss(theme, '.s');
    expect(css).toContain('.s .chatto-notice[data-event="twitch:raid"]');
    expect(css).toContain('#ff0000');
    expect(css).toContain('.s .chatto-message[data-event] .chatto-event-title');

    theme = linkEvent(theme, 'twitch:raid');
    expect(themeToCss(theme, '.s')).not.toContain('[data-event="twitch:raid"]');
  });

  it('icons are escaped and normalize fills event styles', () => {
    const theme = normalizeTheme({
      ...BASE_THEME,
      roles: { highlighted: { nameColor: 'red' } },
      events: { 'twitch:cheer': { linked: false, style: { icon: '"}*{' } } },
    });
    expect('highlighted' in theme.roles).toBe(false);
    expect(theme.events['twitch:cheer']?.style.accentWidth).toBe(BASE_THEME.notice.accentWidth);
    expect(themeToCss(theme, '.s')).toContain('content: "\\"}*{ "');
  });
});
