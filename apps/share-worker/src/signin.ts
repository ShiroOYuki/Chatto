import { sharePaths, type ShareAccount, type ShareProvider, type SignInPoll } from '@chatto/share';
import {
  createSession,
  displayNameFrom,
  isShareProvider,
  loadAccount,
  publicAccount,
  sessionAccount,
} from './accounts';
import { hashOf, newId, newToken } from './crypto';
import type { Context } from './env';
import { ok, readJson, ShareError } from './http';
import { clientAddress, rateLimit } from './limits';
import { authorizeUrl, exchangeCode, providerConfigured, type PlatformUser } from './oauth';
import { signInPage } from './pages';

/** A sign-in left unfinished this long is gone. */
export const SIGN_IN_LIFETIME = 10 * 60_000;

interface SignInRow {
  request_hash: string;
  state: string;
  provider: ShareProvider;
  link_to: string | null;
  created_at: number;
  result: string | null;
}

/** What the next poll returns, stored until then. The token is only kept here for those few seconds. */
type StoredResult = { status: 'done'; token: string; accountId: string } | Extract<SignInPoll, { status: 'failed' }>;

/** `POST /v1/auth/sign-in`: starts signing in, or linking another method when a session is sent. */
export async function beginSignIn(context: Context): Promise<Response> {
  await rateLimit(context, 'signIn', clientAddress(context));
  const { provider } = await readJson<{ provider?: unknown }>(context.request, 1024);
  if (!isShareProvider(provider) || !providerConfigured(context.env, provider)) throw new ShareError('invalid');
  let linkTo: string | null = null;
  if (context.request.headers.has('Authorization')) {
    const account = await sessionAccount(context);
    if (!account) throw new ShareError('unauthorized');
    if (account.banned) throw new ShareError('banned');
    linkTo = account.id;
  }
  const requestId = newToken(context.random);
  const state = newToken(context.random);
  await context.env.DB.prepare(
    'INSERT INTO sign_ins (request_hash, state, provider, link_to, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(await hashOf(requestId), state, provider, linkTo, context.now)
    .run();
  return ok({ requestId, url: `${context.env.PUBLIC_URL.replace(/\/+$/, '')}${sharePaths.authStart(state)}` });
}

const findByState = (context: Context, state: string) =>
  context.env.DB.prepare('SELECT * FROM sign_ins WHERE state = ?').bind(state).first<SignInRow>();

const live = (context: Context, row: SignInRow | null): row is SignInRow =>
  row !== null && row.result === null && context.now - row.created_at <= SIGN_IN_LIFETIME;

/** `GET /v1/auth/start/:state`: the page the app opens; sends the browser on to the platform. */
export async function startSignIn(context: Context, state: string): Promise<Response> {
  const row = await findByState(context, state);
  if (!live(context, row)) return signInPage('expired', 410);
  return new Response(null, {
    status: 302,
    headers: { Location: authorizeUrl(context.env, row.provider, state), 'Cache-Control': 'no-store' },
  });
}

/** `GET /v1/auth/callback/:provider`: where the platform sends the browser back. */
export async function finishSignIn(context: Context, provider: string): Promise<Response> {
  const state = context.url.searchParams.get('state') ?? '';
  const row = state ? await findByState(context, state) : null;
  if (!live(context, row) || row.provider !== provider) return signInPage('expired', 410);
  const code = context.url.searchParams.get('code');
  let user: PlatformUser | null = null;
  if (code) user = await exchangeCode(context.env, row.provider, code, context.fetch).catch(() => null);
  // No code: the person declined on the platform's page.
  const result: StoredResult = !code
    ? { status: 'failed', error: 'cancelled' }
    : user
      ? await resolveAccount(context, row, user)
      : { status: 'failed', error: 'unknown' };
  await context.env.DB.prepare('UPDATE sign_ins SET result = ? WHERE request_hash = ?')
    .bind(JSON.stringify(result), row.request_hash)
    .run();
  return result.status === 'done' ? signInPage('done') : signInPage('failed');
}

/** The account a platform user signs in to: linked, found by identity, or new. */
async function resolveAccount(context: Context, row: SignInRow, user: PlatformUser): Promise<StoredResult> {
  const db = context.env.DB;
  const banned = await db
    .prepare('SELECT 1 FROM banned_identities WHERE provider = ? AND provider_user_id = ?')
    .bind(row.provider, user.id)
    .first();
  if (banned) return { status: 'failed', error: 'banned' };
  const owner = await db
    .prepare('SELECT account_id FROM identities WHERE provider = ? AND provider_user_id = ?')
    .bind(row.provider, user.id)
    .first<{ account_id: string }>();
  let accountId: string;
  if (row.link_to) {
    if (owner && owner.account_id !== row.link_to) return { status: 'failed', error: 'identity-taken' };
    accountId = row.link_to;
    if (!(await loadAccount(context, accountId))) return { status: 'failed', error: 'cancelled' };
    // One identity per method: linking another account of the same platform replaces it.
    await db.batch([
      db
        .prepare('DELETE FROM identities WHERE account_id = ? AND provider = ? AND provider_user_id != ?')
        .bind(accountId, row.provider, user.id),
      db
        .prepare(
          `INSERT INTO identities (provider, provider_user_id, account_id, name) VALUES (?, ?, ?, ?)
           ON CONFLICT (provider, provider_user_id) DO UPDATE SET name = excluded.name`,
        )
        .bind(row.provider, user.id, accountId, user.name),
    ]);
  } else if (owner) {
    accountId = owner.account_id;
    await db
      .prepare('UPDATE identities SET name = ? WHERE provider = ? AND provider_user_id = ?')
      .bind(user.name, row.provider, user.id)
      .run();
  } else {
    accountId = newId('acc', context.random);
    await db.batch([
      db
        .prepare('INSERT INTO accounts (id, display_name, created_at) VALUES (?, ?, ?)')
        .bind(accountId, displayNameFrom(user.name), context.now),
      db
        .prepare('INSERT INTO identities (provider, provider_user_id, account_id, name) VALUES (?, ?, ?, ?)')
        .bind(row.provider, user.id, accountId, user.name),
    ]);
  }
  const account = await loadAccount(context, accountId);
  if (!account) return { status: 'failed', error: 'unknown' };
  if (account.banned) return { status: 'failed', error: 'banned' };
  return { status: 'done', token: await createSession(context, accountId), accountId };
}

/** `POST /v1/auth/poll`: the app waits here until the browser part is done. */
export async function pollSignIn(context: Context): Promise<Response> {
  await rateLimit(context, 'poll', clientAddress(context));
  const { requestId } = await readJson<{ requestId?: unknown }>(context.request, 1024);
  if (typeof requestId !== 'string' || !requestId) throw new ShareError('invalid');
  const hash = await hashOf(requestId);
  const db = context.env.DB;
  const row = await db.prepare('SELECT * FROM sign_ins WHERE request_hash = ?').bind(hash).first<SignInRow>();
  const cancelled: SignInPoll = { status: 'failed', error: 'cancelled' };
  if (!row) return ok(cancelled);
  if (row.result === null) {
    if (context.now - row.created_at <= SIGN_IN_LIFETIME) return ok<SignInPoll>({ status: 'pending' });
    await db.prepare('DELETE FROM sign_ins WHERE request_hash = ?').bind(hash).run();
    return ok(cancelled);
  }
  await db.prepare('DELETE FROM sign_ins WHERE request_hash = ?').bind(hash).run();
  const result = JSON.parse(row.result) as StoredResult;
  if (result.status === 'failed') return ok<SignInPoll>(result);
  const account = await loadAccount(context, result.accountId);
  if (!account) return ok<SignInPoll>({ status: 'failed', error: 'unknown' });
  const view: ShareAccount = await publicAccount(context, account);
  return ok<SignInPoll>({ status: 'done', token: result.token, account: view });
}
