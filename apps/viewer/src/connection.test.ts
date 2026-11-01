import { PRESET_THEMES } from '@chatto/chat-ui';
import { PROTOCOL_VERSION } from '@chatto/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeWebSocket } from '../../../tests/fake-websocket';
import { connectToApp } from './connection';

const handlers = () => ({ onHello: vi.fn(), onEvent: vi.fn(), onTheme: vi.fn(), onStatus: vi.fn() });

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('connectToApp', () => {
  it('subscribes to its target once the socket opens', () => {
    const h = handlers();
    connectToApp('ws://127.0.0.1:4820/ws', 'embed', h);
    const socket = FakeWebSocket.latest();
    socket.serverOpen();
    expect(h.onStatus).toHaveBeenCalledWith(true);
    expect(JSON.parse(socket.sent[0]!)).toEqual({ v: PROTOCOL_VERSION, type: 'subscribe', target: 'embed' });
  });

  it('routes hello, event and theme frames and ignores garbage', () => {
    const h = handlers();
    connectToApp('ws://x/ws', 'overlay', h);
    const socket = FakeWebSocket.latest();
    socket.serverOpen();
    const theme = PRESET_THEMES[0]!;
    const event = { type: 'chat-cleared', platform: 'twitch', channelId: '1' };

    socket.serverSend({ v: PROTOCOL_VERSION, type: 'hello', target: 'overlay', theme, backlog: [event] });
    socket.serverSend({ v: PROTOCOL_VERSION, type: 'event', event });
    socket.serverSend({ v: PROTOCOL_VERSION, type: 'theme', theme });
    socket.serverSend('garbage');
    socket.serverSend({ v: 999, type: 'event', event });

    expect(h.onHello).toHaveBeenCalledWith(theme, [event]);
    expect(h.onEvent).toHaveBeenCalledTimes(1);
    expect(h.onEvent).toHaveBeenCalledWith(event, undefined);
    expect(h.onTheme).toHaveBeenCalledTimes(1);
  });

  it('passes the alert cue along with events for the alert overlay', () => {
    const h = handlers();
    connectToApp('ws://x/ws', 'alerts', h);
    const socket = FakeWebSocket.latest();
    socket.serverOpen();
    const event = { type: 'chat-cleared', platform: 'twitch', channelId: '1' };
    socket.serverSend({ v: PROTOCOL_VERSION, type: 'event', event, alert: { durationMs: 3000 } });
    expect(h.onEvent).toHaveBeenCalledWith(event, { durationMs: 3000 });
  });

  it('keeps reconnecting with back-off so OBS survives an app restart', () => {
    const h = handlers();
    connectToApp('ws://x/ws', 'embed', h);
    FakeWebSocket.latest().serverClose();
    expect(h.onStatus).toHaveBeenLastCalledWith(false);

    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);

    FakeWebSocket.latest().serverClose();
    vi.advanceTimersByTime(2000);
    expect(FakeWebSocket.instances).toHaveLength(3);

    // A successful open resets the back-off.
    FakeWebSocket.latest().serverOpen();
    FakeWebSocket.latest().serverClose();
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(4);
  });

  it('caps the back-off at ten seconds', () => {
    connectToApp('ws://x/ws', 'embed', handlers());
    for (let i = 0; i < 8; i += 1) {
      FakeWebSocket.latest().serverClose();
      vi.advanceTimersByTime(10_000);
    }
    expect(FakeWebSocket.instances).toHaveLength(9);
  });

  it('stops for good when disposed', () => {
    const stop = connectToApp('ws://x/ws', 'embed', handlers());
    stop();
    expect(FakeWebSocket.latest().closed).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
