/**
 * The sharing service's HTTP API (`/v1`), shared by the app's HTTP client (`httpBackend.ts`)
 * and the Worker (`apps/share-worker`). Every JSON response is a `ShareResult`; the HTTP status
 * mirrors its error code so caches and logs read naturally. Changes must keep older apps working:
 * add fields and endpoints, and move to `/v2` for anything that would break them.
 */
import type { ShareErrorCode, ShareQuery } from './model';

/** Where the app reaches the service. */
export const SHARE_API_URL = 'https://api.chattolive.com';

/**
 * Read when the service cannot be reached at `SHARE_API_URL`: `{ "apiUrl": "https://…" }` on the
 * repository's `main` branch, so a moved service can be found by apps already installed.
 */
export const SHARE_FALLBACK_URL = 'https://raw.githubusercontent.com/ShiroOYuki/Chatto/main/share.json';

/** Path of the app's loopback page that the browser is sent back to after signing in. */
export const SHARE_LOOPBACK_PATH = '/chatto-sign-in';

/**
 * Hosts the app may follow `share.json` to: session tokens go wherever the service is, so a
 * changed fallback file cannot send them anywhere else.
 */
export const isShareServiceUrl = (url: string) => /^https:\/\/([a-z0-9-]+\.)*chattolive\.com(\/|$)/i.test(url);

/** Themes per page of `list`. */
export const SHARE_PAGE_SIZE = 24;

/** Largest request body the service reads: a theme, its metadata and a thumbnail. */
export const SHARE_MAX_BODY_BYTES = 2 * 1024 * 1024;

/** Largest thumbnail, decoded. */
export const SHARE_MAX_THUMBNAIL_BYTES = 1024 * 1024;

/** HTTP status for each error code. */
export const SHARE_ERROR_STATUS: Record<ShareErrorCode, number> = {
  network: 503,
  unauthorized: 401,
  forbidden: 403,
  banned: 403,
  'not-found': 404,
  'rate-limited': 429,
  busy: 429,
  invalid: 422,
  'identity-taken': 409,
  'last-identity': 409,
  terms: 403,
  cancelled: 410,
  'app-outdated': 409,
  unknown: 500,
};

const segment = encodeURIComponent;

/** Paths of the API, relative to the service URL. */
export const sharePaths = {
  themes: '/v1/themes',
  theme: (id: string) => `/v1/themes/${segment(id)}`,
  like: (id: string) => `/v1/themes/${segment(id)}/like`,
  reports: (id: string) => `/v1/themes/${segment(id)}/reports`,
  downloads: (id: string) => `/v1/themes/${segment(id)}/downloads`,
  code: (code: string) => `/v1/codes/${segment(code)}`,
  versions: '/v1/versions',
  asset: (file: string) => `/v1/assets/${segment(file)}`,
  thumbnail: (file: string) => `/v1/thumbnails/${segment(file)}`,

  signIn: '/v1/auth/sign-in',
  token: '/v1/auth/token',
  signOut: '/v1/auth/sign-out',
  /** Browser pages of the OAuth round trip. */
  authStart: (state: string) => `/v1/auth/start/${segment(state)}`,
  authCallback: (provider: string) => `/v1/auth/callback/${segment(provider)}`,

  account: '/v1/account',
  identity: (provider: string) => `/v1/account/identities/${segment(provider)}`,
  mine: '/v1/account/themes',

  moderationReports: '/v1/moderation/reports',
  moderationTheme: (id: string) => `/v1/moderation/themes/${segment(id)}`,
  moderationAccount: (id: string) => `/v1/moderation/accounts/${segment(id)}`,
} as const;

/** `list` as query parameters. */
export function listQueryString(query: ShareQuery): string {
  const params = new URLSearchParams({ sort: query.sort });
  if (query.category) params.set('category', query.category);
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.page) params.set('page', String(query.page));
  return params.toString();
}

/** Request bodies. */
export interface SignInBody {
  provider: string;
  port: number;
  challenge: string;
}
export interface TokenBody {
  code: string;
  verifier: string;
}
export interface DisplayNameBody {
  displayName: string;
}
export interface ReportBody {
  reason: string;
  note: string;
}
export interface DownloadBody {
  clientId: string;
}
export interface VersionsBody {
  ids: string[];
}
export interface HiddenBody {
  hidden: boolean;
}
export interface BannedBody {
  banned: boolean;
}
