import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { form, installFakeFetch } from '../../../tests/fake-fetch';
import { TwitchAuth, TwitchAuthError, type TokenStore, type TwitchTokens } from './auth';

const OAUTH = 'https://id.twitch.tv/oauth2';

function memoryStore(initial: TwitchTokens | null = null) {
  let tokens = initial;
  return {
    load: vi.fn(async () => tokens),
    save: vi.fn(async (next: TwitchTokens) => void (tokens = next)),
    clear: vi.fn(async () => void (tokens = null)),
    get current() {
      return tokens;
    },
  } satisfies TokenStore & { current: TwitchTokens | null };
}

const tokenReply = (access = 'access-1', refresh = 'refresh-1') => ({
  body: { access_token: access, refresh_token: refresh, expires_in: 3600, scope: ['user:read:chat'] },
});
const identityReply = { body: { user_id: '1', login: 'shiraine_ciel', client_id: 'cid', scopes: ['user:read:chat'] } };
const deviceReply = (interval = 5) => ({
  body: {
    device_code: 'device-1',
    user_code: 'MATCHA42',
    verification_uri: 'https://www.twitch.tv/activate',
    expires_in: 600,
    interval,
  },
});

let http: ReturnType<typeof installFakeFetch>;
beforeEach(() => {
  http = installFakeFetch();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T00:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('TwitchAuth device flow', () => {
  it('shows the code, polls until approved and stores the tokens', async () => {
    const store = memoryStore();
    const auth = new TwitchAuth('cid', store);
    http.on(`${OAUTH}/device`, deviceReply());
    http.on(`${OAUTH}/token`, { status: 400, body: { message: 'authorization_pending' } }, tokenReply());
    http.on(`${OAUTH}/validate`, identityReply);
    const onPrompt = vi.fn();

    const result = auth.signIn(onPrompt);
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(result).resolves.toMatchObject({ userId: '1', login: 'shiraine_ciel' });
    expect(onPrompt).toHaveBeenCalledWith(expect.objectContaining({ userCode: 'MATCHA42' }));
    expect(http.to(`${OAUTH}/token`)).toHaveLength(2);
    expect(store.current).toMatchObject({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  });

  it('is a public client: never sends a client secret', async () => {
    const auth = new TwitchAuth('cid', memoryStore());
    http.on(`${OAUTH}/device`, deviceReply(1));
    http.on(`${OAUTH}/token`, tokenReply());
    http.on(`${OAUTH}/validate`, identityReply);
    const result = auth.signIn(() => undefined);
    await vi.advanceTimersByTimeAsync(1000);
    await result;
    for (const request of http.requests.filter((r) => r.method === 'POST')) {
      expect(form(request)).not.toHaveProperty('client_secret');
      expect(form(request).client_id).toBe('cid');
    }
  });

  it('backs off by five seconds when asked to slow down', async () => {
    const auth = new TwitchAuth('cid', memoryStore());
    http.on(`${OAUTH}/device`, deviceReply(1));
    http.on(`${OAUTH}/token`, { status: 400, body: { message: 'slow_down' } }, tokenReply());
    http.on(`${OAUTH}/validate`, identityReply);

    const result = auth.signIn(() => undefined);
    await vi.advanceTimersByTimeAsync(1000);
    expect(http.to(`${OAUTH}/token`)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(5999);
    expect(http.to(`${OAUTH}/token`)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(http.to(`${OAUTH}/token`)).toHaveLength(2);
  });

  it('stops polling when cancelled', async () => {
    const auth = new TwitchAuth('cid', memoryStore());
    http.on(`${OAUTH}/device`, deviceReply());
    const abort = new AbortController();
    const result = auth.signIn(() => undefined, abort.signal);
    const assertion = expect(result).rejects.toThrow('Authorization cancelled');
    await vi.advanceTimersByTimeAsync(0);
    abort.abort();
    await assertion;
    expect(http.to(`${OAUTH}/token`)).toHaveLength(0);
  });

  it('fails when the user denies access or the code expires', async () => {
    const denied = new TwitchAuth('cid', memoryStore());
    http.on(`${OAUTH}/device`, deviceReply(1));
    http.on(`${OAUTH}/token`, { status: 400, body: { message: 'authorization_denied' } });
    const result = denied.signIn(() => undefined);
    const assertion = expect(result).rejects.toBeInstanceOf(TwitchAuthError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('gives up once the device code expires', async () => {
    const auth = new TwitchAuth('cid', memoryStore());
    http.on(`${OAUTH}/device`, { body: { ...deviceReply(5).body, expires_in: 12 } });
    http.on(`${OAUTH}/token`, { status: 400, body: { message: 'authorization_pending' } });
    const result = auth.signIn(() => undefined);
    const assertion = expect(result).rejects.toThrow('Device code expired');
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });
});

describe('TwitchAuth tokens', () => {
  const stored = (expiresInMs: number): TwitchTokens => ({
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    expiresAt: Date.now() + expiresInMs,
    scopes: [],
  });

  it('returns the stored token while it is fresh', async () => {
    const auth = new TwitchAuth('cid', memoryStore(stored(3_600_000)));
    await expect(auth.getAccessToken()).resolves.toBe('old-access');
    expect(http.requests).toHaveLength(0);
  });

  it('refreshes a token that expires within a minute', async () => {
    const store = memoryStore(stored(30_000));
    http.on(`${OAUTH}/token`, tokenReply('new-access', 'new-refresh'));
    await expect(new TwitchAuth('cid', store).getAccessToken()).resolves.toBe('new-access');
    expect(form(http.requests[0]!)).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'old-refresh' });
    expect(store.current?.refreshToken).toBe('new-refresh');
  });

  it('forces a new sign-in when the refresh token is rejected', async () => {
    const store = memoryStore(stored(0));
    http.on(`${OAUTH}/token`, { status: 400, body: { message: 'Invalid refresh token' } });
    await expect(new TwitchAuth('cid', store).getAccessToken()).rejects.toThrow('Invalid refresh token');
    expect(store.current).toBeNull();
  });

  it('reports not signed in without tokens', async () => {
    const auth = new TwitchAuth('cid', memoryStore());
    await expect(auth.getAccessToken()).rejects.toMatchObject({ status: 401 });
    await expect(auth.currentIdentity()).resolves.toBeNull();
  });

  it('treats an invalid stored token as signed out', async () => {
    http.on(`${OAUTH}/validate`, { status: 401 });
    await expect(new TwitchAuth('cid', memoryStore(stored(3_600_000))).currentIdentity()).resolves.toBeNull();
  });

  it('clears and revokes tokens on sign-out, even if revoking fails', async () => {
    const store = memoryStore(stored(3_600_000));
    http.on(`${OAUTH}/revoke`, { status: 500 });
    await new TwitchAuth('cid', store).signOut();
    expect(store.current).toBeNull();
    expect(form(http.to(`${OAUTH}/revoke`)[0]!)).toMatchObject({ client_id: 'cid', token: 'old-access' });
  });
});
