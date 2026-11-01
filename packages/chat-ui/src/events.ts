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
  /**
   * The cross-platform alert category this event belongs to (see {@link ALERT_CATEGORIES}).
   * Events without one are platform-only and get their own alert rule.
   */
  alertCategory?: AlertCategoryKey;
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
  extra: Pick<EventDefinition, 'title' | 'amount' | 'alertCategory'> = {},
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

/**
 * Cross-platform alert categories (the 通用 section of the alert rules).
 * Each platform maps its events onto these with `alertCategory`, so one rule
 * covers e.g. subscriptions on every platform. Keys are `any:<category>`.
 */
export const ALERT_CATEGORIES = [
  { key: 'any:tip', label: '贊助', description: '小奇點等附帶金額的訊息', amountLabel: '數量' },
  { key: 'any:sub', label: '訂閱', description: '新訂閱' },
  { key: 'any:resub', label: '續訂', description: '續訂並分享', amountLabel: '累計月數' },
  { key: 'any:gift', label: '贈送訂閱', description: '送訂閱給觀眾，含一次送多份', amountLabel: '贈訂份數' },
  { key: 'any:raid', label: '揪團', description: '其他實況主帶觀眾過來', amountLabel: '觀眾人數' },
  { key: 'any:announcement', label: '公告', description: '管理員發布的公告' },
] as const satisfies readonly { key: string; label: string; description: string; amountLabel?: string }[];

export type AlertCategoryKey = (typeof ALERT_CATEGORIES)[number]['key'];

/** The alert rule key for an event: its cross-platform category, or its own key when it has none. */
export function alertRuleKey(eventKey: string): string {
  return findEvent(eventKey)?.alertCategory ?? eventKey;
}

/** Platform-only events, which have their own alert rules (the per-platform sections). */
export function platformOnlyEvents(group: PlatformEventGroup): EventDefinition[] {
  return group.events.filter((event) => !event.alertCategory);
}

export const EVENT_CATALOG: PlatformEventGroup[] = [
  {
    platform: 'twitch',
    label: 'Twitch',
    events: [
      twitch('cheer', '小奇點（Cheer）', '附帶小奇點的聊天訊息', 'message', {
        title: (message) => `小奇點 ×${message.cheerAmount ?? 0}`,
        amount: { label: '小奇點', read: (item) => ('cheerAmount' in item ? item.cheerAmount : undefined) },
        alertCategory: 'any:tip',
      }),
      twitch('highlighted', '頻道點數強調訊息', '用頻道點數兌換「強調我的訊息」', 'message', {
        title: () => '頻道點數強調訊息',
      }),
      twitch('sub', '訂閱', '新訂閱', 'notice', { alertCategory: 'any:sub' }),
      twitch('resub', '續訂', '續訂並附上訊息', 'notice', {
        amount: { label: '累計月數', read: metaNumber('months') },
        alertCategory: 'any:resub',
      }),
      twitch('sub-gift', '贈送訂閱', '送一份訂閱給特定觀眾', 'notice', {
        amount: { label: '贈訂份數', read: () => 1 },
        alertCategory: 'any:gift',
      }),
      twitch('community-gift', '大量贈訂', '一次送多份訂閱給聊天室', 'notice', {
        amount: { label: '贈訂份數', read: metaNumber('count') },
        alertCategory: 'any:gift',
      }),
      twitch('raid', '揪團（Raid）', '其他實況主帶觀眾過來', 'notice', {
        amount: { label: '觀眾人數', read: metaNumber('viewers') },
        alertCategory: 'any:raid',
      }),
      twitch('announcement', '公告', '管理員發布的公告', 'notice', { alertCategory: 'any:announcement' }),
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
