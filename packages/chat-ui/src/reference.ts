import { EVENT_CATALOG } from './events';

/**
 * Human-readable reference of the public chat markup: every `chatto-*` class
 * and `data-*` attribute that custom CSS can target. Used by the theme
 * editor (chips, autocomplete, inspector labels) and mirrored in docs/theming.md.
 */

export interface SelectorReference {
  selector: string;
  label: string;
  description: string;
}

export const CLASS_REFERENCE: SelectorReference[] = [
  { selector: '.chatto-root', label: '根元素', description: '整個聊天室，字型與文字顏色從這裡繼承' },
  { selector: '.chatto-list', label: '面板', description: '包住所有訊息的清單（<ol>）' },
  { selector: '.chatto-message', label: '訊息', description: '一則聊天訊息（<li>）' },
  { selector: '.chatto-avatar', label: '頭像', description: '訊息左側的頭像' },
  { selector: '.chatto-content', label: '訊息內容區', description: '頭像以外的部分：回覆、標題列、內容' },
  {
    selector: '.chatto-event-title',
    label: '事件標題',
    description: '事件訊息（如小奇點）的標題，可在上方一行或做成角落貼紙',
  },
  { selector: '.chatto-reply', label: '回覆引用', description: '回覆別人時顯示的原訊息' },
  { selector: '.chatto-header', label: '名稱框', description: '時間、徽章、名稱與分隔符號' },
  { selector: '.chatto-time', label: '時間', description: '訊息時間' },
  { selector: '.chatto-badges', label: '徽章群組', description: '所有徽章的容器' },
  { selector: '.chatto-badge', label: '徽章', description: '單一徽章圖片，可用 [data-badge] 區分' },
  { selector: '.chatto-author', label: '名稱', description: '發言者顯示名稱' },
  { selector: '.chatto-separator', label: '分隔符號', description: '名稱與內容之間，內容來自 ::after' },
  { selector: '.chatto-body', label: '內容', description: '訊息本文' },
  { selector: '.chatto-emote', label: '表情符號', description: '訊息裡的表情圖片' },
  { selector: '.chatto-mention', label: '提及', description: '@某人' },
  { selector: '.chatto-link', label: '連結', description: '訊息裡的網址' },
  { selector: '.chatto-cheer', label: '小奇點數量', description: '訊息裡的 Cheer100 等' },
  { selector: '.chatto-media', label: '媒體', description: 'GIF 等圖片內容' },
  { selector: '.chatto-notice', label: '事件通知', description: '訂閱、揪團、公告等系統通知（<li>）' },
  { selector: '.chatto-notice-system', label: '通知標題', description: '事件通知的系統文字' },
];

export const ATTRIBUTE_REFERENCE: SelectorReference[] = [
  { selector: '[data-roles~="broadcaster"]', label: '實況主', description: '訊息作者是實況主' },
  {
    selector:
      ':not([data-roles~="broadcaster"]):not([data-roles~="moderator"]):not([data-roles~="vip"]):not([data-roles~="subscriber"]):not([data-roles~="founder"])',
    label: '一般觀眾',
    description: '訊息作者不是實況主、管理員、VIP 或訂閱者',
  },
  { selector: '[data-roles~="moderator"]', label: '管理員', description: '訊息作者是管理員' },
  { selector: '[data-roles~="vip"]', label: 'VIP', description: '訊息作者是 VIP' },
  { selector: '[data-roles~="subscriber"]', label: '訂閱者', description: '訊息作者是訂閱者' },
  { selector: '[data-highlight~="first-message"]', label: '首次發言', description: '第一次在頻道發言' },
  {
    selector: '[data-highlight~="after-silence"]',
    label: '沉寂後的新留言',
    description: '聊天室安靜一段時間後的第一則留言（只在桌面 Overlay）',
  },
  { selector: '.chatto-root[data-leaving]', label: '提醒卡片離場', description: '事件 Overlay 的卡片時間到、正在離場' },
  { selector: '[data-action]', label: '/me 動作', description: '用 /me 發送的訊息' },
  { selector: '[data-user="login"]', label: '特定使用者', description: '以登入名稱指定使用者' },
  { selector: '[data-platform="twitch"]', label: '平台', description: '訊息或通知來自的平台' },
  { selector: '[data-event]', label: '任何事件', description: '所有事件訊息與通知' },
  { selector: '[data-badge="subscriber"]', label: '特定徽章', description: '用在 .chatto-badge 上' },
];

/** One `[data-event="…"]` entry per catalogued platform event. */
export const EVENT_REFERENCE: SelectorReference[] = EVENT_CATALOG.flatMap((group) =>
  group.events.map((event) => ({
    selector: `[data-event="${event.key}"]`,
    label: `${group.label}・${event.label}`,
    description: event.description,
  })),
);

const byClass = new Map(CLASS_REFERENCE.map((item) => [item.selector.slice(1), item]));

/** Looks up the reference entry for a bare class name such as `chatto-author`. */
export const describeClass = (className: string) => byClass.get(className);
