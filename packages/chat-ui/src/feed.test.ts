import { describe, expect, it } from 'vitest';
import { emptyFeed, expireFeed, reduceFeed } from './feed';
import { createMockMessage } from './mock';
import { PRESET_THEMES } from './themes';

const options = { ...PRESET_THEMES[0]!.options, hiddenPrefixes: [], hiddenUsers: [], maxMessages: 3 };

describe('feed reducer', () => {
  it('keeps at most maxMessages', () => {
    let state = emptyFeed;
    for (let i = 0; i < 5; i += 1) state = reduceFeed(state, createMockMessage(), options);
    expect(state.items).toHaveLength(3);
  });

  it('removes deleted and cleared messages', () => {
    const event = createMockMessage();
    if (event.type !== 'message') throw new Error('expected message');
    let state = reduceFeed(emptyFeed, event, options);
    state = reduceFeed(
      state,
      { type: 'message-deleted', platform: 'twitch', channelId: '1', messageId: event.message.id },
      options,
    );
    expect(state.items).toHaveLength(0);

    state = reduceFeed(emptyFeed, event, options);
    state = reduceFeed(
      state,
      { type: 'user-cleared', platform: 'twitch', channelId: '1', userId: event.message.author.id },
      options,
    );
    expect(state.items).toHaveLength(0);
  });

  it('filters hidden prefixes and expires old items', () => {
    const event = createMockMessage();
    if (event.type !== 'message') throw new Error('expected message');
    const hidden = { ...options, hiddenPrefixes: [event.message.text.slice(0, 1)] };
    expect(reduceFeed(emptyFeed, event, hidden).items).toHaveLength(0);

    const state = reduceFeed(emptyFeed, event, options, 0);
    expect(expireFeed(state, { ...options, messageLifetime: 5 }, 10_000).items).toHaveLength(0);
  });
});
