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

/** A sign-in started in the browser; the app polls until it finishes. */
export interface SignInRequest {
  requestId: string;
  /** Page to open in the system browser; null when there is nothing to open (the fake service). */
  url: string | null;
}

export type SignInPoll =
  | { status: 'pending' }
  | { status: 'done'; token: string; account: ShareAccount }
  | { status: 'failed'; error: 'identity-taken' | 'banned' | 'cancelled' | 'unknown' };

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
  beginSignIn(provider: ShareProvider, token?: string): Promise<ShareResult<SignInRequest>>;
  pollSignIn(requestId: string): Promise<ShareResult<SignInPoll>>;
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
