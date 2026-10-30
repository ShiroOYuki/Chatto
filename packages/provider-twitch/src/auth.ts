/**
 * Twitch OAuth for a desktop (public) client using the Device Code Grant Flow.
 * No client secret is involved, so nothing sensitive ships inside the app.
 * https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow
 */

const OAUTH_BASE = 'https://id.twitch.tv/oauth2';

/** Scopes Chatto needs. `user:read:chat` is required for EventSub chat. */
export const TWITCH_SCOPES = ['user:read:chat'] as const;

export interface TwitchTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
  scopes: string[];
}

export interface TwitchIdentity {
  userId: string;
  login: string;
  clientId: string;
  scopes: string[];
}

/** Persists tokens; the desktop app implements it with OS-level encryption. */
export interface TokenStore {
  load(): Promise<TwitchTokens | null>;
  save(tokens: TwitchTokens): Promise<void>;
  clear(): Promise<void>;
}

export interface DeviceCodePrompt {
  userCode: string;
  verificationUri: string;
  expiresAt: number;
}

export class TwitchAuthError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'TwitchAuthError';
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string[];
}

async function postForm<T>(path: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(`${OAUTH_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const json = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new TwitchAuthError(json.message ?? `HTTP ${response.status}`, response.status);
  return json;
}

function toTokens(response: TokenResponse): TwitchTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: Date.now() + response.expires_in * 1000,
    scopes: response.scope ?? [],
  };
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new TwitchAuthError('Authorization cancelled'));
    });
  });

export class TwitchAuth {
  constructor(
    readonly clientId: string,
    private readonly store: TokenStore,
  ) {}

  /**
   * Runs the whole device flow: requests a code, hands it to `onPrompt` so the
   * UI can show it, then polls until the user approves, declines or it expires.
   */
  async signIn(onPrompt: (prompt: DeviceCodePrompt) => void, signal?: AbortSignal): Promise<TwitchIdentity> {
    const scopes = TWITCH_SCOPES.join(' ');
    const device = await postForm<{
      device_code: string;
      user_code: string;
      verification_uri: string;
      expires_in: number;
      interval: number;
    }>('/device', { client_id: this.clientId, scopes });

    const expiresAt = Date.now() + device.expires_in * 1000;
    onPrompt({ userCode: device.user_code, verificationUri: device.verification_uri, expiresAt });

    let interval = Math.max(device.interval, 1) * 1000;
    while (Date.now() < expiresAt) {
      await sleep(interval, signal);
      try {
        const tokens = toTokens(
          await postForm<TokenResponse>('/token', {
            client_id: this.clientId,
            scopes,
            device_code: device.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        );
        await this.store.save(tokens);
        return this.validate(tokens.accessToken);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('authorization_pending')) continue;
        if (message.includes('slow_down')) {
          interval += 5000;
          continue;
        }
        throw error;
      }
    }
    throw new TwitchAuthError('Device code expired');
  }

  async signOut(): Promise<void> {
    const tokens = await this.store.load();
    await this.store.clear();
    if (tokens) {
      await postForm('/revoke', { client_id: this.clientId, token: tokens.accessToken }).catch(() => undefined);
    }
  }

  /** Returns a valid access token, refreshing it when it is about to expire. */
  async getAccessToken(): Promise<string> {
    const tokens = await this.store.load();
    if (!tokens) throw new TwitchAuthError('Not signed in', 401);
    if (tokens.expiresAt - Date.now() > 60_000) return tokens.accessToken;
    return (await this.refresh(tokens)).accessToken;
  }

  /** Forces a refresh, e.g. after a 401 from Helix. */
  async refresh(current?: TwitchTokens): Promise<TwitchTokens> {
    const tokens = current ?? (await this.store.load());
    if (!tokens) throw new TwitchAuthError('Not signed in', 401);
    try {
      const next = toTokens(
        await postForm<TokenResponse>('/token', {
          client_id: this.clientId,
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
        }),
      );
      await this.store.save(next);
      return next;
    } catch (error) {
      // Refresh tokens of public clients are single-use and expire; force re-login.
      await this.store.clear();
      throw error;
    }
  }

  async currentIdentity(): Promise<TwitchIdentity | null> {
    const tokens = await this.store.load();
    if (!tokens) return null;
    try {
      return await this.validate(await this.getAccessToken());
    } catch {
      return null;
    }
  }

  async validate(accessToken: string): Promise<TwitchIdentity> {
    const response = await fetch(`${OAUTH_BASE}/validate`, {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!response.ok) throw new TwitchAuthError('Token is invalid', response.status);
    const json = (await response.json()) as { user_id: string; login: string; client_id: string; scopes: string[] };
    return { userId: json.user_id, login: json.login, clientId: json.client_id, scopes: json.scopes };
  }
}
