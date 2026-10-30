import type { ChatBadge, ChatEvent, ChatMessage, ChatNotice, ChatUser, MessageFragment } from '@chatto/core';
import { EVENT_CATALOG } from './events';

/** Fake chat used by previews, the theme editor and `?mock=1` viewers. */

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

export const MOCK_USERS: ChatUser[] = [
  {
    id: '1',
    login: 'shiraine_ciel',
    displayName: 'shiraine_ciel',
    color: '#9FE1CB',
    badges: [BADGES.broadcaster, BADGES.subscriber],
    roles: ['broadcaster', 'subscriber'],
  },
  {
    id: '2',
    login: 'mochi_fan',
    displayName: 'Mochi_Fan',
    color: '#FAC775',
    badges: [BADGES.subscriber],
    roles: ['subscriber'],
  },
  {
    id: '3',
    login: 'kuma_mod',
    displayName: '熊熊管理員',
    color: '#F4C0D1',
    badges: [BADGES.moderator],
    roles: ['moderator'],
  },
  { id: '4', login: 'okome_rice', displayName: 'okome_rice', color: '#B5D4F4', badges: [], roles: [] },
  {
    id: '5',
    login: 'matcha_latte',
    displayName: 'MatchaLatte',
    color: '#C0DD97',
    badges: [BADGES.vip],
    roles: ['vip'],
  },
];

export const mockUser = (index: number): ChatUser => MOCK_USERS[index % MOCK_USERS.length]!;

const bodies: MessageFragment[][] = [
  [{ type: 'text', text: '歡迎來喝茶 ' }, mockEmote('TeaCup', '#C0DD97')],
  [{ type: 'text', text: '今天要玩什麼呀' }],
  [
    { type: 'text', text: 'GG 這波好扯 ' },
    mockEmote('Pog', '#FAC775'),
    { type: 'text', text: ' ' },
    mockEmote('Pog', '#FAC775'),
  ],
  [
    {
      type: 'mention',
      text: '@shiraine_ciel',
      user: { id: '1', login: 'shiraine_ciel', displayName: 'shiraine_ciel' },
    },
    { type: 'text', text: ' 晚安！記得喝水' },
  ],
  [{ type: 'text', text: 'chat is this real' }],
  [{ type: 'text', text: '這個 overlay 好可愛，在哪裡做的？' }],
  [{ type: 'text', text: 'こんばんは～' }],
  [{ type: 'text', text: '前面那段操作我直接看傻 ' }, mockEmote('Laugh', '#F4C0D1')],
];

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${(counter += 1)}`;
const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)]!;
const textOf = (fragments: MessageFragment[]) => fragments.map((fragment) => fragment.text).join('');

/** Builds a chat message with sensible defaults; used by mocks and the event catalog. */
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

/** Builds a notice with sensible defaults; used by mocks and the event catalog. */
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

export function createMockMessage(): ChatEvent {
  return { type: 'message', message: mockMessage(pick(MOCK_USERS), pick(bodies)) };
}

const allEvents = () => EVENT_CATALOG.flatMap((group) => group.events);

/** A random platform event (notice or event message) from the catalog. */
export function createMockNotice(): ChatEvent {
  return pick(allEvents()).sample();
}

/** Pushes a fake event every `intervalMs` until the returned stop function runs. */
export function startMockStream(push: (event: ChatEvent) => void, intervalMs = 1600): () => void {
  for (let i = 0; i < 5; i += 1) push(createMockMessage());
  const timer = setInterval(() => push(Math.random() < 0.12 ? createMockNotice() : createMockMessage()), intervalMs);
  return () => clearInterval(timer);
}

/**
 * A fixed set of messages that together use every part of the markup:
 * each role, badges, a reply, mention, link, emotes, a /me action, a
 * first-time chatter and every catalogued platform event.
 */
export function createSpecimenEvents(): ChatEvent[] {
  const [broadcaster, subscriber, moderator, viewer, vip] = MOCK_USERS as [
    ChatUser,
    ChatUser,
    ChatUser,
    ChatUser,
    ChatUser,
  ];
  const messages: ChatMessage[] = [
    mockMessage(broadcaster, [{ type: 'text', text: '歡迎來到茶室 ' }, mockEmote('TeaCup', '#C0DD97')]),
    mockMessage(moderator, [{ type: 'text', text: '記得看置頂的規則喔' }], {
      reply: {
        parentMessageId: 'x',
        parentAuthor: { id: '4', login: 'okome_rice', displayName: 'okome_rice' },
        parentText: '請問有規則嗎？',
      },
    }),
    mockMessage(vip, [
      {
        type: 'mention',
        text: '@shiraine_ciel',
        user: { id: '1', login: 'shiraine_ciel', displayName: 'shiraine_ciel' },
      },
      { type: 'text', text: ' 主題放在 ' },
      { type: 'link', text: 'https://chatto.example', url: 'https://chatto.example' },
    ]),
    mockMessage(subscriber, [
      { type: 'text', text: 'GG ' },
      mockEmote('Pog', '#FAC775'),
      { type: 'text', text: ' ' },
      mockEmote('Pog', '#FAC775'),
    ]),
    mockMessage(viewer, [{ type: 'text', text: '倒了一杯茶' }], { isAction: true }),
    mockMessage(viewer, [{ type: 'text', text: '第一次來，大家好！' }], { highlights: ['first-message'] }),
  ];
  return [
    ...messages.map((message): ChatEvent => ({ type: 'message', message })),
    ...allEvents().map((event) => event.sample()),
  ];
}
