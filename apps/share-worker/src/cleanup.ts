import type { Env } from './env';
import { dayOf } from './env';
import { SESSION_LIFETIME } from './accounts';
import { SIGN_IN_LIFETIME } from './signin';
import { assetKey } from './themes';

/** Uploaded images nobody uses are kept this long, so a publish that is still under way can use them. */
const ORPHAN_GRACE = 24 * 60 * 60 * 1000;

/**
 * Scheduled cleanup: request counters after a few minutes, unfinished sign-ins, yesterday's download
 * marks (the counts stay on the themes), sessions unused for months, and images no theme uses.
 */
export async function cleanup(env: Env, now: number, { assets = true } = {}): Promise<void> {
  const db = env.DB;
  await db.batch([
    db.prepare('DELETE FROM rate_limits WHERE minute < ?').bind(Math.floor(now / 60_000) - 5),
    db.prepare('DELETE FROM sign_ins WHERE created_at < ?').bind(now - SIGN_IN_LIFETIME * 2),
    db.prepare('DELETE FROM download_marks WHERE day < ?').bind(dayOf(now)),
    db.prepare('DELETE FROM sessions WHERE used_at < ?').bind(now - SESSION_LIFETIME),
  ]);
  if (!assets) return;
  let cursor: string | undefined;
  do {
    const page = await env.BUCKET.list({ prefix: 'assets/', cursor, limit: 500 });
    const old = page.objects
      .filter((object) => now - object.uploaded.getTime() > ORPHAN_GRACE)
      .map((object) => object.key.slice('assets/'.length));
    const unused: string[] = [];
    // D1 takes at most 100 bound values per statement.
    for (let start = 0; start < old.length; start += 90) {
      const chunk = old.slice(start, start + 90);
      const { results } = await db
        .prepare(`SELECT DISTINCT file FROM theme_assets WHERE file IN (${chunk.map(() => '?').join(',')})`)
        .bind(...chunk)
        .all<{ file: string }>();
      const used = new Set(results.map((row) => row.file));
      unused.push(...chunk.filter((file) => !used.has(file)).map(assetKey));
    }
    if (unused.length) await env.BUCKET.delete(unused);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
