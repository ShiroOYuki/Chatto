import {
  hasDailyPublishLimit,
  SHARE_LIMITS,
  SHARE_PROVIDERS,
  type ShareAccount,
  type ShareIdentity,
  type ShareProvider,
} from '@chatto/share';
import { hashOf, newToken } from './crypto';
import { dayOf, DAY, type Context } from './env';
import { ShareError } from './http';

export interface AccountRow {
  id: string;
  display_name: string;
  role: 'member' | 'moderator';
  banned: number;
  official: number;
  publish_day: number;
  publish_count: number;
}

/** A session not used for this long is gone. */
export const SESSION_LIFETIME = 180 * DAY;

const bearer = (request: Request) => /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1] ?? null;

/** Starts a session for an account; returns its token, which is stored only as a hash. */
export async function createSession(context: Context, accountId: string): Promise<string> {
  const token = newToken(context.random);
  await context.env.DB.prepare('INSERT INTO sessions (token_hash, account_id, created_at, used_at) VALUES (?, ?, ?, ?)')
    .bind(await hashOf(token), accountId, context.now, context.now)
    .run();
  return token;
}

/** The account behind the request's token, banned or not; null without a valid session. */
export async function sessionAccount(context: Context): Promise<AccountRow | null> {
  const token = bearer(context.request);
  if (!token) return null;
  const hash = await hashOf(token);
  const row = await context.env.DB.prepare(
    `SELECT a.*, s.used_at FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ?`,
  )
    .bind(hash)
    .first<AccountRow & { used_at: number }>();
  if (!row || context.now - row.used_at > SESSION_LIFETIME) return null;
  // Marking use once a day is enough to keep sessions alive.
  if (dayOf(row.used_at) !== dayOf(context.now))
    await context.env.DB.prepare('UPDATE sessions SET used_at = ? WHERE token_hash = ?').bind(context.now, hash).run();
  const { used_at: _usedAt, ...account } = row;
  return account;
}

/** The signed-in account; `unauthorized` without one, `banned` when it is suspended. */
export async function requireAccount(context: Context): Promise<AccountRow> {
  const account = await sessionAccount(context);
  if (!account) throw new ShareError('unauthorized');
  if (account.banned) throw new ShareError('banned');
  return account;
}

export async function requireModerator(context: Context): Promise<AccountRow> {
  const account = await requireAccount(context);
  if (account.role !== 'moderator') throw new ShareError('forbidden');
  return account;
}

export async function signOut(context: Context): Promise<void> {
  const token = bearer(context.request);
  if (token)
    await context.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
      .bind(await hashOf(token))
      .run();
}

export const isShareProvider = (value: unknown): value is ShareProvider =>
  (SHARE_PROVIDERS as readonly unknown[]).includes(value);

/** The account as the app sees it. */
export async function publicAccount(context: Context, account: AccountRow): Promise<ShareAccount> {
  const { results } = await context.env.DB.prepare(
    'SELECT provider, name FROM identities WHERE account_id = ? ORDER BY provider',
  )
    .bind(account.id)
    .all<ShareIdentity>();
  const counted = hasDailyPublishLimit(account.role) && account.publish_day === dayOf(context.now);
  const used = counted ? account.publish_count : 0;
  return {
    id: account.id,
    displayName: account.display_name,
    identities: results.map(({ provider, name }) => ({ provider, name })),
    role: account.role,
    publishesLeft: Math.max(0, SHARE_LIMITS.dailyPublishes - used),
  };
}

export async function loadAccount(context: Context, id: string): Promise<AccountRow | null> {
  return context.env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(id).first<AccountRow>();
}

/** Trims a display name; `invalid` when empty or too long. */
export function cleanDisplayName(name: unknown): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed || [...trimmed].length > SHARE_LIMITS.displayNameLength) throw new ShareError('invalid');
  return trimmed;
}

/** A platform name cut down to fit as a display name. */
export const displayNameFrom = (name: string) =>
  [...(name.trim() || 'Chatto')].slice(0, SHARE_LIMITS.displayNameLength).join('');

/**
 * Deletes an account. Its themes stay, shown as by an anonymous author; its likes and reports
 * are taken back from the counts first. A suspended account's themes stay hidden, and its
 * sign-in identities are remembered so they cannot make a new account.
 */
export async function deleteAccount(context: Context, account: AccountRow): Promise<void> {
  const db = context.env.DB;
  const id = account.id;
  const suspended = account.banned
    ? [
        db
          .prepare(
            `INSERT OR IGNORE INTO banned_identities (provider, provider_user_id, banned_at)
             SELECT provider, provider_user_id, ? FROM identities WHERE account_id = ?`,
          )
          .bind(context.now, id),
        db.prepare('UPDATE themes SET hidden_by_moderator = 1 WHERE author_id = ?').bind(id),
      ]
    : [];
  await db.batch([
    ...suspended,
    db
      .prepare('UPDATE themes SET likes = likes - 1 WHERE id IN (SELECT theme_id FROM likes WHERE account_id = ?)')
      .bind(id),
    db
      .prepare(
        `UPDATE themes SET reports = reports - 1, cleared_reports = MIN(cleared_reports, reports - 1)
         WHERE id IN (SELECT theme_id FROM reports WHERE account_id = ?)`,
      )
      .bind(id),
    db.prepare('DELETE FROM likes WHERE account_id = ?').bind(id),
    db.prepare('DELETE FROM reports WHERE account_id = ?').bind(id),
    db.prepare('DELETE FROM sessions WHERE account_id = ?').bind(id),
    db.prepare('DELETE FROM identities WHERE account_id = ?').bind(id),
    db.prepare('DELETE FROM sign_ins WHERE link_to = ?').bind(id),
    db.prepare('UPDATE themes SET author_id = NULL WHERE author_id = ?').bind(id),
    db.prepare('DELETE FROM accounts WHERE id = ?').bind(id),
  ]);
}
