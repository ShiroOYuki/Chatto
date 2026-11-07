import { describe, expect, it } from 'vitest';
import {
  ALERT_CATEGORIES,
  alertRuleKey,
  EVENT_CATALOG,
  eventKeyOf,
  findEvent,
  isRedemption,
  platformOnlyEvents,
} from './events';
import { EVENT_SAMPLES, sampleEvent } from './eventSamples';
import { createSpecimenEvents } from './mock';
import { themeToCss } from './themeCss';
import { BASE_THEME, editEventStyle, linkEvent, normalizeTheme, resolveEventStyle } from './themes';

describe('platform events', () => {
  it('every catalogued sample carries its own event key', () => {
    for (const event of EVENT_CATALOG.flatMap((group) => group.events)) {
      const sample = sampleEvent(event.key);
      const item = sample.type === 'message' ? sample.message : sample.type === 'notice' ? sample.notice : null;
      expect(item && eventKeyOf(item)).toBe(event.key);
      expect(findEvent(event.key)).toBe(event);
    }
  });

  it('reads the size of events that have one, for alert thresholds', () => {
    const amount = (key: string) => {
      const sample = sampleEvent(key);
      const item = sample.type === 'message' ? sample.message : sample.type === 'notice' ? sample.notice : null;
      return item ? findEvent(key)?.amount?.read(item) : undefined;
    };
    expect(amount('twitch:cheer')).toBe(100);
    expect(amount('twitch:resub')).toBe(6);
    expect(amount('twitch:community-gift')).toBe(5);
    expect(amount('twitch:raid')).toBe(42);
    expect(findEvent('twitch:sub')?.amount).toBeUndefined();
  });

  it('maps platform events onto the cross-platform alert categories', () => {
    expect(alertRuleKey('twitch:cheer')).toBe('any:tip');
    expect(alertRuleKey('twitch:sub-gift')).toBe('any:gift');
    expect(alertRuleKey('twitch:community-gift')).toBe('any:gift');
    expect(alertRuleKey('twitch:highlighted')).toBe('twitch:highlighted');
    expect(alertRuleKey('youtube:unknown')).toBe('youtube:unknown');
    // Both redemption kinds share one switch.
    expect(alertRuleKey('twitch:auto-redemption')).toBe('twitch:redemption');
    const twitch = EVENT_CATALOG.find((group) => group.platform === 'twitch')!;
    expect(platformOnlyEvents(twitch).map((event) => event.key)).toEqual([
      'twitch:highlighted',
      'twitch:unraid',
      'twitch:bits-badge-tier',
      'twitch:charity-donation',
      'twitch:watch-streak',
      'twitch:redemption',
    ]);
    // Every category is used by at least one event.
    const used = new Set(EVENT_CATALOG.flatMap((group) => group.events.map((event) => event.alertCategory)));
    for (const category of ALERT_CATEGORIES) expect(used).toContain(category.key);
  });

  it('tells redemptions apart from other events', () => {
    const notice = (eventType: string) => ({ platform: 'twitch', eventType });
    expect(isRedemption(notice('redemption'))).toBe(true);
    expect(isRedemption(notice('auto-redemption'))).toBe(true);
    expect(isRedemption(notice('highlighted'))).toBe(false);
    expect(isRedemption({ platform: 'twitch', eventType: undefined })).toBe(false);
  });

  it('every sample belongs to a catalogued event', () => {
    for (const key of Object.keys(EVENT_SAMPLES)) expect(findEvent(key)).toBeDefined();
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
    expect(css).toContain(':where(.s) .chatto-notice[data-event="twitch:raid"]');
    expect(css).toContain('#ff0000');
    expect(css).toContain(':where(.s) .chatto-message[data-event] .chatto-event-title');

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
