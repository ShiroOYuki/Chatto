import type { Localized } from '@chatto/core';
import { EVENT_CATALOG } from './events';

/**
 * Human-readable reference of the public chat markup: every `chatto-*` class
 * and `data-*` attribute that custom CSS can target. Used by the theme
 * editor (chips, autocomplete, inspector labels), the reference files written
 * for external editors, and mirrored in docs/theming.md.
 */

export interface SelectorReference {
  selector: string;
  label: Localized;
  description: Localized;
}

const L = (zh: string, en: string): Localized => ({ 'zh-TW': zh, en });
const entry = (selector: string, label: Localized, description: Localized): SelectorReference => ({
  selector,
  label,
  description,
});

export const CLASS_REFERENCE: SelectorReference[] = [
  entry(
    '.chatto-root',
    L('根元素', 'Root'),
    L('整個聊天室，字型與文字顏色從這裡繼承', 'The whole chat; font and text color inherit from here'),
  ),
  entry('.chatto-list', L('面板', 'Panel'), L('包住所有訊息的清單（<ol>）', 'The list holding every message (<ol>)')),
  entry('.chatto-message', L('訊息', 'Message'), L('一則聊天訊息（<li>）', 'One chat message (<li>)')),
  entry('.chatto-avatar', L('頭像', 'Avatar'), L('訊息左側的頭像', 'The avatar left of a message')),
  entry(
    '.chatto-content',
    L('訊息內容區', 'Message content'),
    L('頭像以外的部分：回覆、標題列、內容', 'Everything but the avatar: reply, header and body'),
  ),
  entry(
    '.chatto-event-title',
    L('事件標題', 'Event title'),
    L(
      '事件訊息（如小奇點）的標題，可在上方一行或做成角落貼紙',
      'Title of an event message (such as a cheer), on its own line or as a corner sticker',
    ),
  ),
  entry('.chatto-reply', L('回覆引用', 'Reply'), L('回覆別人時顯示的原訊息', 'The message being replied to')),
  entry('.chatto-header', L('名稱框', 'Header'), L('時間、徽章、名稱與分隔符號', 'Time, badges, name and separator')),
  entry('.chatto-time', L('時間', 'Time'), L('訊息時間', 'When the message was sent')),
  entry('.chatto-badges', L('徽章群組', 'Badges'), L('所有徽章的容器', 'Holds every badge')),
  entry(
    '.chatto-badge',
    L('徽章', 'Badge'),
    L('單一徽章圖片，可用 [data-badge] 區分', 'One badge image; tell them apart with [data-badge]'),
  ),
  entry('.chatto-author', L('名稱', 'Name'), L('發言者顯示名稱', "The author's display name")),
  entry(
    '.chatto-separator',
    L('分隔符號', 'Separator'),
    L('名稱與內容之間，內容來自 ::after', 'Between name and body; its text comes from ::after'),
  ),
  entry('.chatto-body', L('內容', 'Body'), L('訊息本文', 'The message text')),
  entry('.chatto-emote', L('表情符號', 'Emote'), L('訊息裡的表情圖片', 'An emote image in a message')),
  entry('.chatto-mention', L('提及', 'Mention'), L('@某人', '@someone')),
  entry('.chatto-link', L('連結', 'Link'), L('訊息裡的網址', 'A URL in a message')),
  entry(
    '.chatto-cheer',
    L('小奇點數量', 'Cheer amount'),
    L('訊息裡的 Cheer100 等', 'Cheer100 and the like in a message'),
  ),
  entry('.chatto-media', L('媒體', 'Media'), L('GIF 等圖片內容', 'GIFs and other images')),
  entry(
    '.chatto-notice',
    L('事件通知', 'Notice'),
    L('訂閱、揪團、公告等系統通知（<li>）', 'System notices such as subs, raids and announcements (<li>)'),
  ),
  entry('.chatto-notice-system', L('通知標題', 'Notice text'), L('事件通知的系統文字', 'The text line of a notice')),
];

export const ATTRIBUTE_REFERENCE: SelectorReference[] = [
  entry('[data-roles~="broadcaster"]', L('實況主', 'Broadcaster'), L('訊息作者是實況主', 'Sent by the broadcaster')),
  entry(
    ':not([data-roles~="broadcaster"]):not([data-roles~="moderator"]):not([data-roles~="vip"]):not([data-roles~="subscriber"]):not([data-roles~="founder"])',
    L('一般觀眾', 'Viewer'),
    L(
      '訊息作者不是實況主、管理員、VIP 或訂閱者',
      'Sent by someone who is not the broadcaster, a moderator, a VIP or a subscriber',
    ),
  ),
  entry('[data-roles~="moderator"]', L('管理員', 'Moderator'), L('訊息作者是管理員', 'Sent by a moderator')),
  entry('[data-roles~="vip"]', L('VIP', 'VIP'), L('訊息作者是 VIP', 'Sent by a VIP')),
  entry('[data-roles~="subscriber"]', L('訂閱者', 'Subscriber'), L('訊息作者是訂閱者', 'Sent by a subscriber')),
  entry(
    '[data-highlight~="first-message"]',
    L('首次發言', 'First message'),
    L('第一次在頻道發言', 'Their first message in the channel'),
  ),
  entry(
    '[data-highlight~="after-silence"]',
    L('沉寂後的新留言', 'After a quiet spell'),
    L(
      '聊天室安靜一段時間後的第一則留言（只在桌面 Overlay）',
      'The first message after chat was quiet (desktop overlay only)',
    ),
  ),
  entry(
    '.chatto-root[data-leaving]',
    L('提醒卡片離場', 'Alert card leaving'),
    L('事件 Overlay 的卡片時間到、正在離場', 'An alert card whose time is up, on its way out'),
  ),
  entry('[data-action]', L('/me 動作', '/me action'), L('用 /me 發送的訊息', 'A message sent with /me')),
  entry('[data-user="login"]', L('特定使用者', 'One user'), L('以登入名稱指定使用者', 'Pick a user by login name')),
  entry(
    '[data-platform="twitch"]',
    L('平台', 'Platform'),
    L('訊息或通知來自的平台', 'Where a message or notice came from'),
  ),
  entry('[data-event]', L('任何事件', 'Any event'), L('所有事件訊息與通知', 'Every event message and notice')),
  entry('[data-badge="subscriber"]', L('特定徽章', 'One badge'), L('用在 .chatto-badge 上', 'Use on .chatto-badge')),
];

/** One `[data-event="…"]` entry per catalogued platform event. */
export const EVENT_REFERENCE: SelectorReference[] = EVENT_CATALOG.flatMap((group) =>
  group.events.map((event) =>
    entry(
      `[data-event="${event.key}"]`,
      { 'zh-TW': `${group.label}・${event.label['zh-TW']}`, en: `${group.label} · ${event.label.en}` },
      event.description,
    ),
  ),
);

/** CSS custom properties the renderer sets, which custom CSS can read. */
export const VARIABLE_REFERENCE: { name: string; description: Localized }[] = [
  {
    name: '--chatto-user-color',
    description: L(
      '發言者在平台上設定的名稱顏色，設在 .chatto-author 上',
      "The author's name color on the platform, set on .chatto-author",
    ),
  },
  {
    name: '--chatto-attention',
    description: L(
      '「新留言提醒」效果的顏色，來自主題的 attention.color',
      "The quiet-spell reminder's color, from the theme's attention.color",
    ),
  },
];

const byClass = new Map(CLASS_REFERENCE.map((item) => [item.selector.slice(1), item]));

/** Looks up the reference entry for a bare class name such as `chatto-author`. */
export const describeClass = (className: string) => byClass.get(className);
