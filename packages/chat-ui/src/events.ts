import type { ChatEvent, ChatMessage, ChatNotice, PlatformId } from '@chatto/core';
import { mockEmote, mockMessage, mockNotice, mockUser } from './mock';

/**
 * Platform event catalog. Every platform-specific event (Twitch cheers, subs,
 * raids …) is listed here once and identified by `${platform}:${eventType}`.
 * The theme editor builds its "platform components" menus from this list,
 * themes key their per-event overrides by it, and the CSS generator targets
 * `[data-event="<key>"]`. Adding a platform = adding a group here.
 */

export type EventCategory =
  /** A system notice (`.chatto-notice`). */
  | 'notice'
  /** A chat message that is also an event (`.chatto-message[data-event]`). */
  | 'message';

export interface EventDefinition {
  key: string;
  platform: PlatformId;
  eventType: string;
  label: string;
  description: string;
  category: EventCategory;
  /** Title line for message events; notices use their own system text. */
  title?: (message: ChatMessage) => string;
  /** A sample of this event for previews. */
  sample(): ChatEvent;
}

export interface PlatformEventGroup {
  platform: PlatformId;
  label: string;
  events: EventDefinition[];
}

export const eventKey = (platform: PlatformId, eventType: string) => `${platform}:${eventType}`;

/** The styling key of a message or notice, if it is an event. */
export function eventKeyOf(item: Pick<ChatMessage | ChatNotice, 'platform' | 'eventType'>): string | undefined {
  return item.eventType ? eventKey(item.platform, item.eventType) : undefined;
}

const notice = (
  eventType: string,
  kind: ChatNotice['kind'],
  systemText: string,
  extra: Partial<ChatNotice> = {},
): ChatEvent => ({ type: 'notice', notice: mockNotice({ eventType, kind, systemText, ...extra }) });

const twitch = (
  eventType: string,
  label: string,
  description: string,
  category: EventCategory,
  sample: () => ChatEvent,
  title?: (message: ChatMessage) => string,
): EventDefinition => ({
  key: eventKey('twitch', eventType),
  platform: 'twitch',
  eventType,
  label,
  description,
  category,
  sample,
  title,
});

export const EVENT_CATALOG: PlatformEventGroup[] = [
  {
    platform: 'twitch',
    label: 'Twitch',
    events: [
      twitch(
        'cheer',
        '小奇點（Cheer）',
        '附帶小奇點的聊天訊息',
        'message',
        () => ({
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
        (message) => `小奇點 ×${message.cheerAmount ?? 0}`,
      ),
      twitch(
        'highlighted',
        '頻道點數強調訊息',
        '用頻道點數兌換「強調我的訊息」',
        'message',
        () => ({
          type: 'message',
          message: mockMessage(mockUser(4), [{ type: 'text', text: '用點數幫大家點一杯抹茶！' }], {
            eventType: 'highlighted',
            highlights: ['highlighted'],
          }),
        }),
        () => '頻道點數強調訊息',
      ),
      twitch('sub', '訂閱', '新訂閱', 'notice', () =>
        notice('sub', 'subscription', 'Mochi_Fan 訂閱了（Tier 1）', { author: mockUser(1) }),
      ),
      twitch('resub', '續訂', '續訂並附上訊息', 'notice', () =>
        notice('resub', 'resubscription', 'Mochi_Fan 已訂閱 6 個月', {
          author: mockUser(1),
          fragments: [{ type: 'text', text: '每天都來喝茶 ☕' }],
          meta: { months: 6 },
        }),
      ),
      twitch('sub-gift', '贈送訂閱', '送一份訂閱給特定觀眾', 'notice', () =>
        notice('sub-gift', 'gift-subscription', '熊熊管理員 送了一份訂閱給 okome_rice', { author: mockUser(2) }),
      ),
      twitch('community-gift', '大量贈訂', '一次送多份訂閱給聊天室', 'notice', () =>
        notice('community-gift', 'gift-subscription', 'MatchaLatte 送出 5 份訂閱給聊天室', {
          author: mockUser(4),
          meta: { count: 5 },
        }),
      ),
      twitch('raid', '揪團（Raid）', '其他實況主帶觀眾過來', 'notice', () =>
        notice('raid', 'raid', 'ShiroLive 帶著 42 位觀眾揪團過來了', { meta: { viewers: 42 } }),
      ),
      twitch('announcement', '公告', '管理員發布的公告', 'notice', () =>
        notice('announcement', 'announcement', '公告', {
          author: mockUser(2),
          fragments: [{ type: 'text', text: '今晚 10 點抽獎，記得留在台上！' }],
        }),
      ),
      twitch('watch-streak', '觀看連勝', '觀眾分享連續觀看紀錄', 'notice', () =>
        notice('watch-streak', 'watch-streak', 'okome_rice 已連續觀看 10 場直播', {
          author: mockUser(3),
          fragments: [{ type: 'text', text: '全勤！' }],
        }),
      ),
    ],
  },
];

export function findEvent(key: string): EventDefinition | undefined {
  for (const group of EVENT_CATALOG) {
    const event = group.events.find((item) => item.key === key);
    if (event) return event;
  }
  return undefined;
}
