/**
 * Signing in (see `SignInStart` in `@chatto/share`):
 * 1. `POST /v1/auth/sign-in` — the app sends the method, its loopback port and a PKCE challenge,
 *    and gets a page to open in the browser.
 * 2. `GET /v1/auth/start/:state` — the browser is sent on to the platform.
 * 3. `GET /v1/auth/callback/:provider` — the platform sends it back; the Worker reads who signed in
 *    and sends the browser to the app's loopback page with a one-time code.
 * 4. `POST /v1/auth/token` — the app trades the code and its PKCE verifier for a session.
 * Accounts are only created or linked in step 4, so a sign-in link passed to someone else neither
 * signs the sender in as them nor links their identity: the code lands on the other person's
 * computer, and only the sender's app holds the verifier.
 */
import {
  pkceChallenge,
  SHARE_LOOPBACK_PATH,
  sharePaths,
  type ShareProvider,
  type SignInError,
  type SignInResult,
} from '@chatto/share';
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
import { expiredPage } from './pages';

/** A sign-in left unfinished this long is gone. */
export const SIGN_IN_LIFETIME = 10 * 60_000;

interface SignInRow {
  state: string;
  provider: ShareProvider;
  link_to: string | null;
  port: number;
  challenge: string;
  created_at: number;
  code_hash: string | null;
  user_id: string | null;
  user_name: string | null;
}

const isPort = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1024 && value <= 65535;

/** `POST /v1/auth/sign-in`: starts signing in, or linking another method when a session is sent. */
export async function beginSignIn(context: Context): Promise<Response> {
  await rateLimit(context, 'signIn', clientAddress(context));
  const { provider, port, challenge } = await readJson<{ provider?: unknown; port?: unknown; challenge?: unknown }>(
    context.request,
    1024,
  );
  if (!isShareProvider(provider) || !providerConfigured(context.env, provider)) throw new ShareError('invalid');
  if (!isPort(port) || typeof challenge !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(challenge))
    throw new ShareError('invalid');
  let linkTo: string | null = null;
  if (context.request.headers.has('Authorization')) {
    const account = await sessionAccount(context);
    if (!account) throw new ShareError('unauthorized');
    if (account.banned) throw new ShareError('banned');
    linkTo = account.id;
  }
  const state = newToken(context.random);
  await context.env.DB.prepare(
    'INSERT INTO sign_ins (state, provider, link_to, port, challenge, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(state, provider, linkTo, port, challenge, context.now)
    .run();
  return ok({ url: `${context.env.PUBLIC_URL.replace(/\/+$/, '')}${sharePaths.authStart(state)}` });
}

const findByState = (context: Context, state: string) =>
  context.env.DB.prepare('SELECT * FROM sign_ins WHERE state = ?').bind(state).first<SignInRow>();

/** Waiting for the browser to come back from the platform. */
const waiting = (context: Context, row: SignInRow | null): row is SignInRow =>
  row !== null && row.code_hash === null && context.now - row.created_at <= SIGN_IN_LIFETIME;

/** `GET /v1/auth/start/:state`: the page the app opens; sends the browser on to the platform. */
export async function startSignIn(context: Context, state: string): Promise<Response> {
  const row = await findByState(context, state);
  if (!waiting(context, row)) return expiredPage();
  return new Response(null, {
    status: 302,
    headers: { Location: authorizeUrl(context.env, row.provider, state), 'Cache-Control': 'no-store' },
  });
}

/** Sends the browser to the app's loopback page. */
function toLoopback(port: number, params: Record<string, string>): Response {
  const location = `http://127.0.0.1:${port}${SHARE_LOOPBACK_PATH}?${new URLSearchParams(params)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

/** `GET /v1/auth/callback/:provider`: where the platform sends the browser back. */
export async function finishCallback(context: Context, provider: string): Promise<Response> {
  const state = context.url.searchParams.get('state') ?? '';
  const row = state ? await findByState(context, state) : null;
  if (!waiting(context, row) || row.provider !== provider) return expiredPage();
  const fail = async (error: SignInError) => {
    await context.env.DB.prepare('DELETE FROM sign_ins WHERE state = ?').bind(state).run();
    return toLoopback(row.port, { error });
  };
  const code = context.url.searchParams.get('code');
  // No code: the person declined on the platform's page.
  if (!code) return fail('cancelled');
  let user: PlatformUser;
  try {
    user = await exchangeCode(context.env, row.provider, code, context.fetch);
  } catch {
    return fail('unknown');
  }
  const appCode = newToken(context.random);
  await context.env.DB.prepare('UPDATE sign_ins SET code_hash = ?, user_id = ?, user_name = ? WHERE state = ?')
    .bind(await hashOf(appCode), user.id, user.name, state)
    .run();
  return toLoopback(row.port, { code: appCode });
}

/** `POST /v1/auth/token`: the app that started the sign-in finishes it. */
export async function finishSignIn(context: Context): Promise<Response> {
  await rateLimit(context, 'signIn', clientAddress(context));
  const { code, verifier } = await readJson<{ code?: unknown; verifier?: unknown }>(context.request, 1024);
  if (typeof code !== 'string' || typeof verifier !== 'string' || !code || verifier.length > 128)
    throw new ShareError('invalid');
  const db = context.env.DB;
  const codeHash = await hashOf(code);
  const row = await db.prepare('SELECT * FROM sign_ins WHERE code_hash = ?').bind(codeHash).first<SignInRow>();
  if (!row || row.user_id === null || row.user_name === null) throw new ShareError('cancelled');
  // A code is good for one try.
  await db.prepare('DELETE FROM sign_ins WHERE state = ?').bind(row.state).run();
  if (context.now - row.created_at > SIGN_IN_LIFETIME) throw new ShareError('cancelled');
  if ((await pkceChallenge(verifier)) !== row.challenge) throw new ShareError('invalid');
  const accountId = await resolveAccount(context, row, { id: row.user_id, name: row.user_name });
  const account = await loadAccount(context, accountId);
  if (!account) throw new ShareError('unknown');
  if (account.banned) throw new ShareError('banned');
  const result: SignInResult = {
    token: await createSession(context, accountId),
    account: await publicAccount(context, account),
  };
  return ok(result);
}

/** The account a platform user signs in to: linked, found by identity, or new. Throws sign-in errors. */
async function resolveAccount(context: Context, row: SignInRow, user: PlatformUser): Promise<string> {
  const db = context.env.DB;
  const banned = await db
    .prepare('SELECT 1 FROM banned_identities WHERE provider = ? AND provider_user_id = ?')
    .bind(row.provider, user.id)
    .first();
  if (banned) throw new ShareError('banned');
  const owner = await db
    .prepare('SELECT account_id FROM identities WHERE provider = ? AND provider_user_id = ?')
    .bind(row.provider, user.id)
    .first<{ account_id: string }>();
  if (row.link_to) {
    if (owner && owner.account_id !== row.link_to) throw new ShareError('identity-taken');
    const target = await loadAccount(context, row.link_to);
    if (!target) throw new ShareError('cancelled');
    if (target.banned) throw new ShareError('banned');
    // One identity per method: linking another account of the same platform replaces it.
    await db.batch([
      db
        .prepare('DELETE FROM identities WHERE account_id = ? AND provider = ? AND provider_user_id != ?')
        .bind(target.id, row.provider, user.id),
      db
        .prepare(
          `INSERT INTO identities (provider, provider_user_id, account_id, name) VALUES (?, ?, ?, ?)
           ON CONFLICT (provider, provider_user_id) DO UPDATE SET name = excluded.name`,
        )
        .bind(row.provider, user.id, target.id, user.name),
    ]);
    return target.id;
  }
  if (owner) {
    await db
      .prepare('UPDATE identities SET name = ? WHERE provider = ? AND provider_user_id = ?')
      .bind(user.name, row.provider, user.id)
      .run();
    return owner.account_id;
  }
  const accountId = newId('acc', context.random);
  await db.batch([
    db
      .prepare('INSERT INTO accounts (id, display_name, created_at) VALUES (?, ?, ?)')
      .bind(accountId, displayNameFrom(user.name), context.now),
    db
      .prepare('INSERT INTO identities (provider, provider_user_id, account_id, name) VALUES (?, ?, ?, ?)')
      .bind(row.provider, user.id, accountId, user.name),
  ]);
  return accountId;
}
