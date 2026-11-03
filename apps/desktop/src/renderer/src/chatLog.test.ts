import { createMockGiftBatch, sampleEvent } from '@chatto/chat-ui';
import type { ChatEvent, ChatMessage } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import {
  emptyChatLog,
  HISTORY_MINUTES,
  LOG_LIMIT,
  messageHistory,
  messageRate,
  reduceChatLog,
  type ChatLogState,
} from './chatLog';

const message = (id: string, authorId = 'u1'): ChatEvent => {
  const sample = sampleEvent('twitch:cheer') as Extract<ChatEvent, { type: 'message' }>;
  const base: ChatMessage = { ...sample.message, id, author: { ...sample.message.author, id: authorId } };
  return { type: 'message', message: base };
};
const receive = (state: ChatLogState, event: ChatEvent, at = 1000) =>
  reduceChatLog(state, { type: 'event', event, at });
const receiveAll = (events: ChatEvent[], state = emptyChatLog) => events.reduce((s, e) => receive(s, e), state);

describe('chat log', () => {
  it('logs messages and counts them and their chatters', () => {
    const state = receiveAll([message('m1', 'a'), message('m2', 'b'), message('m3', 'a')]);
    expect(state.entries.map((entry) => entry.id)).toEqual(['m1', 'm2', 'm3']);
    expect(state.totalMessages).toBe(3);
    expect(state.chatters.size).toBe(2);
  });

  it('keeps the same chatter set until someone new speaks', () => {
    const first = receive(emptyChatLog, message('m1', 'a'));
    expect(receive(first, message('m2', 'a')).chatters).toBe(first.chatters);
    expect(receive(first, message('m3', 'b')).chatters).not.toBe(first.chatters);
    // The earlier state is not changed behind React's back.
    expect(first.chatters.size).toBe(1);
  });

  it(`keeps the last ${LOG_LIMIT} entries`, () => {
    const events = Array.from({ length: LOG_LIMIT + 5 }, (_, index) => message(`m${index}`));
    const state = receiveAll(events);
    expect(state.entries).toHaveLength(LOG_LIMIT);
    expect(state.entries[0]!.id).toBe('m5');
    expect(state.totalMessages).toBe(LOG_LIMIT + 5);
  });

  it('marks deleted and cleared messages instead of dropping them', () => {
    let state = receiveAll([message('m1', 'a'), message('m2', 'b'), message('m3', 'a')]);
    const { platform, channelId } = (message('x') as Extract<ChatEvent, { type: 'message' }>).message;
    state = receive(state, { type: 'message-deleted', platform, channelId, messageId: 'm2' });
    expect(state.entries.map((entry) => entry.kind === 'message' && entry.deleted)).toEqual([false, true, false]);
    expect(state.deletedCount).toBe(1);

    state = receive(state, { type: 'user-cleared', platform, channelId, userId: 'a' });
    expect(state.entries.every((entry) => entry.kind === 'message' && entry.deleted)).toBe(true);

    const fresh = receive(receiveAll([message('m4')]), { type: 'chat-cleared', platform, channelId });
    expect(fresh.entries.every((entry) => entry.kind === 'message' && entry.deleted)).toBe(true);
  });

  it('merges a gift batch into one entry and counts it once', () => {
    const state = receiveAll(createMockGiftBatch(3));
    expect(state.entries).toHaveLength(1);
    expect(state.noticeCount).toBe(1);
  });

  it('clears the log but keeps the session stats', () => {
    const state = reduceChatLog(receiveAll([message('m1')]), { type: 'clear' });
    expect(state.entries).toEqual([]);
    expect(state.totalMessages).toBe(1);
    expect(state.chatters.size).toBe(1);
  });

  it('ignores connection events', () => {
    const state = receiveAll([message('m1')]);
    expect(receive(state, { type: 'connection', platform: 'twitch', channelId: 'c1', state: 'connected' })).toBe(state);
  });
});

describe('message rate and history', () => {
  const minute = 60_000;
  const now = 100 * minute;

  it('counts the last minute and buckets the history by minute', () => {
    const timestamps = [now - 90_000, now - 30_000, now - 10_000, now];
    expect(messageRate(timestamps, now)).toBe(3);
    const history = messageHistory(timestamps, now);
    expect(history).toHaveLength(HISTORY_MINUTES);
    expect(history.at(-1)).toBe(3);
    expect(history.at(-2)).toBe(1);
  });

  it('drops timestamps older than the history window', () => {
    let state = receive(emptyChatLog, message('old'), now - HISTORY_MINUTES * minute - 1);
    state = receive(state, message('new'), now);
    expect(state.timestamps).toEqual([now]);
  });
});
