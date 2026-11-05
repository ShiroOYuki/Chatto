import type { ShareBackend, SignInRequest, SignInResult } from './backend';
import {
  shareFail,
  type ShareAccount,
  type ShareErrorCode,
  type SharePage,
  type ShareReport,
  type ShareResult,
  type ShareThemeDetail,
  type ShareThemeSummary,
} from './model';
import { isShareServiceUrl, listQueryString, SHARE_API_URL, SHARE_FALLBACK_URL, sharePaths } from './protocol';

export interface HttpShareOptions {
  /** The service; defaults to `SHARE_API_URL`. */
  baseUrl?: string;
  /** Where to look up a moved service; null turns the lookup off. */
  fallbackUrl?: string | null;
  fetch?: typeof fetch;
  /** Sent as `X-Chatto-Client`, e.g. `chatto/0.2.0`. */
  client?: string;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  token?: string;
  body?: unknown;
  /** Raw bytes instead of JSON. */
  bytes?: Uint8Array;
}

const ERROR_BY_STATUS: Record<number, ShareErrorCode> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  409: 'invalid',
  410: 'cancelled',
  422: 'invalid',
  429: 'busy',
};

/** A `ShareResult` read from a response, or the closest error when the body is not one. */
async function readResult<T>(response: Response): Promise<ShareResult<T>> {
  try {
    const body = (await response.json()) as ShareResult<T>;
    if (body && typeof body === 'object' && typeof body.ok === 'boolean') return body;
  } catch {
    // Not JSON: a proxy error page or an outage.
  }
  if (response.status >= 500) return shareFail('network');
  return shareFail(ERROR_BY_STATUS[response.status] ?? 'unknown');
}

/** The sharing service over HTTP (`/v1`, see `protocol.ts`). */
export function createHttpShareBackend(options: HttpShareOptions = {}): ShareBackend {
  const doFetch = options.fetch ?? ((input, init) => fetch(input, init));
  let baseUrl = (options.baseUrl ?? SHARE_API_URL).replace(/\/+$/, '');
  let fallbackChecked = options.fallbackUrl === null;

  /** Follows `share.json` once per run when the service cannot be reached. */
  const tryFallback = async (): Promise<boolean> => {
    if (fallbackChecked) return false;
    fallbackChecked = true;
    try {
      const response = await doFetch(options.fallbackUrl ?? SHARE_FALLBACK_URL, { cache: 'no-store' });
      const { apiUrl } = (await response.json()) as { apiUrl?: unknown };
      if (typeof apiUrl !== 'string' || !isShareServiceUrl(apiUrl)) return false;
      const next = apiUrl.replace(/\/+$/, '');
      if (next === baseUrl) return false;
      baseUrl = next;
      return true;
    } catch {
      return false;
    }
  };

  const send = async (method: Method, path: string, request: RequestOptions = {}): Promise<Response | null> => {
    const headers: Record<string, string> = {};
    if (request.token) headers.Authorization = `Bearer ${request.token}`;
    if (options.client) headers['X-Chatto-Client'] = options.client;
    let body: BodyInit | undefined;
    if (request.bytes) {
      headers['Content-Type'] = 'application/octet-stream';
      body = request.bytes as Uint8Array<ArrayBuffer>;
    } else if (request.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(request.body);
    }
    for (;;) {
      try {
        return await doFetch(`${baseUrl}${path}`, { method, headers, body });
      } catch {
        if (!(await tryFallback())) return null;
      }
    }
  };

  const call = async <T>(method: Method, path: string, request?: RequestOptions): Promise<ShareResult<T>> => {
    const response = await send(method, path, request);
    return response ? readResult<T>(response) : shareFail('network');
  };

  return {
    list: (query, token) => call<SharePage>('GET', `${sharePaths.themes}?${listQueryString(query)}`, { token }),
    findByCode: (code, token) => call<ShareThemeSummary>('GET', sharePaths.code(code), { token }),
    get: (id, token) => call<ShareThemeDetail>('GET', sharePaths.theme(id), { token }),
    versions: (ids) => call<Record<string, number>>('POST', sharePaths.versions, { body: { ids } }),

    async asset(file) {
      const response = await send('GET', sharePaths.asset(file));
      if (!response) return shareFail('network');
      if (!response.ok) return readResult<Uint8Array>(response);
      return { ok: true, value: new Uint8Array(await response.arrayBuffer()) };
    },
    assetUrl: (file) => `${baseUrl}${sharePaths.asset(file)}`,
    uploadAsset: (token, file, bytes) => call<void>('PUT', sharePaths.asset(file), { token, bytes }),
    recordDownload: (id, clientId) => call<void>('POST', sharePaths.downloads(id), { body: { clientId } }),

    beginSignIn: (provider, start, token) =>
      call<SignInRequest>('POST', sharePaths.signIn, { token, body: { provider, ...start } }),
    finishSignIn: (code, verifier) => call<SignInResult>('POST', sharePaths.token, { body: { code, verifier } }),
    account: (token) => call<ShareAccount>('GET', sharePaths.account, { token }),
    setDisplayName: (token, displayName) =>
      call<ShareAccount>('PATCH', sharePaths.account, { token, body: { displayName } }),
    unlink: (token, provider) => call<ShareAccount>('DELETE', sharePaths.identity(provider), { token }),
    signOut: (token) => call<void>('POST', sharePaths.signOut, { token }),
    deleteAccount: (token) => call<void>('DELETE', sharePaths.account, { token }),

    setLiked: (token, id, liked) => call<ShareThemeSummary>(liked ? 'PUT' : 'DELETE', sharePaths.like(id), { token }),
    report: (token, id, reason, note) => call<void>('POST', sharePaths.reports(id), { token, body: { reason, note } }),

    mine: (token) => call<ShareThemeSummary[]>('GET', sharePaths.mine, { token }),
    publish: (token, input) => call<ShareThemeSummary>('POST', sharePaths.themes, { token, body: input }),
    update: (token, id, input) => call<ShareThemeSummary>('PUT', sharePaths.theme(id), { token, body: input }),
    unpublish: (token, id) => call<void>('DELETE', sharePaths.theme(id), { token }),

    reports: (token) => call<ShareReport[]>('GET', sharePaths.moderationReports, { token }),
    setHidden: (token, id, hidden) => call<void>('PUT', sharePaths.moderationTheme(id), { token, body: { hidden } }),
    setBanned: (token, accountId, banned) =>
      call<void>('PUT', sharePaths.moderationAccount(accountId), { token, body: { banned } }),
  };
}
