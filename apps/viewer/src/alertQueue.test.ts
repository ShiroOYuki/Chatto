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

  describe('gift batches', () => {
    const inBatch = (key: 'twitch:sub-gift' | 'twitch:community-gift', id: string, lead: boolean): ChatEvent => {
      const event = sampleEvent(key) as Extract<ChatEvent, { type: 'notice' }>;
      return {
        ...event,
        notice: { ...event.notice, id, meta: { ...event.notice.meta, groupId: 'batch-1', groupLead: lead } },
      };
    };
    const kindOf = (state: AlertQueueState) =>
      state.current?.item.kind === 'notice' ? state.current.item.notice.eventType : null;

    it('drops gifted subs that arrive before their batch once the batch arrives', () => {
      let state = push(emptyQueue, inBatch('twitch:sub-gift', 'g1', false));
      state = push(state, inBatch('twitch:sub-gift', 'g2', false));
      expect(state.current).toBeNull();
      expect(state.held).toHaveLength(2);

      state = push(state, inBatch('twitch:community-gift', 'lead', true));
      expect(state.held).toHaveLength(0);
      expect(state.waiting).toHaveLength(0);
      expect(kindOf(state)).toBe('community-gift');

      // A late release timer finds nothing to release.
      expect(reduceAlerts(state, { type: 'release', group: 'twitch:batch-1' })).toBe(state);
    });

    it('lets held gifted subs through when the batch never comes', () => {
      let state = push(push(emptyQueue, sampleEvent('twitch:raid')), inBatch('twitch:sub-gift', 'g1', false));
      expect(state.waiting).toHaveLength(0);
      state = reduceAlerts(state, { type: 'release', group: 'twitch:batch-1' });
      expect(state.held).toHaveLength(0);
      expect(state.waiting).toHaveLength(1);
    });

    it('removes a held card on moderation too', () => {
      const gift = inBatch('twitch:sub-gift', 'g1', false) as Extract<ChatEvent, { type: 'notice' }>;
      const cleared: ChatEvent = { type: 'chat-cleared', platform: 'twitch', channelId: gift.notice.channelId };
      const state = reduceAlerts(push(emptyQueue, gift), { type: 'event', event: cleared, options });
      expect(state.held).toHaveLength(0);
    });
  });

  it('applies display rules, so hidden users never pop up', () => {
    const cheer = sampleEvent('twitch:cheer') as Extract<ChatEvent, { type: 'message' }>;
    const hidden = { ...options, hiddenUsers: [cheer.message.author.login] };
    expect(reduceAlerts(emptyQueue, { type: 'event', event: cheer, cue, options: hidden })).toEqual(emptyQueue);
  });
});
