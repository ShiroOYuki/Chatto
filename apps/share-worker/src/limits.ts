import { ShareError } from './http';
import { hashOf } from './crypto';
import type { Context } from './env';

/** Requests per minute. */
export const RATE_LIMITS = {
  /** Starting and finishing sign-ins, per address. */
  signIn: 20,
  /** Counting downloads, per address. */
  download: 120,
  /** Uploading frame images, per account. */
  upload: 60,
  /** Reports, likes and account changes, per account. */
  write: 60,
} as const;

/** The caller's address as Cloudflare reports it. */
export const clientAddress = (context: Context) => context.request.headers.get('CF-Connecting-IP') ?? 'unknown';

/**
 * Counts a request against `key` (an address or account id, stored hashed) and refuses it with
 * `busy` past `max` in the current minute. Counters are removed by the scheduled cleanup.
 */
export async function rateLimit(context: Context, scope: keyof typeof RATE_LIMITS, key: string): Promise<void> {
  const hashed = await hashOf(`${scope}:${key}`, context.env.HASH_SALT);
  const minute = Math.floor(context.now / 60_000);
  const row = await context.env.DB.prepare(
    `INSERT INTO rate_limits (key, minute, count) VALUES (?, ?, 1)
     ON CONFLICT (key, minute) DO UPDATE SET count = count + 1
     RETURNING count`,
  )
    .bind(hashed, minute)
    .first<{ count: number }>();
  if ((row?.count ?? 0) > RATE_LIMITS[scope]) throw new ShareError('busy');
}
