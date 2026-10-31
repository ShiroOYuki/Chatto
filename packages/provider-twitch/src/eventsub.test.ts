import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeWebSocket } from '../../../tests/fake-websocket';
import { EventSubSession, type EventSubHandlers } from './eventsub';

const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';

let nextId = 0;
const frame = (type: string, payload: object = {}, extra: object = {}) => ({
  metadata: { message_id: `m${(nextId += 1)}`, message_type: type, message_timestamp: '', ...extra },
  payload,
});
const welcome = (id = 'session-1', keepalive = 10) =>
  frame('session_welcome', { session: { id, keepalive_timeout_seconds: keepalive, reconnect_url: null } });

function handlers() {
  const states: string[] = [];
  const h = {
    onWelcome: vi.fn(async () => undefined),
    onNotification: vi.fn(),
    onRevocation: vi.fn(),
    onStateChange: vi.fn((state: string) => void states.push(state)),
  } satisfies EventSubHandlers;
  return { h, states };
}

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('EventSubSession', () => {
  it('subscribes on welcome and reports connected', async () => {
    const { h, states } = handlers();
    new EventSubSession(h).open();
    const socket = FakeWebSocket.latest();
    expect(socket.url).toBe(EVENTSUB_URL);

    socket.serverSend(welcome('session-1'));
    await vi.advanceTimersByTimeAsync(0);

    expect(h.onWelcome).toHaveBeenCalledWith('session-1');
    expect(states).toEqual(['connecting', 'connected']);
  });

  it('forwards notifications and drops redelivered ones', async () => {
    const { h } = handlers();
    new EventSubSession(h).open();
    const socket = FakeWebSocket.latest();
    socket.serverSend(welcome());
    const notification = frame('notification', { event: { id: 1 } }, { subscription_type: 'channel.chat.message' });

    socket.serverSend(notification);
    socket.serverSend(notification);
    socket.serverSend('not json');
    await vi.advanceTimersByTimeAsync(0);

    expect(h.onNotification).toHaveBeenCalledTimes(1);
    expect(h.onNotification).toHaveBeenCalledWith('channel.chat.message', { id: 1 });
  });

  it('reports revoked subscriptions', async () => {
    const { h } = handlers();
    new EventSubSession(h).open();
    FakeWebSocket.latest().serverSend(
      frame('revocation', { subscription: { type: 'channel.chat.message', status: 'authorization_revoked' } }),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(h.onRevocation).toHaveBeenCalledWith('channel.chat.message', 'authorization_revoked');
  });

  it('closes a silent connection after the keepalive window and reconnects', async () => {
    const { h, states } = handlers();
    new EventSubSession(h).open();
    const first = FakeWebSocket.latest();
    first.serverSend(welcome('s1', 10));
    await vi.advanceTimersByTimeAsync(0);

    // keepalive 10 s + 5 s grace
    await vi.advanceTimersByTimeAsync(14_999);
    expect(first.closed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(first.closed).toBe(true);
    expect(states.at(-1)).toBe('reconnecting');

    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    FakeWebSocket.latest().serverSend(welcome('s2'));
    await vi.advanceTimersByTimeAsync(0);
    // A fresh session needs fresh subscriptions.
    expect(h.onWelcome).toHaveBeenLastCalledWith('s2');
    expect(states.at(-1)).toBe('connected');
  });

  it('keeps a connection alive while keepalives arrive', async () => {
    const { h } = handlers();
    new EventSubSession(h).open();
    const socket = FakeWebSocket.latest();
    socket.serverSend(welcome('s1', 10));
    for (let i = 0; i < 5; i += 1) {
      await vi.advanceTimersByTimeAsync(10_000);
      socket.serverSend(frame('session_keepalive'));
    }
    expect(socket.closed).toBe(false);
  });

  it('backs off exponentially, up to 30 seconds', async () => {
    const { h } = handlers();
    new EventSubSession(h).open();
    const delays = [1000, 2000, 4000, 8000, 16_000, 30_000, 30_000];
    for (const delay of delays) {
      const count = FakeWebSocket.instances.length;
      FakeWebSocket.latest().serverClose();
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(FakeWebSocket.instances).toHaveLength(count);
      await vi.advanceTimersByTimeAsync(1);
      expect(FakeWebSocket.instances).toHaveLength(count + 1);
    }
  });

  it('follows a server reconnect without resubscribing', async () => {
    const { h } = handlers();
    new EventSubSession(h).open();
    const old = FakeWebSocket.latest();
    old.serverSend(welcome('s1'));
    await vi.advanceTimersByTimeAsync(0);

    old.serverSend(
      frame('session_reconnect', {
        session: { id: 's1', keepalive_timeout_seconds: 10, reconnect_url: 'wss://edge/ws' },
      }),
    );
    const replacement = FakeWebSocket.latest();
    expect(replacement.url).toBe('wss://edge/ws');
    replacement.serverSend(welcome('s1'));
    await vi.advanceTimersByTimeAsync(0);

    expect(h.onWelcome).toHaveBeenCalledTimes(1);
    expect(old.closed).toBe(true);
    // Closing the old socket must not trigger a reconnect.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('ends with an error instead of connected when subscribing fails', async () => {
    const { h, states } = handlers();
    h.onWelcome.mockRejectedValueOnce(new Error('missing scope'));
    new EventSubSession(h).open();
    FakeWebSocket.latest().serverSend(welcome());
    await vi.advanceTimersByTimeAsync(60_000);
    expect(states).toEqual(['connecting', 'error']);
    expect(h.onStateChange).toHaveBeenLastCalledWith('error', 'missing scope');
    expect(FakeWebSocket.latest().closed).toBe(true);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('does not reconnect after close()', async () => {
    const { h, states } = handlers();
    const session = new EventSubSession(h);
    session.open();
    FakeWebSocket.latest().serverSend(welcome());
    await vi.advanceTimersByTimeAsync(0);
    session.close();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(states.at(-1)).toBe('closed');
  });
});
