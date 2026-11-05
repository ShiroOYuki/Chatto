import type { ShareReport, ShareReportReason } from '@chatto/share';
import { requireModerator } from './accounts';
import type { Context } from './env';
import { ok, readJson, ShareError } from './http';
import { THEME_SELECT, themeSummary, type ThemeRow } from './themes';

/** `GET /v1/moderation/reports`: reported or hidden themes, most reported first. */
export async function listReports(context: Context): Promise<Response> {
  const moderator = await requireModerator(context);
  const db = context.env.DB;
  const { results: themes } = await db
    .prepare(
      `${THEME_SELECT} WHERE t.reports > 0 OR t.hidden_by_moderator = 1 OR IFNULL(a.banned, 0) = 1
      ORDER BY t.reports DESC, t.updated_at DESC LIMIT 200`,
    )
    .bind(moderator.id)
    .all<ThemeRow>();
  // All reports of the listed themes in one query, newest first.
  const entries = new Map<string, { reason: ShareReportReason; note: string }[]>();
  const ids = themes.map((row) => row.id);
  for (let start = 0; start < ids.length; start += 90) {
    const chunk = ids.slice(start, start + 90);
    const { results } = await db
      .prepare(
        `SELECT theme_id, reason, note FROM reports WHERE theme_id IN (${chunk.map(() => '?').join(',')})
         ORDER BY created_at DESC`,
      )
      .bind(...chunk)
      .all<{ theme_id: string; reason: ShareReportReason; note: string }>();
    for (const entry of results) entries.set(entry.theme_id, [...(entries.get(entry.theme_id) ?? []), entry]);
  }
  const reports: ShareReport[] = themes.map((row) => {
    const list = entries.get(row.id) ?? [];
    const reasons: ShareReport['reasons'] = {};
    for (const entry of list) reasons[entry.reason] = (reasons[entry.reason] ?? 0) + 1;
    return {
      theme: themeSummary(context, row),
      count: list.length,
      reasons,
      notes: list.map((entry) => entry.note).filter(Boolean),
      authorBanned: Boolean(row.author_banned),
    };
  });
  return ok(reports);
}

/** `PUT /v1/moderation/themes/:id`: hides or restores a theme; restoring clears the reports that hid it. */
export async function setHidden(context: Context, id: string): Promise<Response> {
  await requireModerator(context);
  const { hidden } = await readJson<{ hidden?: unknown }>(context.request, 1024);
  if (typeof hidden !== 'boolean') throw new ShareError('invalid');
  const changed = await context.env.DB.prepare(
    hidden
      ? 'UPDATE themes SET hidden_by_moderator = 1 WHERE id = ?'
      : 'UPDATE themes SET hidden_by_moderator = 0, cleared_reports = reports WHERE id = ?',
  )
    .bind(id)
    .run();
  if (!changed.meta.changes) throw new ShareError('not-found');
  return ok(undefined);
}

/** `PUT /v1/moderation/accounts/:id`: suspends an account (its themes are hidden with it) or lifts it. */
export async function setBanned(context: Context, id: string): Promise<Response> {
  const moderator = await requireModerator(context);
  const { banned } = await readJson<{ banned?: unknown }>(context.request, 1024);
  if (typeof banned !== 'boolean') throw new ShareError('invalid');
  if (id === moderator.id) throw new ShareError('forbidden');
  const changed = await context.env.DB.prepare('UPDATE accounts SET banned = ? WHERE id = ?')
    .bind(banned ? 1 : 0, id)
    .run();
  if (!changed.meta.changes) throw new ShareError('not-found');
  return ok(undefined);
}
