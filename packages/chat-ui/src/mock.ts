import type { ChatEvent, ChatUser, MessageFragment } from '@chatto/core';

/** Fake chat used by previews, the theme editor and `?mock=1` viewers. */

const emote = (name: string, color: string): MessageFragment => ({
  type: 'emote',
  text: name,
  emote: {
    id: `mock-${name}`,
    name,
    source: 'platform',
    image: {
      x1: `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect width="28" height="28" rx="7" fill="${color}"/><circle cx="10" cy="12" r="2" fill="#173404"/><circle cx="18" cy="12" r="2" fill="#173404"/><path d="M9 18q5 4 10 0" stroke="#173404" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
      )}`,
    },
  },
});

const users: ChatUser[] = [
  {
    id: '1',
    login: 'shiraine_ciel',
    displayName: 'shiraine_ciel',
    color: '#9FE1CB',
    badges: [],
    roles: ['broadcaster'],
  },
  { id: '2', login: 'mochi_fan', displayName: 'Mochi_Fan', color: '#FAC775', badges: [], roles: ['subscriber'] },
  { id: '3', login: 'kuma_mod', displayName: '熊熊管理員', color: '#F4C0D1', badges: [], roles: ['moderator'] },
  { id: '4', login: 'okome_rice', displayName: 'okome_rice', color: '#B5D4F4', badges: [], roles: [] },
  { id: '5', login: 'matcha_latte', displayName: 'MatchaLatte', color: '#C0DD97', badges: [], roles: ['vip'] },
];

const bodies: MessageFragment[][] = [
  [{ type: 'text', text: '歡迎來喝茶 ' }, emote('TeaCup', '#C0DD97')],
  [{ type: 'text', text: '今天要玩什麼呀' }],
  [
    { type: 'text', text: 'GG 這波好扯 ' },
    emote('Pog', '#FAC775'),
    { type: 'text', text: ' ' },
    emote('Pog', '#FAC775'),
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
  [{ type: 'text', text: '前面那段操作我直接看傻 ' }, emote('Laugh', '#F4C0D1')],
];

let counter = 0;
const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)]!;

export function createMockMessage(): ChatEvent {
  counter += 1;
  const fragments = pick(bodies);
  return {
    type: 'message',
    message: {
      id: `mock-${counter}`,
      platform: 'twitch',
      channelId: '1',
      timestamp: Date.now(),
      author: pick(users),
      fragments,
      text: fragments.map((fragment) => fragment.text).join(''),
      isAction: false,
      highlights: [],
    },
  };
}

export function createMockNotice(): ChatEvent {
  counter += 1;
  return {
    type: 'notice',
    notice: {
      id: `mock-notice-${counter}`,
      platform: 'twitch',
      channelId: '1',
      timestamp: Date.now(),
      kind: 'resubscription',
      systemText: 'Mochi_Fan 已訂閱 6 個月了！',
      author: users[1],
      fragments: [{ type: 'text', text: '每天都來喝茶 ☕' }],
      meta: { months: 6 },
    },
  };
}

/** Pushes a fake event every `intervalMs` until the returned stop function runs. */
export function startMockStream(push: (event: ChatEvent) => void, intervalMs = 1600): () => void {
  for (let i = 0; i < 5; i += 1) push(createMockMessage());
  const timer = setInterval(() => push(Math.random() < 0.08 ? createMockNotice() : createMockMessage()), intervalMs);
  return () => clearInterval(timer);
}
