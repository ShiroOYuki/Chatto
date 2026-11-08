import {
  DEFAULT_LOCALE,
  type ChatMessage,
  type ChatNotice,
  type ChatTheme,
  type Locale,
  type Localized,
} from '@chatto/core';
import { eventKeyOf, findEvent } from './events';

/**
 * Event text templates. Built-in texts and the theme's own (`theme.eventText`)
 * share one small syntax:
 *
 * - `{name}` inserts a variable (numbers are formatted for the language);
 * - `{name|one|other}` picks the singular or plural word for the variable's
 *   number, without printing the number (English plurals);
 * - `[ … ]` is optional: it shows only when every variable inside has a value.
 *
 * A variable outside brackets that has no value makes the whole template
 * fail, and the caller falls back to the platform's own text.
 */

export type TemplateVars = Record<string, string | number | undefined>;

const PLACEHOLDER = /\{(\w+)(?:\|([^|}]*)\|([^}]*))?\}/g;
const OPTIONAL = /\[([^\]]*)\]/g;

/** Fills one template, or returns null when a required variable is missing. */
export function renderTemplate(template: string, vars: TemplateVars, locale: Locale = DEFAULT_LOCALE): string | null {
  const numbers = new Intl.NumberFormat(locale);
  const plurals = new Intl.PluralRules(locale);
  let missing = false;
  const fill = (text: string) =>
    text.replace(PLACEHOLDER, (_match, name: string, one?: string, other?: string) => {
      const value = vars[name];
      if (value === undefined || value === '') {
        missing = true;
        return '';
      }
      if (one !== undefined) return plurals.select(Number(value)) === 'one' ? one : (other ?? '');
      return typeof value === 'number' ? numbers.format(value) : value;
    });

  const withOptional = template.replace(OPTIONAL, (_match, inner: string) => {
    const before = missing;
    missing = false;
    const filled = fill(inner);
    const keep = !missing;
    missing = before;
    return keep ? filled : '';
  });
  const result = fill(withOptional);
  return missing ? null : result;
}

/** The variable names a template uses, for the editor's hints and checks. */
export function templateVariables(template: string): string[] {
  return [...new Set([...template.matchAll(PLACEHOLDER)].map((match) => match[1]!))];
}

// ---------- variables ----------

/** What each template variable stands for, shown when picking variables in the editor. */
export const TEMPLATE_VARIABLES: Record<string, Localized> = {
  user: {
    'zh-TW': '發出事件的人（匿名時為「匿名觀眾」）',
    en: 'Who triggered the event ("An anonymous user" if hidden)',
    ja: 'イベントを起こした人（非公開の場合は「匿名の視聴者」）',
  },
  amount: { 'zh-TW': '小奇點數量', en: 'Number of bits', ja: 'ビッツの数' },
  tier: {
    'zh-TW': '訂閱等級，例如 Tier 1、Prime',
    en: 'Sub tier, such as Tier 1 or Prime',
    ja: 'サブスクのティア（Tier 1、Primeなど）',
  },
  months: { 'zh-TW': '累計訂閱月數', en: 'Total months subscribed', ja: '累計サブスク月数' },
  streak: {
    'zh-TW': '連續訂閱月數（觀眾選擇不公開時沒有）',
    en: 'Months in a row (missing if the viewer hides it)',
    ja: '連続サブスク月数（視聴者が非公開にしている場合はなし）',
  },
  duration: {
    'zh-TW': '一次買或送了幾個月（多於 1 個月時才有）',
    en: 'Months bought or gifted at once (only when more than 1)',
    ja: '一度に購入またはギフトした月数（1か月より多い場合のみ）',
  },
  recipient: { 'zh-TW': '收到贈訂的人', en: 'Who received the gift sub', ja: 'ギフトサブを受け取った人' },
  gifter: { 'zh-TW': '當初送訂閱的人', en: 'Who gifted the sub originally', ja: '最初にサブスクを贈った人' },
  count: { 'zh-TW': '這次送出幾份訂閱', en: 'Subs gifted this time', ja: '今回贈ったサブスクの数' },
  totalGifts: {
    'zh-TW': '送禮者在頻道累計送了幾份（匿名時沒有）',
    en: 'Subs the gifter has given in the channel (missing if anonymous)',
    ja: 'ギフトした人がチャンネルで贈った累計数（匿名の場合はなし）',
  },
  viewers: { 'zh-TW': '揪團帶來的觀眾人數', en: 'Viewers the raid brings', ja: 'レイドで来た視聴者数' },
  raider: { 'zh-TW': '揪團的實況主', en: 'The streamer raiding', ja: 'レイドしてきた配信者' },
  bitsTier: { 'zh-TW': '解鎖的小奇點徽章等級', en: 'The bits badge tier unlocked', ja: '獲得したビッツバッジのティア' },
  charity: { 'zh-TW': '慈善單位名稱', en: 'The charity', ja: 'チャリティー団体の名前' },
  donation: { 'zh-TW': '捐款金額（含貨幣）', en: 'The amount donated, with currency', ja: '寄付額（通貨つき）' },
  watchStreak: { 'zh-TW': '連續觀看的直播場數', en: 'Streams watched in a row', ja: '連続で視聴した配信の回数' },
  channelPoints: {
    'zh-TW': '觀看連勝獲得的忠誠點數',
    en: 'Channel Points awarded for the watch streak',
    ja: '連続視聴で獲得したチャンネルポイント',
  },
  reward: { 'zh-TW': '兌換的獎勵名稱', en: 'The reward redeemed', ja: '引き換えた報酬の名前' },
  cost: { 'zh-TW': '花費的忠誠點數', en: 'Channel Points spent', ja: '使ったチャンネルポイント' },
  emote: {
    'zh-TW': '解鎖或放大的表情符號（有的才有）',
    en: 'The emote unlocked or used (when there is one)',
    ja: 'アンロックまたは使用したエモート（ある場合のみ）',
  },
};

/**
 * Names of Twitch's automatic rewards (`meta.rewardType`), since their
 * redemptions carry only a type. Unknown types fall back to the platform text.
 */
export const AUTO_REWARD_NAMES: Record<string, Localized> = {
  single_message_bypass_sub_mode: {
    'zh-TW': '在訂閱者模式傳送訊息',
    en: 'Send a Message in Sub-Only Mode',
    ja: 'サブスク限定モードでメッセージを送信',
  },
  send_highlighted_message: { 'zh-TW': '強調我的訊息', en: 'Highlight My Message', ja: 'メッセージをハイライト' },
  random_sub_emote_unlock: {
    'zh-TW': '隨機解鎖表情符號',
    en: 'Unlock a Random Sub Emote',
    ja: 'ランダムなサブスクエモートをアンロック',
  },
  chosen_sub_emote_unlock: {
    'zh-TW': '選擇解鎖表情符號',
    en: 'Choose an Emote to Unlock',
    ja: 'アンロックするエモートを選択',
  },
  chosen_modified_sub_emote_unlock: { 'zh-TW': '修改表情符號', en: 'Modify a Single Emote', ja: 'エモートを1つ変更' },
  message_effect: { 'zh-TW': '訊息特效', en: 'Message Effects', ja: 'メッセージエフェクト' },
  gigantify_an_emote: { 'zh-TW': '放大表情符號', en: 'Gigantify an Emote', ja: 'エモートを巨大化' },
  celebration: { 'zh-TW': '螢幕慶祝特效', en: 'On-Screen Celebration', ja: 'オンスクリーンセレブレーション' },
};

/** A redemption's reward name: its own title, or the name of a Twitch reward type. */
export function rewardName(meta: ChatNotice['meta'], locale: Locale): string | undefined {
  if (typeof meta.reward === 'string' && meta.reward) return meta.reward;
  return typeof meta.rewardType === 'string' ? AUTO_REWARD_NAMES[meta.rewardType]?.[locale] : undefined;
}

const ANONYMOUS: Record<Locale, string> = { 'zh-TW': '匿名觀眾', en: 'An anonymous user', ja: '匿名の視聴者' };
const ANONYMOUS_GIFTER: Record<Locale, string> = { 'zh-TW': '匿名觀眾', en: 'an anonymous gifter', ja: '匿名の視聴者' };

/** `meta.tier` (`1`, `2`, `3`, `prime`) as shown in text. */
export function tierLabel(tier: unknown): string | undefined {
  if (tier === 'prime') return 'Prime';
  if (tier === '1' || tier === '2' || tier === '3') return `Tier ${tier}`;
  return undefined;
}

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

/** Variables a notice offers to templates. See docs/message-format.md for the meta keys. */
export function noticeVariables(notice: ChatNotice, locale: Locale): TemplateVars {
  const { meta } = notice;
  const currency = text(meta.currency);
  const donation = count(meta.donation);
  return {
    user: notice.author?.displayName ?? (meta.anonymous ? ANONYMOUS[locale] : undefined),
    tier: tierLabel(meta.tier),
    months: count(meta.months),
    streak: count(meta.streakMonths),
    duration: count(meta.durationMonths),
    recipient: text(meta.recipient),
    gifter: text(meta.gifter) ?? (meta.gifterAnonymous ? ANONYMOUS_GIFTER[locale] : undefined),
    count: count(meta.count),
    totalGifts: count(meta.totalGifts),
    viewers: count(meta.viewers),
    raider: text(meta.raider) ?? notice.author?.displayName,
    bitsTier: count(meta.bitsTier),
    charity: text(meta.charity),
    watchStreak: count(meta.watchStreak),
    channelPoints: count(meta.channelPoints),
    reward: rewardName(meta, locale),
    cost: count(meta.cost),
    emote: text(meta.emote),
    donation:
      donation === undefined
        ? undefined
        : currency
          ? new Intl.NumberFormat(locale, { style: 'currency', currency }).format(donation)
          : donation,
  };
}

/** Variables an event message (a cheer …) offers to its title template. */
export function messageVariables(message: ChatMessage): TemplateVars {
  return { user: message.author.displayName, amount: message.cheerAmount };
}

// ---------- texts ----------

/** The theme's own template for an event, if it set one. */
const themeTemplate = (theme: ChatTheme | undefined, key: string | undefined) =>
  key ? theme?.eventText?.[key]?.trim() || undefined : undefined;

/**
 * The line a notice shows: the theme's template, else the built-in one for the
 * language, else the platform's own text.
 */
export function noticeText(notice: ChatNotice, locale: Locale = DEFAULT_LOCALE, theme?: ChatTheme): string {
  const key = eventKeyOf(notice);
  const vars = noticeVariables(notice, locale);
  for (const template of [themeTemplate(theme, key), key ? findEvent(key)?.text?.[locale] : undefined]) {
    const rendered = template ? renderTemplate(template, vars, locale) : null;
    if (rendered) return rendered;
  }
  return notice.systemText;
}

/** The title an event message shows (e.g. "Cheer ×100"), or undefined for plain messages. */
export function eventTitle(
  message: ChatMessage,
  locale: Locale = DEFAULT_LOCALE,
  theme?: ChatTheme,
): string | undefined {
  const key = eventKeyOf(message);
  if (!key) return undefined;
  const vars = messageVariables(message);
  for (const template of [themeTemplate(theme, key), findEvent(key)?.text?.[locale]]) {
    const rendered = template ? renderTemplate(template, vars, locale) : null;
    if (rendered) return rendered;
  }
  return message.eventType;
}
