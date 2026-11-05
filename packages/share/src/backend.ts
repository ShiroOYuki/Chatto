import type {
  PublishInput,
  ShareAccount,
  SharePage,
  ShareProvider,
  ShareQuery,
  ShareReport,
  ShareReportReason,
  ShareResult,
  ShareThemeDetail,
  ShareThemeSummary,
} from './model';

/**
 * Starting a sign-in. The app proves it is the one finishing it with PKCE: it keeps a random
 * `verifier` and sends only `challenge` (base64url SHA-256 of the verifier). The service sends the
 * browser back to `http://127.0.0.1:<port>` + `SHARE_LOOPBACK_PATH`, which only the app that
 * started the sign-in listens on, so a sign-in link passed to someone else is useless.
 */
export interface SignInStart {
  /** The app's loopback port; 0 for the fake service, which has no browser step. */
  port: number;
  challenge: string;
}

/** A sign-in started in the browser. */
export interface SignInRequest {
  /** Page to open in the system browser; null when there is nothing to open (the fake service). */
  url: string | null;
  /** Only the fake service: the code the browser step would have delivered. */
  code?: string;
}

/** What finishing a sign-in gives: the session token and its account. */
export interface SignInResult {
  token: string;
  account: ShareAccount;
}

/** Errors a sign-in can end with, as the service reports them to the loopback page. */
export const SIGN_IN_ERRORS = ['identity-taken', 'banned', 'cancelled', 'unknown'] as const;
export type SignInError = (typeof SIGN_IN_ERRORS)[number];

/**
 * The sharing service as the app uses it: one method per `/v1` endpoint. Calls that act for an
 * account take its session token. The real service talks HTTP to the Worker; until it exists,
 * `createFakeShareBackend` keeps everything in memory.
 */
export interface ShareBackend {
  list(query: ShareQuery, token?: string): Promise<ShareResult<SharePage>>;
  /** A theme by its code, as typed in the search box. */
  findByCode(code: string, token?: string): Promise<ShareResult<ShareThemeSummary>>;
  get(id: string, token?: string): Promise<ShareResult<ShareThemeDetail>>;
  /** Current versions of shared themes, for "new version" hints; unknown or removed ids are left out. */
  versions(ids: string[]): Promise<ShareResult<Record<string, number>>>;
  /** Bytes of an `asset:` frame image a shared theme uses. */
  asset(file: string): Promise<ShareResult<Uint8Array>>;
  /**
   * Uploads a frame image before publishing a theme that uses it. `file` is `<sha256>.<ext>`
   * of the bytes, as `ThemeAssets` names it; files the service already has are accepted as is.
   */
  uploadAsset(token: string, file: string, bytes: Uint8Array): Promise<ShareResult<void>>;
  /**
   * Where a preview can load an `asset:` image of a shared theme before it is installed: a URL
   * of the service, or a data URL. Null when the service has no such file.
   */
  assetUrl(file: string): string | null;
  /** Counts a download; the same client is counted once a day per theme. */
  recordDownload(id: string, clientId: string): Promise<ShareResult<void>>;

  /** Starts signing in, or linking another sign-in method when `token` is given. */
  beginSignIn(provider: ShareProvider, start: SignInStart, token?: string): Promise<ShareResult<SignInRequest>>;
  /** Trades the code the loopback received, with the PKCE verifier, for a session. */
  finishSignIn(code: string, verifier: string): Promise<ShareResult<SignInResult>>;
  account(token: string): Promise<ShareResult<ShareAccount>>;
  setDisplayName(token: string, name: string): Promise<ShareResult<ShareAccount>>;
  unlink(token: string, provider: ShareProvider): Promise<ShareResult<ShareAccount>>;
  signOut(token: string): Promise<ShareResult<void>>;
  /** Deletes the account; its themes stay, shown as by an anonymous author. */
  deleteAccount(token: string): Promise<ShareResult<void>>;

  setLiked(token: string, id: string, liked: boolean): Promise<ShareResult<ShareThemeSummary>>;
  report(token: string, id: string, reason: ShareReportReason, note: string): Promise<ShareResult<void>>;

  mine(token: string): Promise<ShareResult<ShareThemeSummary[]>>;
  publish(token: string, input: PublishInput): Promise<ShareResult<ShareThemeSummary>>;
  /** Publishes a new version of one of the account's themes. */
  update(token: string, id: string, input: PublishInput): Promise<ShareResult<ShareThemeSummary>>;
  unpublish(token: string, id: string): Promise<ShareResult<void>>;

  /** Moderators only. */
  reports(token: string): Promise<ShareResult<ShareReport[]>>;
  setHidden(token: string, id: string, hidden: boolean): Promise<ShareResult<void>>;
  setBanned(token: string, accountId: string, banned: boolean): Promise<ShareResult<void>>;
}
