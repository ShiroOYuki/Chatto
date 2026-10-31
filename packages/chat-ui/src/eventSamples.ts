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
  'twitch:sub': () => notice('sub', 'subscription', 'Mochi_Fan 訂閱了（Tier 1）', { author: mockUser(1) }),
  'twitch:resub': () =>
    notice('resub', 'resubscription', 'Mochi_Fan 已訂閱 6 個月', {
      author: mockUser(1),
      fragments: [{ type: 'text', text: '每天都來喝茶 ☕' }],
      meta: { months: 6 },
    }),
  'twitch:sub-gift': () =>
    notice('sub-gift', 'gift-subscription', '熊熊管理員 送了一份訂閱給 okome_rice', { author: mockUser(2) }),
  'twitch:community-gift': () =>
    notice('community-gift', 'gift-subscription', 'MatchaLatte 送出 5 份訂閱給聊天室', {
      author: mockUser(4),
      meta: { count: 5 },
    }),
  'twitch:raid': () => notice('raid', 'raid', 'ShiroLive 帶著 42 位觀眾揪團過來了', { meta: { viewers: 42 } }),
  'twitch:announcement': () =>
    notice('announcement', 'announcement', '公告', {
      author: mockUser(2),
      fragments: [{ type: 'text', text: '今晚 10 點抽獎，記得留在台上！' }],
    }),
  'twitch:watch-streak': () =>
    notice('watch-streak', 'watch-streak', 'okome_rice 已連續觀看 10 場直播', {
      author: mockUser(3),
      fragments: [{ type: 'text', text: '全勤！' }],
    }),
};

/** A fresh sample of one event. Throws for an uncatalogued key, which is a programming error. */
export function sampleEvent(key: string): ChatEvent {
  const sample = EVENT_SAMPLES[key];
  if (!sample) throw new Error(`No preview sample for event "${key}"`);
  return sample();
}
