import { assetFileOf, assetSrc, THEME_SCHEMA_VERSION, type ChatTheme } from '@chatto/core';
import { mapThemeImages, normalizeTheme, themeImageSources } from '@chatto/chat-ui/themes';
import {
  type ShareBackend,
  type SignInRequest,
  SIGN_IN_ERRORS,
  createPkceVerifier,
  pkceChallenge,
  SHARE_TERMS_VERSION,
  shareFail,
  shareOk,
  type PublishMeta,
  type ShareAccount,
  type ShareErrorCode,
  type SharePage,
  type ShareProvider,
  type ShareQuery,
  type ShareReport,
  type ShareReportReason,
  type ShareResult,
  type ShareSession,
  type ShareState,
  type ShareThemeDetail,
  type ShareThemeSummary,
  checkPublish,
  themeContentHash,
} from '@chatto/share';

/** Where the session token is kept (encrypted on disk in the app). */
export interface SessionStore {
  load(): Promise<string | null>;
  save(token: string): Promise<void>;
  clear(): Promise<void>;
}

/** Stores frame images as `<sha256>.<ext>` files; `add` throws on images Chatto does not take. */
export interface ShareAssets {
  add(bytes: Uint8Array): string | Promise<string>;
  has(file: string): boolean | Promise<boolean>;
  read(file: string): Uint8Array | null | Promise<Uint8Array | null>;
}

/**
 * A page on 127.0.0.1 the browser is sent back to after signing in (`share-loopback.ts` in the
 * app), so only the app that started a sign-in receives its code.
 */
export interface SignInLoopback {
  port: number;
  /** The query of the first visit to `SHARE_LOOPBACK_PATH`: `code`, or `error`. */
  result: Promise<URLSearchParams>;
  close(): void;
}

export interface ShareClientOptions {
  backend: ShareBackend;
  session: SessionStore;
  /** Anonymous id that counts downloads once a day. */
  clientId: () => string;
  termsAccepted: () => number;
  setTermsAccepted: (version: number) => void;
  openExternal: (url: string) => void;
  /** Local themes, and saving one (the app controller). */
  themes: () => ChatTheme[];
  saveTheme: (theme: ChatTheme) => void;
  /** Frame image files (`ThemeAssets` in the app; in memory in the browser preview). */
  assets: ShareAssets;
  onChange: () => void;
  /** Opens the loopback page for a browser sign-in; not needed with the fake service. */
  loopback?: () => Promise<SignInLoopback>;
  /** A sign-in left unfinished in the browser for this long gives up. */
  signInTimeout?: number;
  newThemeId?: () => string;
}

/**
 * The app's side of theme sharing. In the app it runs in the main process, so the session
 * token never reaches the control panel; the browser preview runs it in the page with the
 * fake service. It runs the browser sign-in, and installs and publishes themes against the
 * local theme store. Every call returns a `ShareResult`, so the control panel can show what
 * went wrong.
 */
export class ShareClient {
  #token: string | null = null;
  #session: ShareSession = { status: 'signed-out' };
  /** Ends the wait for the browser of the sign-in in progress. */
  #stopWaiting: (() => void) | null = null;
  /** Bumped by every sign-in and cancel, so the result of a replaced sign-in is ignored. */
  #attempt = 0;

  constructor(private readonly options: ShareClientOptions) {}

  state(): ShareState {
    return { session: this.#session, termsAccepted: this.options.termsAccepted() };
  }

  /** Restores the saved session; a token the service no longer accepts is forgotten. */
  async init(): Promise<void> {
    const token = await this.options.session.load().catch(() => null);
    if (!token) return;
    const result = await this.options.backend.account(token).catch(() => shareFail<ShareAccount>('network'));
    if (result.ok) {
      this.#token = token;
      this.#setSession({ status: 'signed-in', account: result.value });
    }
    // Offline: the token stays on disk for the next launch; until then the app shows signed out.
    else if (result.error === 'unauthorized' || result.error === 'banned') await this.#forget();
  }

  acceptTerms(): void {
    this.options.setTermsAccepted(SHARE_TERMS_VERSION);
    this.options.onChange();
  }

  // ---------- sign-in ----------

  /** Signs in with a provider, or links it to the signed-in account. Opens the browser. */
  async signIn(provider: ShareProvider): Promise<ShareResult<void>> {
    if (this.options.termsAccepted() < SHARE_TERMS_VERSION) return shareFail('terms');
    if (this.#session.status === 'pending') this.cancelSignIn();
    // With a session, the new sign-in method is linked to that account.
    const linking = this.#token !== null;
    const verifier = createPkceVerifier();
    let loopback: SignInLoopback | null = null;
    if (this.options.loopback) {
      try {
        loopback = await this.options.loopback();
      } catch {
        return shareFail('unknown');
      }
    }
    const begun = await this.options.backend
      .beginSignIn(
        provider,
        { port: loopback?.port ?? 0, challenge: await pkceChallenge(verifier) },
        this.#token ?? undefined,
      )
      .catch(() => shareFail<SignInRequest>('network'));
    if (!begun.ok) {
      loopback?.close();
      return shareFail(begun.error);
    }
    const attempt = ++this.#attempt;
    this.#setSession({ status: 'pending', provider, linking });
    void this.#completeSignIn(attempt, begun.value, loopback, verifier);
    return shareOk(undefined);
  }

  /** Waits for the browser, then trades its code for a session. */
  async #completeSignIn(
    attempt: number,
    request: SignInRequest,
    loopback: SignInLoopback | null,
    verifier: string,
  ): Promise<void> {
    let code = request.code ?? null;
    let error: ShareErrorCode | null = null;
    if (!request.url) loopback?.close();
    else {
      if (!loopback) return void this.#endSignIn(attempt, 'unknown');
      this.options.openExternal(request.url);
      const params = await this.#waitForBrowser(loopback);
      loopback.close();
      if (attempt !== this.#attempt) return;
      code = params?.get('code') ?? null;
      if (!params) error = 'cancelled';
      else if (!code) {
        const reported = params.get('error');
        error = (SIGN_IN_ERRORS as readonly (string | null)[]).includes(reported)
          ? (reported as ShareErrorCode)
          : 'unknown';
      }
    }
    if (!error && code) {
      const result = await this.options.backend.finishSignIn(code, verifier).catch(() => shareFail('network'));
      if (attempt !== this.#attempt) return;
      if (result.ok) {
        this.#token = result.value.token;
        await this.options.session.save(result.value.token).catch(() => undefined);
        return this.#setSession({ status: 'signed-in', account: result.value.account });
      }
      error = result.error;
    }
    await this.#endSignIn(attempt, error ?? 'unknown');
  }

  /** The loopback's answer, or null when the sign-in is cancelled or times out. */
  #waitForBrowser(loopback: SignInLoopback): Promise<URLSearchParams | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => finish(null), this.options.signInTimeout ?? 10 * 60_000);
      const finish = (value: URLSearchParams | null) => {
        clearTimeout(timer);
        this.#stopWaiting = null;
        resolve(value);
      };
      this.#stopWaiting = () => finish(null);
      void loopback.result.then(finish);
    });
  }

  /** A failed sign-in: back to the account that was signed in, if any, with the error. */
  async #endSignIn(attempt: number, error: ShareErrorCode): Promise<void> {
    if (attempt !== this.#attempt) return;
    const account = this.#token ? await this.options.backend.account(this.#token) : null;
    if (attempt !== this.#attempt) return;
    this.#setSession(
      account?.ok ? { status: 'signed-in', account: account.value, error } : { status: 'signed-out', error },
    );
  }

  /** Stops waiting for the browser; a link in progress goes back to the signed-in account. */
  cancelSignIn(): void {
    this.#attempt += 1;
    this.#stopWaiting?.();
    if (this.#session.status !== 'pending') return;
    void this.#refreshAccount();
  }

  async signOut(): Promise<void> {
    this.cancelSignIn();
    if (this.#token) await this.options.backend.signOut(this.#token);
    await this.#forget();
  }

  setDisplayName(name: string): Promise<ShareResult<ShareAccount>> {
    return this.#accountCall((token) => this.options.backend.setDisplayName(token, name));
  }

  unlink(provider: ShareProvider): Promise<ShareResult<ShareAccount>> {
    return this.#accountCall((token) => this.options.backend.unlink(token, provider));
  }

  async deleteAccount(): Promise<ShareResult<void>> {
    const result = await this.#authed((token) => this.options.backend.deleteAccount(token));
    if (result.ok) await this.#forget();
    return result;
  }

  // ---------- browsing ----------

  list(query: ShareQuery): Promise<ShareResult<SharePage>> {
    return this.#call((token) => this.options.backend.list(query, token));
  }

  findByCode(code: string): Promise<ShareResult<ShareThemeSummary>> {
    return this.#call((token) => this.options.backend.findByCode(code, token));
  }

  /** A shared theme for previewing: its `asset:` images point at the service until it is installed. */
  async get(id: string): Promise<ShareResult<ShareThemeDetail>> {
    const result = await this.#detail(id);
    if (!result.ok) return result;
    const theme = mapThemeImages(result.value.theme, (image) => {
      const file = assetFileOf(image.src);
      const url = file ? this.options.backend.assetUrl(file) : null;
      return url ? { ...image, src: url } : image;
    });
    return shareOk({ ...result.value, theme });
  }

  #detail(id: string): Promise<ShareResult<ShareThemeDetail>> {
    return this.#call((token) => this.options.backend.get(id, token));
  }

  versions(ids: string[]): Promise<ShareResult<Record<string, number>>> {
    return this.#call(() => this.options.backend.versions(ids));
  }

  setLiked(id: string, liked: boolean): Promise<ShareResult<ShareThemeSummary>> {
    return this.#authed((token) => this.options.backend.setLiked(token, id, liked));
  }

  report(id: string, reason: ShareReportReason, note: string): Promise<ShareResult<void>> {
    return this.#authed((token) => this.options.backend.report(token, id, reason, note));
  }

  /**
   * Installs a shared theme as a new local theme, or updates the local theme `replaceId` in
   * place. Frame images are fetched into the asset folder. Resolves to the saved theme.
   */
  async install(id: string, replaceId?: string): Promise<ShareResult<ChatTheme>> {
    const detail = await this.#detail(id);
    if (!detail.ok) return detail;
    if ((detail.value.theme.schemaVersion as number) > THEME_SCHEMA_VERSION) return shareFail('app-outdated');
    for (const src of themeImageSources(detail.value.theme)) {
      const file = assetFileOf(src);
      if (!file || (await this.options.assets.has(file))) continue;
      const bytes = await this.options.backend.asset(file);
      if (!bytes.ok) return bytes;
      try {
        if ((await this.options.assets.add(bytes.value)) !== file) return shareFail('invalid');
      } catch {
        return shareFail('invalid');
      }
    }
    const replacing = replaceId ? this.options.themes().find((theme) => theme.id === replaceId) : undefined;
    const theme = normalizeTheme({
      ...detail.value.theme,
      id: replacing?.id ?? this.options.newThemeId?.() ?? `custom-${Date.now().toString(36)}`,
      name: detail.value.name,
      builtIn: false,
    });
    const installed: ChatTheme = {
      ...theme,
      origin: { shareId: id, version: detail.value.version, contentHash: themeContentHash(theme) },
    };
    try {
      this.options.saveTheme(installed);
    } catch {
      return shareFail('unknown');
    }
    void this.options.backend.recordDownload(id, this.options.clientId());
    return shareOk(installed);
  }

  // ---------- publishing ----------

  mine(): Promise<ShareResult<ShareThemeSummary[]>> {
    return this.#authed((token) => this.options.backend.mine(token));
  }

  /** Publishes a local theme, or a new version of the shared theme `shareId`. */
  async publish(
    themeId: string,
    meta: PublishMeta,
    thumbnail?: string,
    shareId?: string,
  ): Promise<ShareResult<ShareThemeSummary>> {
    const theme = this.options.themes().find((item) => item.id === themeId && !item.builtIn);
    if (!theme) return shareFail('not-found');
    const sizes = new Map<string, number>();
    for (const src of themeImageSources(theme)) {
      const file = assetFileOf(src);
      if (file) sizes.set(src, (await this.options.assets.read(file))?.byteLength ?? 0);
    }
    const issues = checkPublish(theme, meta, { assetBytes: (src) => sizes.get(src) ?? 0 });
    if (issues.length) return shareFail('invalid', issues);
    const result = await this.#authed(async (token) => {
      const uploaded = await this.#uploadImages(token, theme);
      if (!uploaded.ok) return uploaded;
      const input = { ...meta, theme: uploaded.value, ...(thumbnail ? { thumbnail } : {}) };
      return shareId ? this.options.backend.update(token, shareId, input) : this.options.backend.publish(token, input);
    });
    if (!result.ok) return result;
    // The local theme now follows what was published, so "My themes" can offer to update it later.
    this.options.saveTheme({
      ...theme,
      origin: { shareId: result.value.id, version: result.value.version, contentHash: themeContentHash(theme) },
    });
    void this.#refreshAccount(); // publishes left today
    return result;
  }

  unpublish(id: string): Promise<ShareResult<void>> {
    return this.#authed((token) => this.options.backend.unpublish(token, id));
  }

  // ---------- moderation ----------

  reports(): Promise<ShareResult<ShareReport[]>> {
    return this.#authed((token) => this.options.backend.reports(token));
  }

  setHidden(id: string, hidden: boolean): Promise<ShareResult<void>> {
    return this.#authed((token) => this.options.backend.setHidden(token, id, hidden));
  }

  setBanned(accountId: string, banned: boolean): Promise<ShareResult<void>> {
    return this.#authed((token) => this.options.backend.setBanned(token, accountId, banned));
  }

  // ---------- helpers ----------

  /**
   * Uploads a theme's frame images and returns the theme as the service stores it: every image an
   * `asset:` file. Data URLs are saved as local asset files first, so they upload the same way.
   */
  async #uploadImages(token: string, theme: ChatTheme): Promise<ShareResult<ChatTheme>> {
    const files = new Map<string, string>();
    for (const src of themeImageSources(theme)) {
      let file = assetFileOf(src);
      if (!file) {
        const match = /^data:[^,]*;base64,(.*)$/s.exec(src);
        if (!match) return shareFail('invalid');
        try {
          file = await this.options.assets.add(Uint8Array.from(atob(match[1]!), (char) => char.charCodeAt(0)));
        } catch {
          return shareFail('invalid');
        }
      }
      files.set(src, file);
    }
    for (const file of new Set(files.values())) {
      const bytes = await this.options.assets.read(file);
      if (!bytes) return shareFail('invalid', [{ code: 'image-missing', file }]);
      const result = await this.options.backend.uploadAsset(token, file, bytes);
      if (!result.ok) return result;
    }
    return shareOk(mapThemeImages(theme, (image) => ({ ...image, src: assetSrc(files.get(image.src)!) })));
  }

  #setSession(session: ShareSession): void {
    this.#session = session;
    this.options.onChange();
  }

  async #forget(): Promise<void> {
    this.#token = null;
    await this.options.session.clear().catch(() => undefined);
    this.#setSession({ status: 'signed-out' });
  }

  async #refreshAccount(): Promise<void> {
    if (!this.#token) return this.#setSession({ status: 'signed-out' });
    const result = await this.options.backend.account(this.#token);
    if (result.ok) this.#setSession({ status: 'signed-in', account: result.value });
    else if (result.error === 'unauthorized') await this.#forget();
  }

  /** A call that works signed in or out; a rejected token signs the app out. */
  async #call<T>(run: (token?: string) => Promise<ShareResult<T>>): Promise<ShareResult<T>> {
    const result = await run(this.#token ?? undefined).catch(() => shareFail<T>('network'));
    if (!result.ok && result.error === 'unauthorized' && this.#token) await this.#forget();
    return result;
  }

  /** A call that needs an account. */
  #authed<T>(run: (token: string) => Promise<ShareResult<T>>): Promise<ShareResult<T>> {
    const token = this.#token;
    if (!token) return Promise.resolve(shareFail<T>('unauthorized'));
    return this.#call(() => run(token));
  }

  /** An account change; the new account replaces the session's. */
  async #accountCall(run: (token: string) => Promise<ShareResult<ShareAccount>>): Promise<ShareResult<ShareAccount>> {
    const result = await this.#authed(run);
    if (result.ok) this.#setSession({ status: 'signed-in', account: result.value });
    return result;
  }
}
