import { mockNotice, sampleEvent } from '@chatto/chat-ui';
import type { ChatEvent } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import {
  emptyRedemptionLog,
  REDEMPTION_LIMIT,
  redemptionDetails,
  redemptionKey,
  reduceRedemptions,
  type RedemptionLogState,
} from './redemptionLog';

const redemption = (id: string, meta: Record<string, string | number> = {}): ChatEvent => ({
  type: 'notice',
  notice: mockNotice({
    id,
    eventType: 'redemption',
    kind: 'other',
    systemText: '',
    meta: { reward: 'Hydrate', ...meta },
  }),
});

const receive = (state: RedemptionLogState, event: ChatEvent, at = 0) =>
  reduceRedemptions(state, { type: 'event', event, at });

describe('redemption log', () => {
  it('keeps redemptions of both kinds, newest first, and nothing else', () => {
    let state = receive(emptyRedemptionLog, redemption('a'));
    state = receive(state, sampleEvent('twitch:auto-redemption'));
    state = receive(state, sampleEvent('twitch:raid'));
    state = receive(state, sampleEvent('twitch:highlighted'));
    expect(state.entries.map((entry) => entry.notice.eventType)).toEqual(['auto-redemption', 'redemption']);
  });

  it('ignores a redelivered redemption', () => {
    const event = redemption('a');
    const once = receive(emptyRedemptionLog, event, 1);
    expect(receive(once, event, 2)).toBe(once);
  });

  it('closes one redemption without touching the rest', () => {
    let state = receive(emptyRedemptionLog, redemption('a'));
    state = receive(state, redemption('b'));
    const key = state.entries[1]!.key;
    expect(key).toBe('twitch:a');
    state = reduceRedemptions(state, { type: 'dismiss', key });
    expect(state.entries.map((entry) => entry.notice.id)).toEqual(['b']);
    expect(reduceRedemptions(state, { type: 'dismiss', key })).toBe(state);
  });

  it('keeps a bounded number of redemptions', () => {
    let state = emptyRedemptionLog;
    for (let index = 0; index <= REDEMPTION_LIMIT; index += 1) state = receive(state, redemption(String(index)));
    expect(state.entries).toHaveLength(REDEMPTION_LIMIT);
    expect(state.entries[0]!.notice.id).toBe(String(REDEMPTION_LIMIT));
  });

  it('reads the cost and the text the viewer typed', () => {
    const event = redemption('a', { cost: 500, input: '夜に駆ける' });
    if (event.type !== 'notice') throw new Error('expected a notice');
    expect(redemptionDetails(event.notice)).toEqual({ cost: 500, input: '夜に駆ける' });
    expect(redemptionKey(event.notice)).toBe('twitch:a');
    expect(redemptionDetails({ ...event.notice, meta: { input: '' } })).toEqual({});
  });
});
