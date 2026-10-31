import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeFetch } from '../../../tests/fake-fetch';
import type { TwitchAuth } from './auth';
import { HelixClient, HelixError } from './helix';

const HELIX = 'https://api.twitch.tv/helix';

function fakeAuth() {
  let token = 'token-1';
  return {
    clientId: 'cid',
    getAccessToken: vi.fn(async () => token),
    refresh: vi.fn(async () => {
      token = 'token-2';
      return { accessToken: token, refreshToken: 'r', expiresAt: 0, scopes: [] };
    }),
  };
}

const badgeSet = (setId: string, title: string) => ({
  set_id: setId,
  versions: [{ id: '1', title, image_url_1x: `${setId}-1x`, image_url_2x: `${setId}-2x`, image_url_4x: `${setId}-4x` }],
});

let http: ReturnType<typeof installFakeFetch>;
beforeEach(() => {
  http = installFakeFetch();
});

describe('HelixClient', () => {
  it('sends the client id and bearer token', async () => {
    const helix = new HelixClient(fakeAuth() as unknown as TwitchAuth);
    http.on(`${HELIX}/users`, { body: { data: [{ id: '42', login: 'ciel' }] } });
    await expect(helix.getUserByLogin('ciel')).resolves.toMatchObject({ id: '42' });
    expect(http.requests[0]!.headers).toMatchObject({ 'client-id': 'cid', authorization: 'Bearer token-1' });
  });

  it('refreshes the token and retries once after a 401', async () => {
    const auth = fakeAuth();
    const helix = new HelixClient(auth as unknown as TwitchAuth);
    http.on(`${HELIX}/users`, { status: 401 }, { body: { data: [] } });
    await expect(helix.getUserByLogin('ghost')).resolves.toBeNull();
    expect(auth.refresh).toHaveBeenCalledTimes(1);
    expect(http.requests[1]!.headers.authorization).toBe('Bearer token-2');
  });

  it('does not loop when the retry is also unauthorized', async () => {
    const helix = new HelixClient(fakeAuth() as unknown as TwitchAuth);
    http.on(`${HELIX}/users`, { status: 401, body: { message: 'Invalid OAuth token' } });
    const error = await helix.getUserByLogin('x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HelixError);
    expect(error).toMatchObject({ status: 401, message: 'Invalid OAuth token' });
    expect(http.requests).toHaveLength(2);
  });

  it('encodes logins and ids in the query', async () => {
    const helix = new HelixClient(fakeAuth() as unknown as TwitchAuth);
    http.on(`${HELIX}/users`, { body: { data: [] } });
    await helix.getUserByLogin('a&b');
    await helix.getUsersById(['1', '2']);
    expect(http.requests[0]!.url).toBe(`${HELIX}/users?login=a%26b`);
    expect(http.requests[1]!.url).toBe(`${HELIX}/users?id=1&id=2`);
    await expect(helix.getUsersById([])).resolves.toEqual([]);
    expect(http.requests).toHaveLength(2);
  });

  it('merges badges, letting channel badges override global ones', async () => {
    const helix = new HelixClient(fakeAuth() as unknown as TwitchAuth);
    http.on(`${HELIX}/chat/badges/global`, {
      body: { data: [badgeSet('subscriber', 'Global sub'), badgeSet('vip', 'VIP')] },
    });
    http.on(`${HELIX}/chat/badges?`, { body: { data: [badgeSet('subscriber', 'Channel sub')] } });
    const badges = await helix.getBadges('42');
    expect(badges.get('subscriber/1')).toMatchObject({ title: 'Channel sub', image: { x1: 'subscriber-1x' } });
    expect(badges.get('vip/1')?.setId).toBe('vip');
  });

  it('creates EventSub subscriptions over the websocket transport', async () => {
    const helix = new HelixClient(fakeAuth() as unknown as TwitchAuth);
    http.on(`${HELIX}/eventsub/subscriptions`, { status: 204 });
    await helix.createEventSubSubscription('channel.chat.message', '1', { broadcaster_user_id: '42' }, 'session-1');
    const request = http.requests[0]!;
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toEqual({
      type: 'channel.chat.message',
      version: '1',
      condition: { broadcaster_user_id: '42' },
      transport: { method: 'websocket', session_id: 'session-1' },
    });
  });
});
