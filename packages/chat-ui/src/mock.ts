import { AFTER_SILENCE, type ChatEvent, type ChatMessage, type ChatUser, type MessageFragment } from '@chatto/core';
import { sampleEvent } from './eventSamples';
import { EVENT_CATALOG } from './events';
import { MOCK_USERS, mockEmote, mockMessage, mockNotice } from './mockData';

/** Fake chat used by previews, the theme editor and `?mock=1` viewers. */

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

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)]!;

export function createMockMessage(): ChatEvent {
  return { type: 'message', message: mockMessage(pick(MOCK_USERS), pick(bodies)) };
}

const allEvents = () => EVENT_CATALOG.flatMap((group) => group.events);

/** A random platform event (notice or event message) from the catalog. */
export function createMockNotice(): ChatEvent {
  return sampleEvent(pick(allEvents()).key);
}

let giftBatches = 0;

/**
 * A community gift as a platform sends it: the "gifted N subs" notice, then one
 * notice per gifted sub, all sharing a `groupId`.
 */
export function createMockGiftBatch(count = 5): ChatEvent[] {
  const groupId = `mock-gift-${++giftBatches}`;
  const gifter = MOCK_USERS[4]!;
  const lead = mockNotice({
    eventType: 'community-gift',
    kind: 'gift-subscription',
    systemText: `${gifter.displayName} 送出 ${count} 份訂閱給聊天室`,
    author: gifter,
    meta: { tier: '1', count, groupId, groupLead: true },
  });
  const gifts = Array.from({ length: count }, (_, index) => {
    const others = MOCK_USERS.filter((user) => user !== gifter);
    const recipient = others[index % others.length]!.displayName;
    return mockNotice({
      eventType: 'sub-gift',
      kind: 'gift-subscription',
      systemText: `${gifter.displayName} 送了一份訂閱給 ${recipient}`,
      author: gifter,
      meta: { tier: '1', groupId, recipient },
    });
  });
  return [lead, ...gifts].map((notice) => ({ type: 'notice', notice }));
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
 * first-time chatter, a message after a quiet spell and every catalogued
 * platform event.
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
    mockMessage(subscriber, [{ type: 'text', text: '有人在嗎？' }], { highlights: [AFTER_SILENCE] }),
  ];
  return [
    ...messages.map((message): ChatEvent => ({ type: 'message', message })),
    ...allEvents().map((event) => sampleEvent(event.key)),
  ];
}
