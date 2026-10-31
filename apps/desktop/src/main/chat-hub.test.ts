import type { ChatEvent } from '@chatto/core';
import { mockMessage, MOCK_USERS } from '@chatto/chat-ui';
import { describe, expect, it, vi } from 'vitest';
import { ChatHub } from './chat-hub';

const [alice, bob] = MOCK_USERS as [(typeof MOCK_USERS)[0], (typeof MOCK_USERS)[0]];
const message = (author = alice, platform = 'twitch'): ChatEvent => ({
  type: 'message',
  message: { ...mockMessage(author, [{ type: 'text', text: 'hi' }]), platform },
});
const ids = (hub: ChatHub) => hub.backlog().map((event) => (event.type === 'message' ? event.message.id : event.type));

describe('ChatHub', () => {
  it('fans events out to every subscriber until they unsubscribe', () => {
    const hub = new ChatHub();
    const first = vi.fn();
    const second = vi.fn();
    const stop = hub.subscribe(first);
    hub.subscribe(second);

    hub.publish(message());
    stop();
    hub.publish(message());

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('keeps only the latest 50 messages and notices', () => {
    const hub = new ChatHub();
    const events = Array.from({ length: 60 }, () => message());
    events.forEach((event) => hub.publish(event));
    const backlog = hub.backlog();
    expect(backlog).toHaveLength(50);
    expect(backlog[0]).toBe(events[10]);
  });

  it('does not keep connection events', () => {
    const hub = new ChatHub();
    hub.publish({ type: 'connection', platform: 'twitch', channelId: '1', state: 'connected' });
    expect(hub.backlog()).toEqual([]);
  });

  it('drops deleted messages from the backlog so late viewers never see them', () => {
    const hub = new ChatHub();
    const keep = message();
    const remove = message();
    hub.publish(keep);
    hub.publish(remove);
    if (remove.type !== 'message') throw new Error('unreachable');

    hub.publish({ type: 'message-deleted', platform: 'twitch', channelId: '1', messageId: remove.message.id });

    expect(hub.backlog()).toEqual([keep]);
  });

  it('drops every message of a cleared user', () => {
    const hub = new ChatHub();
    hub.publish(message(alice));
    hub.publish(message(bob));
    hub.publish(message(alice));

    hub.publish({ type: 'user-cleared', platform: 'twitch', channelId: '1', userId: alice.id });

    expect(hub.backlog().every((event) => event.type === 'message' && event.message.author.id === bob.id)).toBe(true);
    expect(ids(hub)).toHaveLength(1);
  });

  it('clears only the messages of the cleared platform', () => {
    const hub = new ChatHub();
    hub.publish(message(alice, 'twitch'));
    hub.publish(message(alice, 'youtube'));

    hub.publish({ type: 'chat-cleared', platform: 'twitch', channelId: '1' });

    const [remaining] = hub.backlog();
    expect(hub.backlog()).toHaveLength(1);
    expect(remaining?.type === 'message' && remaining.message.platform).toBe('youtube');
  });

  it('returns a copy of the backlog', () => {
    const hub = new ChatHub();
    hub.publish(message());
    hub.backlog().pop();
    expect(hub.backlog()).toHaveLength(1);
  });
});
