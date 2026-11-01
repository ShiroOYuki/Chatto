import type { ChatMessage, ChatNotice, PlatformId } from '@chatto/core';

/**
 * Platform event catalog. Every platform-specific event (Twitch cheers, subs,
 * raids …) is listed here once and identified by `${platform}:${eventType}`.
 * The theme editor builds its "platform components" menus from this list,
 * themes key their per-event overrides by it, and the CSS generator targets
 * `[data-event="<key>"]`. Adding a platform = adding a group here and its
 * previews in `eventSamples.ts`.
 *
 * This module holds definitions only, so the renderer can use it without
 * pulling in preview data.
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
  /** The event's size (bits, viewers, gifts …), used by alert thresholds. */
  amount?: { label: string; read: (item: ChatMessage | ChatNotice) => number | undefined };
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

const twitch = (
  eventType: string,
  label: string,
  description: string,
  category: EventCategory,
  extra: Pick<EventDefinition, 'title' | 'amount'> = {},
): EventDefinition => ({
  key: eventKey('twitch', eventType),
  platform: 'twitch',
  eventType,
  label,
  description,
  category,
  ...extra,
});

/** Reads a number from a notice's normalized `meta`. */
const metaNumber =
  (key: string) =>
  (item: ChatMessage | ChatNotice): number | undefined => {
    const value = 'meta' in item ? item.meta[key] : undefined;
    return typeof value === 'number' ? value : undefined;
  };

export const EVENT_CATALOG: PlatformEventGroup[] = [
  {
    platform: 'twitch',
    label: 'Twitch',
    events: [
      twitch('cheer', '小奇點（Cheer）', '附帶小奇點的聊天訊息', 'message', {
        title: (message) => `小奇點 ×${message.cheerAmount ?? 0}`,
        amount: { label: '小奇點', read: (item) => ('cheerAmount' in item ? item.cheerAmount : undefined) },
      }),
      twitch('highlighted', '頻道點數強調訊息', '用頻道點數兌換「強調我的訊息」', 'message', {
        title: () => '頻道點數強調訊息',
      }),
      twitch('sub', '訂閱', '新訂閱', 'notice'),
      twitch('resub', '續訂', '續訂並附上訊息', 'notice', {
        amount: { label: '累計月數', read: metaNumber('months') },
      }),
      twitch('sub-gift', '贈送訂閱', '送一份訂閱給特定觀眾', 'notice'),
      twitch('community-gift', '大量贈訂', '一次送多份訂閱給聊天室', 'notice', {
        amount: { label: '贈訂份數', read: metaNumber('count') },
      }),
      twitch('raid', '揪團（Raid）', '其他實況主帶觀眾過來', 'notice', {
        amount: { label: '觀眾人數', read: metaNumber('viewers') },
      }),
      twitch('announcement', '公告', '管理員發布的公告', 'notice'),
      twitch('watch-streak', '觀看連勝', '觀眾分享連續觀看紀錄', 'notice'),
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
