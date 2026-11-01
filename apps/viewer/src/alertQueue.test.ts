import { BASE_THEME, sampleEvent } from '@chatto/chat-ui';
import type { ChatEvent } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import { emptyQueue, reduceAlerts, type AlertQueueState } from './alertQueue';

const options = BASE_THEME.options;
const cue = { durationMs: 5000 };
const push = (state: AlertQueueState, event: ChatEvent, withCue = true) =>
  reduceAlerts(state, { type: 'event', event, cue: withCue ? cue : undefined, options });

describe('alert queue', () => {
  it('shows one card and queues the rest in order', () => {
    let state = push(emptyQueue, sampleEvent('twitch:sub'));
    state = push(state, sampleEvent('twitch:raid'));
    state = push(state, sampleEvent('twitch:cheer'));
    expect(state.current?.item.kind).toBe('notice');
    expect(state.waiting).toHaveLength(2);

    state = reduceAlerts(state, { type: 'leave' });
    expect(state.phase).toBe('leave');
    state = reduceAlerts(state, { type: 'next' });
    expect(state.phase).toBe('show');
    expect(state.current?.item.kind === 'notice' && state.current.item.notice.eventType).toBe('raid');
    state = reduceAlerts(reduceAlerts(state, { type: 'leave' }), { type: 'next' });
    expect(state.current?.item.kind).toBe('message');
    state = reduceAlerts(reduceAlerts(state, { type: 'leave' }), { type: 'next' });
    expect(state).toEqual(emptyQueue);
  });

  it('ignores events without a cue', () => {
    expect(push(emptyQueue, sampleEvent('twitch:sub'), false)).toBe(emptyQueue);
  });

  it('removes a deleted cheer at once, whether showing or waiting', () => {
    const cheer = sampleEvent('twitch:cheer') as Extract<ChatEvent, { type: 'message' }>;
    const deleted: ChatEvent = {
      type: 'message-deleted',
      platform: 'twitch',
      channelId: cheer.message.channelId,
      messageId: cheer.message.id,
    };
    let state = push(push(emptyQueue, cheer), sampleEvent('twitch:sub'));
    state = reduceAlerts(state, { type: 'event', event: deleted, options });
    expect(state.current?.item.kind).toBe('notice');
    expect(state.waiting).toHaveLength(0);

    state = push(push(emptyQueue, sampleEvent('twitch:sub')), cheer);
    state = reduceAlerts(state, { type: 'event', event: deleted, options });
    expect(state.waiting).toHaveLength(0);
    expect(state.current?.item.kind).toBe('notice');
  });

  it('applies display rules, so hidden users never pop up', () => {
    const cheer = sampleEvent('twitch:cheer') as Extract<ChatEvent, { type: 'message' }>;
    const hidden = { ...options, hiddenUsers: [cheer.message.author.login] };
    expect(reduceAlerts(emptyQueue, { type: 'event', event: cheer, cue, options: hidden })).toEqual(emptyQueue);
  });
});
