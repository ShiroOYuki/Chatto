import type { ChatEvent } from '@chatto/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeFetch } from '../../../tests/fake-fetch';
import { FakeWebSocket } from '../../../tests/fake-websocket';
import type { TokenStore, TwitchTokens } from './auth';
import { CHAT_SUBSCRIPTIONS, TwitchChatProvider } from './provider';

const OAUTH = 'https://id.twitch.tv/oauth2';
const HELIX = 'https://api.twitch.tv/helix';

const signedIn = (): TokenStore => {
  const tokens: TwitchTokens = { accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3_600_000, scopes: [] };
  return { load: async () => tokens, save: async () => undefined, clear: async () => undefined };
};

let http: ReturnType<typeof installFakeFetch>;
beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.useFakeTimers();
  http = installFakeFetch();
  http.on(`${OAUTH}/validate`, { body: { user_id: '7', login: 'mod_bot', client_id: 'cid', scopes: [] } });
  http.on(`${HELIX}/users`, { body: { data: [{ id: '42', login: 'shiraine_ciel', display_name: 'ciel' }] } });
  http.on(`${HELIX}/chat/badges`, { body: { data: [] } });
  http.on(`${HELIX}/eventsub/subscriptions`, { status: 202, body: {} });
});
afterEach(() => vi.useRealTimers());

const welcome = {
  metadata: { message_id: 'w', message_type: 'session_welcome' },
  payload: { session: { id: 'sess', keepalive_timeout_seconds: 10, reconnect_url: null } },
};

async function connected() {
  const provider = new TwitchChatProvider({ clientId: 'cid', tokenStore: signedIn() });
  const events: ChatEvent[] = [];
  provider.onEvent((event) => events.push(event));
  const channel = await provider.resolveChannel(' ShiRaine_Ciel ');
  const connecting = provider.connect(channel);
  await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
  FakeWebSocket.latest().serverSend(welcome);
  await connecting;
  return { provider, events };
}

describe('TwitchChatProvider', () => {
  it('resolves channels by normalized login', async () => {
    const provider = new TwitchChatProvider({ clientId: 'cid', tokenStore: signedIn() });
    await expect(provider.resolveChannel(' ShiRaine_Ciel ')).resolves.toEqual({
      platform: 'twitch',
      channelId: '42',
      login: 'shiraine_ciel',
    });
    expect(http.to(`${HELIX}/users`)[0]!.url).toContain('login=shiraine_ciel');
  });

  it('subscribes to every chat event for the channel as the signed-in user', async () => {
    const { provider, events } = await connected();
    const bodies = http.to(`${HELIX}/eventsub/subscriptions`).map((request) => JSON.parse(request.body));
    expect(bodies.map((body) => body.type).sort()).toEqual([...CHAT_SUBSCRIPTIONS].sort());
    for (const body of bodies) {
      expect(body.condition).toEqual({ broadcaster_user_id: '42', user_id: '7' });
      expect(body.transport).toEqual({ method: 'websocket', session_id: 'sess' });
    }
    expect(provider.state).toBe('connected');
    expect(events.at(-1)).toMatchObject({ type: 'connection', state: 'connected', channelId: '42' });
  });

  it('emits normalized events for notifications', async () => {
    const { events } = await connected();
    FakeWebSocket.latest().serverSend({
      metadata: { message_id: 'n1', message_type: 'notification', subscription_type: 'channel.chat.message_delete' },
      payload: { event: { broadcaster_user_id: '42', target_user_id: '2', message_id: 'abc' } },
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(events.at(-1)).toMatchObject({ type: 'message-deleted', messageId: 'abc' });
  });

  it('refuses to connect when signed out', async () => {
    const provider = new TwitchChatProvider({
      clientId: 'cid',
      tokenStore: { load: async () => null, save: async () => undefined, clear: async () => undefined },
    });
    await expect(provider.connect({ platform: 'twitch', channelId: '42', login: 'x' })).rejects.toThrow(/Sign in/);
  });

  it('rejects the connect call when subscriptions fail', async () => {
    const provider = new TwitchChatProvider({ clientId: 'cid', tokenStore: signedIn() });
    const failing = installFakeFetch(); // replaces the default routes
    failing.on(`${OAUTH}/validate`, { body: { user_id: '7', login: 'mod_bot', client_id: 'cid', scopes: [] } });
    failing.on(`${HELIX}/chat/badges`, { body: { data: [] } });
    failing.on(`${HELIX}/eventsub/subscriptions`, { status: 403, body: { message: 'missing scope' } });

    const connecting = provider.connect({ platform: 'twitch', channelId: '42', login: 'x' });
    const assertion = expect(connecting).rejects.toThrow('missing scope');
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    FakeWebSocket.latest().serverSend(welcome);
    await assertion;
    expect(provider.state).toBe('error');
  });

  it('closes the session on disconnect', async () => {
    const { provider } = await connected();
    await provider.disconnect();
    expect(FakeWebSocket.latest().closed).toBe(true);
    expect(provider.state).toBe('closed');
  });
});
