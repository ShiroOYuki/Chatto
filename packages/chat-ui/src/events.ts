import type { ChatMessage, ChatNotice, Localized, Locale, PlatformId } from '@chatto/core';

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
  label: Localized;
  description: Localized;
  category: EventCategory;
  /**
   * Built-in text template (see `eventText.ts`): the whole line of a notice, or
   * the title of an event message. Without one, the platform's own text shows.
   */
  text?: Localized;
  /** Variables the template can use (shown in the editor). */
  variables?: string[];
  /** The event's size (bits, viewers, gifts …), used by alert thresholds. */
  amount?: { label: Localized; read: (item: ChatMessage | ChatNotice) => number | undefined };
  /**
   * The cross-platform alert category this event belongs to (see {@link ALERT_CATEGORIES}).
   * Events without one are platform-only and get their own alert rule.
   */
  alertCategory?: AlertCategoryKey;
  /**
   * Another platform event whose alert rule this one shares (both Twitch
   * redemption kinds have one switch). Such events get no rule of their own.
   */
  alertRule?: string;
  /**
   * A channel points redemption (or a platform's equivalent): kept in the
   * control panel's redemption list, and shown in OBS only if the streamer allows it.
   */
  redemption?: boolean;
}

export interface PlatformEventGroup {
  platform: PlatformId;
  label: string;
  events: EventDefinition[];
}

/** Picks one language from localized text. */
export const lt = (text: Localized, locale: Locale) => text[locale];

const L = (zh: string, en: string, ja: string): Localized => ({ 'zh-TW': zh, en, ja });

export const eventKey = (platform: PlatformId, eventType: string) => `${platform}:${eventType}`;

/** The styling key of a message or notice, if it is an event. */
export function eventKeyOf(item: Pick<ChatMessage | ChatNotice, 'platform' | 'eventType'>): string | undefined {
  return item.eventType ? eventKey(item.platform, item.eventType) : undefined;
}

const twitch = (
  eventType: string,
  label: Localized,
  description: Localized,
  category: EventCategory,
  extra: Pick<EventDefinition, 'text' | 'variables' | 'amount' | 'alertCategory' | 'alertRule' | 'redemption'> = {},
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
  {
    key: 'any:tip',
    label: L('贊助', 'Tips', '投げ銭'),
    description: L('小奇點等附帶金額的訊息', 'Messages with bits or other money', 'ビッツなど金額つきのメッセージ'),
    amountLabel: L('數量', 'Amount', '数量'),
  },
  {
    key: 'any:sub',
    label: L('訂閱', 'Subscriptions', 'サブスク'),
    description: L('新訂閱', 'New subscriptions', '新規サブスク'),
  },
  {
    key: 'any:resub',
    label: L('續訂', 'Resubscriptions', 'サブスク継続'),
    description: L('續訂並分享', 'Shared resubscriptions', '共有されたサブスク継続'),
    amountLabel: L('累計月數', 'Total months', '累計月数'),
  },
  {
    key: 'any:gift',
    label: L('贈送訂閱', 'Gift subs', 'ギフトサブ'),
    description: L(
      '送訂閱給觀眾，含一次送多份',
      'Subs gifted to viewers, one or many at once',
      '視聴者へのギフトサブ（まとめて贈る場合も含む）',
    ),
    amountLabel: L('贈訂份數', 'Gifted subs', 'ギフトサブ数'),
  },
  {
    key: 'any:raid',
    label: L('揪團', 'Raids', 'レイド'),
    description: L('其他實況主帶觀眾過來', 'Another streamer brings their viewers', 'ほかの配信者が視聴者を連れてくる'),
    amountLabel: L('觀眾人數', 'Viewers', '視聴者数'),
  },
  {
    key: 'any:announcement',
    label: L('公告', 'Announcements', 'アナウンス'),
    description: L('管理員發布的公告', 'Announcements by moderators', 'モデレーターによるアナウンス'),
  },
] as const satisfies readonly { key: string; label: Localized; description: Localized; amountLabel?: Localized }[];

export type AlertCategoryKey = (typeof ALERT_CATEGORIES)[number]['key'];

/**
 * The alert rule key for an event: its cross-platform category, the event it
 * shares a rule with, or its own key.
 */
export function alertRuleKey(eventKey: string): string {
  const event = findEvent(eventKey);
  return event?.alertCategory ?? event?.alertRule ?? eventKey;
}

/** Platform-only events with a rule of their own (the per-platform sections of the alert rules). */
export function platformOnlyEvents(group: PlatformEventGroup): EventDefinition[] {
  return group.events.filter((event) => !event.alertCategory && !event.alertRule);
}

/** Whether a message or notice is a channel points redemption (see {@link EventDefinition.redemption}). */
export function isRedemption(item: Pick<ChatMessage | ChatNotice, 'platform' | 'eventType'>): boolean {
  const key = eventKeyOf(item);
  return key !== undefined && findEvent(key)?.redemption === true;
}

const SUB_VARIABLES = ['user', 'tier', 'duration'];
const REDEMPTION_VARIABLES = ['user', 'reward', 'cost'];

export const EVENT_CATALOG: PlatformEventGroup[] = [
  {
    platform: 'twitch',
    label: 'Twitch',
    events: [
      twitch(
        'cheer',
        L('小奇點（Cheer）', 'Cheer', 'ビッツ（Cheer）'),
        L('附帶小奇點的聊天訊息', 'A chat message with bits', 'ビッツつきのチャットメッセージ'),
        'message',
        {
          text: L('小奇點 ×{amount}', 'Cheer ×{amount}', 'ビッツ ×{amount}'),
          variables: ['user', 'amount'],
          amount: {
            label: L('小奇點', 'Bits', 'ビッツ'),
            read: (item) => ('cheerAmount' in item ? item.cheerAmount : undefined),
          },
          alertCategory: 'any:tip',
        },
      ),
      twitch(
        'highlighted',
        L('頻道點數強調訊息', 'Highlighted message', 'ハイライトメッセージ'),
        L(
          '用頻道點數兌換「強調我的訊息」',
          'Redeemed "Highlight My Message" with channel points',
          'チャンネルポイントで「メッセージをハイライト」と引き換え',
        ),
        'message',
        { text: L('頻道點數強調訊息', 'Highlighted message', 'ハイライトメッセージ'), variables: ['user'] },
      ),
      twitch('sub', L('訂閱', 'Sub', 'サブスク'), L('新訂閱', 'A new subscription', '新規サブスク'), 'notice', {
        text: L(
          '{user} 以 {tier} 訂閱了[，一次 {duration} 個月]',
          '{user} subscribed at {tier}[ for {duration} months]',
          '{user}が{tier}でサブスクしました[（{duration}か月分）]',
        ),
        variables: SUB_VARIABLES,
        alertCategory: 'any:sub',
      }),
      twitch(
        'resub',
        L('續訂', 'Resub', 'サブスク継続'),
        L('續訂並附上訊息', 'A resubscription with a message', 'メッセージつきのサブスク継続'),
        'notice',
        {
          text: L(
            '{user} 以 {tier} 續訂，累計 {months} 個月[，連續 {streak} 個月]',
            "{user} resubscribed at {tier}. They've subscribed for {months} {months|month|months}[, currently on a {streak} month streak]!",
            '{user}が{tier}でサブスクを継続しました（累計{months}か月[、{streak}か月連続]）',
          ),
          variables: [...SUB_VARIABLES, 'months', 'streak', 'gifter'],
          amount: { label: L('累計月數', 'Total months', '累計月数'), read: metaNumber('months') },
          alertCategory: 'any:resub',
        },
      ),
      twitch(
        'sub-gift',
        L('贈送訂閱', 'Gift sub', 'ギフトサブ'),
        L('送一份訂閱給特定觀眾', 'A sub gifted to one viewer', 'ひとりの視聴者へのギフトサブ'),
        'notice',
        {
          text: L(
            '{user} 送了一份 {tier} 訂閱給 {recipient}[（{duration} 個月）]',
            '{user} gifted a {tier} sub to {recipient}[ for {duration} months]!',
            '{user}が{recipient}に{tier}のギフトサブを贈りました[（{duration}か月分）]',
          ),
          variables: [...SUB_VARIABLES, 'recipient', 'totalGifts'],
          amount: { label: L('贈訂份數', 'Gifted subs', 'ギフトサブ数'), read: () => 1 },
          alertCategory: 'any:gift',
        },
      ),
      twitch(
        'community-gift',
        L('大量贈訂', 'Community gift', 'コミュニティギフト'),
        L('一次送多份訂閱給聊天室', 'Many subs gifted to the chat at once', 'チャットにまとめて贈るギフトサブ'),
        'notice',
        {
          text: L(
            '{user} 送出 {count} 份 {tier} 訂閱給聊天室[，累計已送 {totalGifts} 份]',
            "{user} is gifting {count} {tier} {count|sub|subs} to the community[. They've gifted {totalGifts} in the channel]!",
            '{user}がコミュニティに{tier}のギフトサブを{count}個贈りました[（チャンネルで累計{totalGifts}個）]',
          ),
          variables: ['user', 'tier', 'count', 'totalGifts'],
          amount: { label: L('贈訂份數', 'Gifted subs', 'ギフトサブ数'), read: metaNumber('count') },
          alertCategory: 'any:gift',
        },
      ),
      twitch(
        'gift-paid-upgrade',
        L('贈訂轉付費', 'Gift sub continued', 'ギフトサブを継続'),
        L(
          '收到贈訂的觀眾自己續訂',
          'A viewer keeps the sub they were gifted',
          'ギフトされたサブスクを視聴者が自分で継続',
        ),
        'notice',
        {
          text: L(
            '{user} 繼續使用 {gifter} 送的訂閱',
            '{user} is continuing the gift sub they got from {gifter}!',
            '{user}が{gifter}から贈られたギフトサブを継続しました',
          ),
          variables: ['user', 'gifter'],
          alertCategory: 'any:sub',
        },
      ),
      twitch(
        'prime-paid-upgrade',
        L('Prime 轉付費', 'Prime upgrade', 'Primeからアップグレード'),
        L(
          '從 Prime 訂閱升級成付費訂閱',
          'A Prime sub upgraded to a paid one',
          'Primeサブスクを有料サブスクにアップグレード',
        ),
        'notice',
        {
          text: L(
            '{user} 從 Prime 升級成 {tier} 訂閱',
            '{user} upgraded their Prime sub to {tier}!',
            '{user}がPrimeサブスクを{tier}にアップグレードしました',
          ),
          variables: ['user', 'tier'],
          alertCategory: 'any:sub',
        },
      ),
      twitch(
        'pay-it-forward',
        L('贈訂傳下去', 'Pay it forward', 'ギフトの恩送り'),
        L(
          '收到贈訂後也送一份給別人',
          'A gifted viewer gifts a sub in return',
          'ギフトを受け取った視聴者がほかの人にも贈る',
        ),
        'notice',
        {
          text: L(
            '{user} 把 {gifter} 的贈訂傳下去',
            '{user} is paying forward the gift they got from {gifter}!',
            '{user}が{gifter}から受け取ったギフトを恩送りしました',
          ),
          variables: ['user', 'gifter'],
          amount: { label: L('贈訂份數', 'Gifted subs', 'ギフトサブ数'), read: () => 1 },
          alertCategory: 'any:gift',
        },
      ),
      twitch(
        'raid',
        L('揪團（Raid）', 'Raid', 'レイド'),
        L('其他實況主帶觀眾過來', 'Another streamer brings their viewers', 'ほかの配信者が視聴者を連れてくる'),
        'notice',
        {
          text: L(
            '{raider} 帶著 {viewers} 位觀眾揪團過來了',
            '{raider} is raiding with {viewers} {viewers|viewer|viewers}!',
            '{raider}が{viewers}人の視聴者とレイドに来ました',
          ),
          variables: ['raider', 'viewers'],
          amount: { label: L('觀眾人數', 'Viewers', '視聴者数'), read: metaNumber('viewers') },
          alertCategory: 'any:raid',
        },
      ),
      twitch(
        'unraid',
        L('取消揪團', 'Raid canceled', 'レイドの取り消し'),
        L('實況主取消了揪團', 'The streamer canceled a raid', '配信者によるレイドの取り消し'),
        'notice',
        {
          text: L('揪團已取消', 'The raid was canceled', 'レイドが取り消されました'),
        },
      ),
      twitch(
        'announcement',
        L('公告', 'Announcement', 'アナウンス'),
        L('管理員發布的公告', 'An announcement by a moderator', 'モデレーターによるアナウンス'),
        'notice',
        {
          text: L('公告', 'Announcement', 'アナウンス'),
          variables: ['user'],
          alertCategory: 'any:announcement',
        },
      ),
      twitch(
        'bits-badge-tier',
        L('小奇點徽章', 'Bits badge', 'ビッツバッジ'),
        L('觀眾解鎖新的小奇點徽章', 'A viewer unlocked a new bits badge', '視聴者が新しいビッツバッジを獲得'),
        'notice',
        {
          text: L(
            '{user} 解鎖了 {bitsTier} 小奇點徽章',
            '{user} just earned a new {bitsTier} bits badge!',
            '{user}が{bitsTier}ビッツバッジを獲得しました',
          ),
          variables: ['user', 'bitsTier'],
        },
      ),
      twitch(
        'charity-donation',
        L('慈善捐款', 'Charity donation', 'チャリティー寄付'),
        L('觀眾為慈善活動捐款', 'A viewer donated to a charity campaign', '視聴者がチャリティーキャンペーンに寄付'),
        'notice',
        {
          text: L(
            '{user} 捐了 {donation} 給 {charity}',
            '{user} donated {donation} to {charity}!',
            '{user}が{charity}に{donation}を寄付しました',
          ),
          variables: ['user', 'donation', 'charity'],
        },
      ),
      twitch(
        'watch-streak',
        L('觀看連勝', 'Watch streak', '連続視聴'),
        L('觀眾分享連續觀看紀錄', 'A viewer shares their watch streak', '視聴者が連続視聴の記録を共有'),
        'notice',
        {
          text: L(
            '{user} 已連續觀看 {watchStreak} 場直播',
            '{user} watched {watchStreak} consecutive {watchStreak|stream|streams} and sparked a watch streak!',
            '{user}が{watchStreak}回連続で配信を視聴しました',
          ),
          variables: ['user', 'watchStreak', 'channelPoints'],
        },
      ),
      twitch(
        'redemption',
        L('忠誠點數兌換', 'Channel points reward', 'チャンネルポイントの引き換え'),
        L(
          '你建立的獎勵與 Twitch 內建獎勵',
          "Your own rewards and Twitch's built-in ones",
          '自分で作成した報酬とTwitch標準の報酬',
        ),
        'notice',
        {
          text: L('{user} 兌換了「{reward}」', '{user} redeemed {reward}', '{user}が「{reward}」を引き換えました'),
          variables: REDEMPTION_VARIABLES,
          amount: { label: L('點數', 'Points', 'ポイント'), read: metaNumber('cost') },
          redemption: true,
        },
      ),
      twitch(
        'auto-redemption',
        L('自動獎勵兌換', 'Twitch reward', 'Twitch報酬の引き換え'),
        L(
          '觀眾兌換 Twitch 內建的獎勵，例如解鎖表情符號',
          "A viewer redeems one of Twitch's own rewards, like an emote unlock",
          '視聴者がTwitch標準の報酬（エモートのアンロックなど）を引き換え',
        ),
        'notice',
        {
          text: L(
            '{user} 兌換了「{reward}」[：{emote}]',
            '{user} redeemed {reward}[: {emote}]',
            '{user}が「{reward}」を引き換えました[：{emote}]',
          ),
          variables: [...REDEMPTION_VARIABLES, 'emote'],
          amount: { label: L('點數', 'Points', 'ポイント'), read: metaNumber('cost') },
          alertRule: 'twitch:redemption',
          redemption: true,
        },
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
