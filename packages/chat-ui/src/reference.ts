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

const L = (zh: string, en: string, ja: string): Localized => ({ 'zh-TW': zh, en, ja });
const entry = (selector: string, label: Localized, description: Localized): SelectorReference => ({
  selector,
  label,
  description,
});

export const CLASS_REFERENCE: SelectorReference[] = [
  entry(
    '.chatto-root',
    L('根元素', 'Root', 'ルート要素'),
    L(
      '整個聊天室，字型與文字顏色從這裡繼承',
      'The whole chat; font and text color inherit from here',
      'チャット全体（フォントと文字色はここから継承）',
    ),
  ),
  entry(
    '.chatto-list',
    L('面板', 'Panel', 'パネル'),
    L('包住所有訊息的清單（<ol>）', 'The list holding every message (<ol>)', 'すべてのメッセージを包むリスト（<ol>）'),
  ),
  entry(
    '.chatto-message',
    L('訊息', 'Message', 'メッセージ'),
    L('一則聊天訊息（<li>）', 'One chat message (<li>)', 'チャットメッセージ1件（<li>）'),
  ),
  entry(
    '.chatto-avatar',
    L('頭像', 'Avatar', 'アバター'),
    L('訊息左側的頭像', 'The avatar left of a message', 'メッセージ左側のアバター'),
  ),
  entry(
    '.chatto-content',
    L('訊息內容區', 'Message content', 'メッセージ内容'),
    L(
      '頭像以外的部分：回覆、標題列、內容',
      'Everything but the avatar: reply, header and body',
      'アバター以外の部分：返信、ヘッダー、本文',
    ),
  ),
  entry(
    '.chatto-event-title',
    L('事件標題', 'Event title', 'イベントタイトル'),
    L(
      '事件訊息（如小奇點）的標題，可在上方一行或做成角落貼紙',
      'Title of an event message (such as a cheer), on its own line or as a corner sticker',
      'イベントメッセージ（ビッツなど）のタイトル、上の1行または角のステッカーとして表示',
    ),
  ),
  entry(
    '.chatto-reply',
    L('回覆引用', 'Reply', '返信'),
    L('回覆別人時顯示的原訊息', 'The message being replied to', '返信先の元メッセージ'),
  ),
  entry(
    '.chatto-header',
    L('名稱框', 'Header', 'ヘッダー'),
    L('時間、徽章、名稱與分隔符號', 'Time, badges, name and separator', '時刻、バッジ、名前、区切り文字'),
  ),
  entry('.chatto-time', L('時間', 'Time', '時刻'), L('訊息時間', 'When the message was sent', 'メッセージの送信時刻')),
  entry(
    '.chatto-badges',
    L('徽章群組', 'Badges', 'バッジグループ'),
    L('所有徽章的容器', 'Holds every badge', 'すべてのバッジを含むコンテナ'),
  ),
  entry(
    '.chatto-badge',
    L('徽章', 'Badge', 'バッジ'),
    L(
      '單一徽章圖片，可用 [data-badge] 區分',
      'One badge image; tell them apart with [data-badge]',
      'バッジ画像1つ（[data-badge]で区別）',
    ),
  ),
  entry(
    '.chatto-author',
    L('名稱', 'Name', '名前'),
    L('發言者顯示名稱', "The author's display name", '発言者の表示名'),
  ),
  entry(
    '.chatto-separator',
    L('分隔符號', 'Separator', '区切り文字'),
    L(
      '名稱與內容之間，內容來自 ::after',
      'Between name and body; its text comes from ::after',
      '名前と本文の間（文字は::afterで指定）',
    ),
  ),
  entry('.chatto-body', L('內容', 'Body', '本文'), L('訊息本文', 'The message text', 'メッセージの本文')),
  entry(
    '.chatto-emote',
    L('表情符號', 'Emote', 'スタンプ'),
    L('訊息裡的表情圖片', 'An emote image in a message', 'メッセージ内のスタンプ画像'),
  ),
  entry('.chatto-mention', L('提及', 'Mention', 'メンション'), L('@某人', '@someone', '@ユーザー')),
  entry('.chatto-link', L('連結', 'Link', 'リンク'), L('訊息裡的網址', 'A URL in a message', 'メッセージ内のURL')),
  entry(
    '.chatto-cheer',
    L('小奇點數量', 'Cheer amount', 'ビッツ数'),
    L('訊息裡的 Cheer100 等', 'Cheer100 and the like in a message', 'メッセージ内のCheer100など'),
  ),
  entry('.chatto-media', L('媒體', 'Media', 'メディア'), L('GIF 等圖片內容', 'GIFs and other images', 'GIFなどの画像')),
  entry(
    '.chatto-notice',
    L('事件通知', 'Notice', 'イベント通知'),
    L(
      '訂閱、揪團、公告等系統通知（<li>）',
      'System notices such as subs, raids and announcements (<li>)',
      'サブスク、Raid、アナウンスなどのシステム通知（<li>）',
    ),
  ),
  entry(
    '.chatto-notice-system',
    L('通知標題', 'Notice text', '通知テキスト'),
    L('事件通知的系統文字', 'The text line of a notice', 'イベント通知のシステムテキスト'),
  ),
];

export const ATTRIBUTE_REFERENCE: SelectorReference[] = [
  entry(
    '[data-roles~="broadcaster"]',
    L('實況主', 'Broadcaster', '配信者'),
    L('訊息作者是實況主', 'Sent by the broadcaster', '送信者が配信者'),
  ),
  entry(
    ':not([data-roles~="broadcaster"]):not([data-roles~="moderator"]):not([data-roles~="vip"]):not([data-roles~="subscriber"]):not([data-roles~="founder"])',
    L('一般觀眾', 'Viewer', '一般の視聴者'),
    L(
      '訊息作者不是實況主、管理員、VIP 或訂閱者',
      'Sent by someone who is not the broadcaster, a moderator, a VIP or a subscriber',
      '送信者が配信者、モデレーター、VIP、サブスク登録者のいずれでもない',
    ),
  ),
  entry(
    '[data-roles~="moderator"]',
    L('管理員', 'Moderator', 'モデレーター'),
    L('訊息作者是管理員', 'Sent by a moderator', '送信者がモデレーター'),
  ),
  entry('[data-roles~="vip"]', L('VIP', 'VIP', 'VIP'), L('訊息作者是 VIP', 'Sent by a VIP', '送信者がVIP')),
  entry(
    '[data-roles~="subscriber"]',
    L('訂閱者', 'Subscriber', 'サブスク登録者'),
    L('訊息作者是訂閱者', 'Sent by a subscriber', '送信者がサブスク登録者'),
  ),
  entry(
    '[data-highlight~="first-message"]',
    L('首次發言', 'First message', '初めての発言'),
    L('第一次在頻道發言', 'Their first message in the channel', 'チャンネルでの初めてのメッセージ'),
  ),
  entry(
    '[data-highlight~="after-silence"]',
    L('沉寂後的新留言', 'After a quiet spell', '静寂後の新着'),
    L(
      '聊天室安靜一段時間後的第一則留言（只在桌面 Overlay）',
      'The first message after chat was quiet (desktop overlay only)',
      'チャットがしばらく静かだったあとの最初のメッセージ（デスクトップオーバーレイのみ）',
    ),
  ),
  entry(
    '.chatto-root[data-leaving]',
    L('提醒卡片離場', 'Alert card leaving', 'アラートカードの退場'),
    L(
      '事件 Overlay 的卡片時間到、正在離場',
      'An alert card whose time is up, on its way out',
      '表示時間が終わって退場中のアラートオーバーレイのカード',
    ),
  ),
  entry(
    '.chatto-root:lang(zh)',
    L('聊天室語言', 'Chat language', 'チャットの言語'),
    L(
      '根元素帶有聊天室語言（lang="zh-TW"、"en" 或 "ja"），裡面任何元素都能用 :lang() 切換自訂文字',
      'The root carries the chat language (lang="zh-TW", "en" or "ja"); anything inside can use :lang() to switch your own words',
      'ルート要素にチャットの言語（lang="zh-TW"、"en"、"ja"）が付くので、中のどの要素でも:lang()で独自の文言を切り替えられる',
    ),
  ),
  entry(
    '[data-action]',
    L('/me 動作', '/me action', '/meアクション'),
    L('用 /me 發送的訊息', 'A message sent with /me', '/meで送信されたメッセージ'),
  ),
  entry(
    '[data-user="login"]',
    L('特定使用者', 'One user', '特定のユーザー'),
    L('以登入名稱指定使用者', 'Pick a user by login name', 'ログイン名でユーザーを指定'),
  ),
  entry(
    '[data-platform="twitch"]',
    L('平台', 'Platform', 'プラットフォーム'),
    L('訊息或通知來自的平台', 'Where a message or notice came from', 'メッセージや通知の送信元プラットフォーム'),
  ),
  entry(
    '[data-event]',
    L('任何事件', 'Any event', 'すべてのイベント'),
    L('所有事件訊息與通知', 'Every event message and notice', 'すべてのイベントメッセージと通知'),
  ),
  entry(
    '[data-badge="subscriber"]',
    L('特定徽章', 'One badge', '特定のバッジ'),
    L('用在 .chatto-badge 上', 'Use on .chatto-badge', '.chatto-badgeに使用'),
  ),
];

/** One `[data-event="…"]` entry per catalogued platform event. */
export const EVENT_REFERENCE: SelectorReference[] = EVENT_CATALOG.flatMap((group) =>
  group.events.map((event) =>
    entry(
      `[data-event="${event.key}"]`,
      {
        'zh-TW': `${group.label}・${event.label['zh-TW']}`,
        en: `${group.label} · ${event.label.en}`,
        ja: `${group.label}・${event.label.ja}`,
      },
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
      '発言者がプラットフォームで設定した名前の色（.chatto-authorに設定）',
    ),
  },
  {
    name: '--chatto-attention',
    description: L(
      '「新留言提醒」效果的顏色，來自主題的 attention.color',
      "The quiet-spell reminder's color, from the theme's attention.color",
      '静寂アラート効果の色（テーマのattention.colorから）',
    ),
  },
];

const byClass = new Map(CLASS_REFERENCE.map((item) => [item.selector.slice(1), item]));

/** Looks up the reference entry for a bare class name such as `chatto-author`. */
export const describeClass = (className: string) => byClass.get(className);
