import { LOCALES, type ChatNotice } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import {
  eventTitle,
  messageVariables,
  noticeText,
  noticeVariables,
  renderTemplate,
  TEMPLATE_VARIABLES,
  templateVariables,
} from './eventText';
import { EVENT_CATALOG } from './events';
import { mockMessage, mockNotice, mockUser } from './mockData';
import { sampleEvent } from './eventSamples';
import { createTheme } from './themes';

const notice = (eventType: string, meta: ChatNotice['meta'], systemText = 'original text'): ChatNotice =>
  mockNotice({ eventType, kind: 'other', systemText, author: mockUser(1), meta });

describe('event text templates', () => {
  it('fills variables and formats numbers for the language', () => {
    expect(renderTemplate('{user} ×{n}', { user: 'Mochi', n: 12345 }, 'en')).toBe('Mochi ×12,345');
  });

  it('picks singular or plural words from a number', () => {
    const template = '{n} {n|month|months}';
    expect(renderTemplate(template, { n: 1 }, 'en')).toBe('1 month');
    expect(renderTemplate(template, { n: 2 }, 'en')).toBe('2 months');
  });

  it('drops optional parts whose variables are missing, and fails when a required one is', () => {
    const template = '{user} resubbed[, {streak} in a row]!';
    expect(renderTemplate(template, { user: 'A', streak: 3 })).toBe('A resubbed, 3 in a row!');
    expect(renderTemplate(template, { user: 'A' })).toBe('A resubbed!');
    expect(renderTemplate(template, { streak: 3 })).toBeNull();
    expect(templateVariables(template)).toEqual(['user', 'streak']);
  });

  it('writes the resub from the issue in both languages', () => {
    const resub = notice('resub', { tier: '1', months: 99, streakMonths: 99 });
    expect(noticeText(resub, 'zh-TW')).toBe('Mochi_Fan 以 Tier 1 續訂，累計 99 個月，連續 99 個月');
    expect(noticeText(resub, 'en')).toBe(
      "Mochi_Fan resubscribed at Tier 1. They've subscribed for 99 months, currently on a 99 month streak!",
    );
    // A viewer who hides their streak.
    const hidden = notice('resub', { tier: 'prime', months: 1 });
    expect(noticeText(hidden, 'en')).toBe("Mochi_Fan resubscribed at Prime. They've subscribed for 1 month!");
  });

  it('fills the watch streak from its stream count', () => {
    const streak = notice('watch-streak', { watchStreak: 100, channelPoints: 350 });
    expect(noticeText(streak, 'zh-TW')).toBe('Mochi_Fan 已連續觀看 100 場直播');
    expect(noticeText(streak, 'en')).toBe('Mochi_Fan watched 100 consecutive streams and sparked a watch streak!');
  });

  it("names the reward of a redemption, including Twitch's own rewards", () => {
    const custom = notice('redemption', { reward: '點一首歌', cost: 500 });
    expect(noticeText(custom, 'zh-TW')).toBe('Mochi_Fan 兌換了「點一首歌」');
    expect(noticeText(custom, 'en')).toBe('Mochi_Fan redeemed 點一首歌');
    const unlock = notice('auto-redemption', { rewardType: 'random_sub_emote_unlock', cost: 300, emote: 'TeaCup' });
    expect(noticeText(unlock, 'zh-TW')).toBe('Mochi_Fan 兌換了「隨機解鎖表情符號」：TeaCup');
    expect(noticeText(unlock, 'en')).toBe('Mochi_Fan redeemed Unlock a Random Sub Emote: TeaCup');
    // A reward type newer than Chatto keeps the platform's text.
    expect(noticeText(notice('auto-redemption', { rewardType: 'something_new' }), 'en')).toBe('original text');
  });

  it("falls back to the platform's text when fields are missing or the event has no template", () => {
    expect(noticeText(notice('resub', {}), 'zh-TW')).toBe('original text');
    expect(noticeText(notice('watch-streak', {}), 'zh-TW')).toBe('original text');
    expect(noticeText(notice('something-new', { tier: '1' }), 'en')).toBe('original text');
  });

  it("uses the theme's own text first, then the built-in one when the theme's cannot be filled", () => {
    const theme = createTheme('t', 't', {
      eventText: { 'twitch:resub': '感謝 {user} 的 {months} 個月！', 'twitch:sub': '{nope}' },
    });
    expect(noticeText(notice('resub', { tier: '1', months: 6 }), 'en', theme)).toBe('感謝 Mochi_Fan 的 6 個月！');
    expect(noticeText(notice('sub', { tier: '1' }), 'en', theme)).toBe('Mochi_Fan subscribed at Tier 1');
  });

  it('formats donations as money and names anonymous gifters', () => {
    expect(noticeText(notice('charity-donation', { charity: 'Tea Fund', donation: 5, currency: 'USD' }), 'en')).toBe(
      'Mochi_Fan donated $5.00 to Tea Fund!',
    );
    const anonymous = mockNotice({
      eventType: 'community-gift',
      kind: 'gift-subscription',
      systemText: '',
      meta: { anonymous: true, tier: '1', count: 3 },
    });
    expect(noticeText(anonymous, 'zh-TW')).toBe('匿名觀眾 送出 3 份 Tier 1 訂閱給聊天室');
  });

  it('titles event messages', () => {
    const cheer = mockMessage(mockUser(1), [], { eventType: 'cheer', cheerAmount: 100 });
    expect(eventTitle(cheer, 'zh-TW')).toBe('小奇點 ×100');
    expect(eventTitle(cheer, 'en')).toBe('Cheer ×100');
    expect(eventTitle(mockMessage(mockUser(1), []), 'en')).toBeUndefined();
  });

  it('every built-in template renders its own preview sample in every language', () => {
    for (const event of EVENT_CATALOG.flatMap((group) => group.events)) {
      if (!event.text) continue;
      const sample = sampleEvent(event.key);
      for (const locale of LOCALES) {
        const vars =
          sample.type === 'notice'
            ? noticeVariables(sample.notice, locale)
            : sample.type === 'message'
              ? messageVariables(sample.message)
              : {};
        expect(renderTemplate(event.text[locale], vars, locale), `${event.key} ${locale}`).not.toBeNull();
        for (const variable of templateVariables(event.text[locale]))
          expect(event.variables, event.key).toContain(variable);
      }
    }
  });

  it('describes every variable an event offers', () => {
    for (const event of EVENT_CATALOG.flatMap((group) => group.events)) {
      for (const variable of event.variables ?? []) expect(TEMPLATE_VARIABLES[variable], variable).toBeDefined();
    }
  });
});
