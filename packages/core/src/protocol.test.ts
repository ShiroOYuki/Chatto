import { describe, expect, it } from 'vitest';
import { decodeClientFrame, decodeServerFrame, encodeFrame, PROTOCOL_VERSION } from './protocol';

describe('protocol', () => {
  it('round-trips frames', () => {
    const event = { type: 'chat-cleared', platform: 'twitch', channelId: '1' } as const;
    const frame = { v: PROTOCOL_VERSION, type: 'event', event } as const;
    expect(decodeServerFrame(encodeFrame(frame))).toEqual(frame);
    const subscribe = { v: PROTOCOL_VERSION, type: 'subscribe', target: 'embed' } as const;
    expect(decodeClientFrame(encodeFrame(subscribe))).toEqual(subscribe);
  });

  it('rejects other protocol versions so mismatched viewers fail closed', () => {
    expect(decodeServerFrame(JSON.stringify({ v: PROTOCOL_VERSION + 1, type: 'event', event: {} }))).toBeNull();
    expect(decodeClientFrame(JSON.stringify({ v: 0, type: 'subscribe', target: 'embed' }))).toBeNull();
  });

  it('rejects unknown types, targets and invalid JSON', () => {
    expect(decodeServerFrame(JSON.stringify({ v: PROTOCOL_VERSION, type: 'eval' }))).toBeNull();
    expect(decodeClientFrame(JSON.stringify({ v: PROTOCOL_VERSION, type: 'subscribe', target: 'x' }))).toBeNull();
    expect(decodeServerFrame('{')).toBeNull();
    expect(decodeClientFrame('null')).toBeNull();
  });
});
