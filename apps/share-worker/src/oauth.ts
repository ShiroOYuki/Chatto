/**
 * Signing in with Twitch, Google and Discord (OAuth 2.0 authorization code flow). The client
 * secrets stay in the Worker; the platform's access token is used once to read who signed in and
 * then revoked, never stored. Only the user id and display name are read: no email.
 */
import type { ShareProvider } from '@chatto/share';
import type { Env } from './env';

export interface PlatformUser {
  id: string;
  name: string;
}

interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  /** Extra authorize parameters. */
  extra?: Record<string, string>;
  credentials(env: Env): { id?: string; secret?: string };
  user(accessToken: string, clientId: string, doFetch: typeof fetch): Promise<PlatformUser>;
  revoke(accessToken: string, clientId: string, secret: string, doFetch: typeof fetch): Promise<unknown>;
}

const form = (values: Record<string, string>) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
  body: new URLSearchParams(values).toString(),
});

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

const PROVIDERS: Record<ShareProvider, ProviderConfig> = {
  twitch: {
    authorizeUrl: 'https://id.twitch.tv/oauth2/authorize',
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    scope: '',
    credentials: (env) => ({ id: env.TWITCH_CLIENT_ID, secret: env.TWITCH_CLIENT_SECRET }),
    async user(token, clientId, doFetch) {
      const body = await readJson<{ data?: { id: string; login: string; display_name?: string }[] }>(
        await doFetch('https://api.twitch.tv/helix/users', {
          headers: { Authorization: `Bearer ${token}`, 'Client-Id': clientId },
        }),
      );
      const user = body.data?.[0];
      if (!user) throw new Error('No Twitch user');
      return { id: user.id, name: user.display_name || user.login };
    },
    revoke: (token, clientId, _secret, doFetch) =>
      doFetch('https://id.twitch.tv/oauth2/revoke', form({ client_id: clientId, token })),
  },
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid profile',
    extra: { prompt: 'select_account' },
    credentials: (env) => ({ id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET }),
    async user(token, _clientId, doFetch) {
      const body = await readJson<{ sub?: string; name?: string; given_name?: string }>(
        await doFetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      if (!body.sub) throw new Error('No Google user');
      return { id: body.sub, name: body.name || body.given_name || 'Google' };
    },
    revoke: (token, _clientId, _secret, doFetch) => doFetch('https://oauth2.googleapis.com/revoke', form({ token })),
  },
  discord: {
    authorizeUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scope: 'identify',
    credentials: (env) => ({ id: env.DISCORD_CLIENT_ID, secret: env.DISCORD_CLIENT_SECRET }),
    async user(token, _clientId, doFetch) {
      const body = await readJson<{ id?: string; username?: string; global_name?: string | null }>(
        await doFetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } }),
      );
      if (!body.id) throw new Error('No Discord user');
      return { id: body.id, name: body.global_name || body.username || 'Discord' };
    },
    revoke: (token, clientId, secret, doFetch) =>
      doFetch(
        'https://discord.com/api/oauth2/token/revoke',
        form({ client_id: clientId, client_secret: secret, token, token_type_hint: 'access_token' }),
      ),
  },
};

/** Whether the Worker has the client id and secret for a sign-in method. */
export function providerConfigured(env: Env, provider: ShareProvider): boolean {
  const { id, secret } = PROVIDERS[provider].credentials(env);
  return Boolean(id && secret);
}

export const redirectUri = (env: Env, provider: ShareProvider) =>
  `${env.PUBLIC_URL.replace(/\/+$/, '')}/v1/auth/callback/${provider}`;

/** The platform's sign-in page. */
export function authorizeUrl(env: Env, provider: ShareProvider, state: string): string {
  const config = PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: config.credentials(env).id ?? '',
    redirect_uri: redirectUri(env, provider),
    response_type: 'code',
    scope: config.scope,
    state,
    ...config.extra,
  });
  return `${config.authorizeUrl}?${params}`;
}

/** Trades the code from the callback for who signed in. */
export async function exchangeCode(
  env: Env,
  provider: ShareProvider,
  code: string,
  doFetch: typeof fetch,
): Promise<PlatformUser> {
  const config = PROVIDERS[provider];
  const { id = '', secret = '' } = config.credentials(env);
  const token = await readJson<{ access_token?: string }>(
    await doFetch(
      config.tokenUrl,
      form({
        client_id: id,
        client_secret: secret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri(env, provider),
      }),
    ),
  );
  if (!token.access_token) throw new Error('No access token');
  try {
    return await config.user(token.access_token, id, doFetch);
  } finally {
    await config.revoke(token.access_token, id, secret, doFetch).catch(() => undefined);
  }
}
