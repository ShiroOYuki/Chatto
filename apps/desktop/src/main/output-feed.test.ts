import { mockMessage, MOCK_USERS } from '@chatto/chat-ui';
import type { ChatEvent } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import { ChatHub } from './chat-hub';
import { MAX_HELD, OutputFeed } from './output-feed';

const message = (text: string, user = MOCK_USERS[1]!): Extract<ChatEvent, { type: 'message' }> => ({
  type: 'message',
  message: mockMessage(user, [{ type: 'text', text }]),
});
const texts = (events: ChatEvent[]) =>
  events.map((event) =>
    event.type === 'message' ? (event.message.fragments[0] as { text: string }).text : event.type,
  );

function setup() {
  const hub = new ChatHub();
  const feed = new OutputFeed(hub);
  const received: ChatEvent[] = [];
  feed.subscribe((event) => received.push(event));
  return { hub, feed, received };
}

describe('OutputFeed', () => {
  it('passes everything through while running', () => {
    const { hub, feed, received } = setup();
    hub.publish(message('a'));
    expect(texts(received)).toEqual(['a']);
    expect(texts(feed.backlog())).toEqual(['a']);
  });

  it('holds new messages while paused and sends them in order on resume', () => {
    const { hub, feed, received } = setup();
    feed.setPaused(true);
    hub.publish(message('a'));
    hub.publish(message('b'));
    expect(received).toEqual([]);
    expect(feed.paused).toBe(true);
    feed.setPaused(false);
    expect(texts(received)).toEqual(['a', 'b']);
    // Nothing is sent twice.
    feed.setPaused(true);
    feed.setPaused(false);
    expect(received).toHaveLength(2);
  });

  it('removes moderated messages at once, even while paused, and drops them from the held ones', () => {
    const { hub, feed, received } = setup();
    const shown = message('shown');
    hub.publish(shown);
    feed.setPaused(true);
    const held = message('held', MOCK_USERS[2]!);
    hub.publish(held);
    hub.publish({ type: 'message-deleted', platform: 'twitch', channelId: '1', messageId: shown.message.id });
    hub.publish({ type: 'message-deleted', platform: 'twitch', channelId: '1', messageId: held.message.id });
    expect(texts(received)).toEqual(['shown', 'message-deleted', 'message-deleted']);
    feed.setPaused(false);
    // The held message was deleted before it was shown: it never appears.
    expect(texts(received).filter((text) => text === 'held')).toEqual([]);
  });

  it('keeps only the newest held messages', () => {
    const { hub, feed, received } = setup();
    feed.setPaused(true);
    for (let i = 0; i < MAX_HELD + 5; i++) hub.publish(message(String(i)));
    feed.setPaused(false);
    expect(received).toHaveLength(MAX_HELD);
    expect(texts(received)[0]).toBe('5');
  });

  it('clears what is shown and what is waiting', () => {
    const { hub, feed, received } = setup();
    hub.publish(message('a'));
    feed.setPaused(true);
    hub.publish(message('b'));
    feed.clear();
    feed.setPaused(false);
    expect(texts(received)).toEqual(['a']);
    expect(feed.backlog()).toEqual([]);
  });
});
