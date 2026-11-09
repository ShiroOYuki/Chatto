import type { ChatBadge, ChatMessage, ChatNotice, ChatUser, MessageFragment } from '@chatto/core';

/**
 * Building blocks for fake chat: users, badges, emotes and message/notice factories.
 * Shared by the mock stream, the specimen set and the platform event samples.
 */

const svg = (body: string, size = 28) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`,
  )}`;

export const mockEmote = (name: string, color: string): MessageFragment => ({
  type: 'emote',
  text: name,
  emote: {
    id: `mock-${name}`,
    name,
    source: 'platform',
    image: {
      x1: svg(
        `<rect width="28" height="28" rx="7" fill="${color}"/><circle cx="10" cy="12" r="2" fill="#173404"/><circle cx="18" cy="12" r="2" fill="#173404"/><path d="M9 18q5 4 10 0" stroke="#173404" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      ),
    },
  },
});

const badge = (setId: string, title: string, color: string, glyph: string): ChatBadge => ({
  id: `${setId}/1`,
  setId,
  title,
  image: {
    x1: svg(
      `<rect width="18" height="18" rx="4" fill="${color}"/><text x="9" y="13" font-size="11" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700">${glyph}</text>`,
      18,
    ),
  },
});

const BADGES = {
  broadcaster: badge('broadcaster', '實況主', '#E24B4A', '主'),
  moderator: badge('moderator', '管理員', '#1D9E75', '管'),
  vip: badge('vip', 'VIP', '#D4537E', 'V'),
  subscriber: badge('subscriber', '訂閱者', '#7F77DD', '訂'),
};

// Twitch's preset name colors, like most real viewers: previews must look like live chat (#60).
export const MOCK_USERS: ChatUser[] = [
  {
    id: '1',
    login: 'shiraine_ciel',
    displayName: 'shiraine_ciel',
    color: '#1E90FF',
    badges: [BADGES.broadcaster, BADGES.subscriber],
    roles: ['broadcaster', 'subscriber'],
  },
  {
    id: '2',
    login: 'mochi_fan',
    displayName: 'Mochi_Fan',
    color: '#FF7F50',
    badges: [BADGES.subscriber],
    roles: ['subscriber'],
  },
  {
    id: '3',
    login: 'kuma_mod',
    displayName: '熊熊管理員',
    color: '#2E8B57',
    badges: [BADGES.moderator],
    roles: ['moderator'],
  },
  { id: '4', login: 'okome_rice', displayName: 'okome_rice', color: '#DAA520', badges: [], roles: [] },
  {
    id: '5',
    login: 'matcha_latte',
    displayName: 'MatchaLatte',
    color: '#FF69B4',
    badges: [BADGES.vip],
    roles: ['vip'],
  },
];

export const mockUser = (index: number): ChatUser => MOCK_USERS[index % MOCK_USERS.length]!;

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${(counter += 1)}`;
const textOf = (fragments: MessageFragment[]) => fragments.map((fragment) => fragment.text).join('');

/** Builds a chat message with sensible defaults; used by mocks and event samples. */
export function mockMessage(
  author: ChatUser,
  fragments: MessageFragment[],
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: nextId('mock'),
    platform: 'twitch',
    channelId: '1',
    timestamp: Date.now(),
    author,
    fragments,
    text: textOf(fragments),
    isAction: false,
    highlights: [],
    ...extra,
  };
}

/** Builds a notice with sensible defaults; used by mocks and event samples. */
export function mockNotice(
  partial: Pick<ChatNotice, 'kind' | 'eventType' | 'systemText'> & Partial<ChatNotice>,
): ChatNotice {
  return {
    id: nextId('mock-notice'),
    platform: 'twitch',
    channelId: '1',
    timestamp: Date.now(),
    fragments: [],
    meta: {},
    ...partial,
  };
}
