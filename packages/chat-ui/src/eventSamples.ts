import type { ChatEvent, ChatNotice } from '@chatto/core';
import { mockEmote, mockMessage, mockNotice, mockUser } from './mockData';

/** Preview samples for every catalogued platform event, keyed by event key (see `events.ts`). */

const notice = (
  eventType: string,
  kind: ChatNotice['kind'],
  systemText: string,
  extra: Partial<ChatNotice> = {},
): ChatEvent => ({ type: 'notice', notice: mockNotice({ eventType, kind, systemText, ...extra }) });

export const EVENT_SAMPLES: Record<string, () => ChatEvent> = {
  'twitch:cheer': () => ({
    type: 'message',
    message: mockMessage(
      mockUser(1),
      [
        { type: 'cheer', text: 'Cheer100', prefix: 'Cheer', amount: 100, tier: 100 },
        { type: 'text', text: ' 請你喝珍奶 ' },
        mockEmote('TeaCup', '#C0DD97'),
      ],
      { cheerAmount: 100, eventType: 'cheer' },
    ),
  }),
  'twitch:highlighted': () => ({
    type: 'message',
    message: mockMessage(mockUser(4), [{ type: 'text', text: '用點數幫大家點一杯抹茶！' }], {
      eventType: 'highlighted',
      highlights: ['highlighted'],
    }),
  }),
  'twitch:sub': () =>
    notice('sub', 'subscription', 'Mochi_Fan 訂閱了（Tier 1）', { author: mockUser(1), meta: { tier: '1' } }),
  'twitch:resub': () =>
    notice('resub', 'resubscription', 'Mochi_Fan 已訂閱 6 個月', {
      author: mockUser(1),
      fragments: [{ type: 'text', text: '每天都來喝茶 ☕' }],
      meta: { tier: '1', months: 6, streakMonths: 6 },
    }),
  'twitch:sub-gift': () =>
    notice('sub-gift', 'gift-subscription', '熊熊管理員 送了一份訂閱給 okome_rice', {
      author: mockUser(2),
      meta: { tier: '1', recipient: 'okome_rice' },
    }),
  'twitch:community-gift': () =>
    notice('community-gift', 'gift-subscription', 'MatchaLatte 送出 5 份訂閱給聊天室', {
      author: mockUser(4),
      meta: { tier: '1', count: 5 },
    }),
  'twitch:gift-paid-upgrade': () =>
    notice('gift-paid-upgrade', 'subscription', 'okome_rice 繼續使用 MatchaLatte 送的訂閱', {
      author: mockUser(3),
      meta: { gifter: 'MatchaLatte' },
    }),
  'twitch:prime-paid-upgrade': () =>
    notice('prime-paid-upgrade', 'subscription', 'Mochi_Fan 從 Prime 升級成 Tier 1 訂閱', {
      author: mockUser(1),
      meta: { tier: '1' },
    }),
  'twitch:pay-it-forward': () =>
    notice('pay-it-forward', 'gift-subscription', 'okome_rice 把 MatchaLatte 的贈訂傳下去', {
      author: mockUser(3),
      meta: { gifter: 'MatchaLatte' },
    }),
  'twitch:raid': () =>
    notice('raid', 'raid', 'ShiroLive 帶著 42 位觀眾揪團過來了', { meta: { raider: 'ShiroLive', viewers: 42 } }),
  'twitch:unraid': () => notice('unraid', 'other', '揪團已取消'),
  'twitch:announcement': () =>
    notice('announcement', 'announcement', '公告', {
      author: mockUser(2),
      fragments: [{ type: 'text', text: '今晚 10 點抽獎，記得留在台上！' }],
    }),
  'twitch:bits-badge-tier': () =>
    notice('bits-badge-tier', 'other', 'Mochi_Fan 解鎖了 1,000 小奇點徽章', {
      author: mockUser(1),
      meta: { bitsTier: 1000 },
    }),
  'twitch:charity-donation': () =>
    notice('charity-donation', 'other', 'MatchaLatte 捐了 US$5.00 給茶園基金會', {
      author: mockUser(4),
      meta: { charity: '茶園基金會', donation: 5, currency: 'USD' },
    }),
  'twitch:watch-streak': () =>
    notice('watch-streak', 'watch-streak', 'okome_rice 已連續觀看 10 場直播', {
      author: mockUser(3),
      fragments: [{ type: 'text', text: '全勤！' }],
      meta: { watchStreak: 10, channelPoints: 350 },
    }),
};

/** A fresh sample of one event. Throws for an uncatalogued key, which is a programming error. */
export function sampleEvent(key: string): ChatEvent {
  const sample = EVENT_SAMPLES[key];
  if (!sample) throw new Error(`No preview sample for event "${key}"`);
  return sample();
}
