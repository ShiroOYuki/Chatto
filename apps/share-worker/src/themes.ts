import { assetFileOf, THEME_SCHEMA_VERSION, type ChatTheme } from '@chatto/core';
import { normalizeTheme, themeImageSources } from '@chatto/chat-ui/themes';
import {
  autoTags,
  checkPublish,
  createShareCode,
  dataUrlBytes,
  hasDailyPublishLimit,
  isAssetFile,
  isShareCategory,
  normalizeTag,
  parseShareCode,
  SHARE_LIMITS,
  SHARE_MAX_BODY_BYTES,
  SHARE_MAX_THUMBNAIL_BYTES,
  SHARE_PAGE_SIZE,
  SHARE_REPORT_REASONS,
  sharePaths,
  themeContentHash,
  type PublishInput,
  type PublishMeta,
  type ShareIssue,
  type SharePage,
  type ShareReportReason,
  type ShareSort,
  type ShareThemeDetail,
  type ShareThemeSummary,
} from '@chatto/share';
import { sniffImage } from '@chatto/core';
import { requireAccount, sessionAccount, type AccountRow } from './accounts';
import { hashOf, newId } from './crypto';
import { dayOf, type Context } from './env';
import { ok, readBytes, readJson, ShareError } from './http';
import { clientAddress, rateLimit } from './limits';

// ---------- storage keys ----------

export const themeKey = (id: string) => `themes/${id}.json`;
export const assetKey = (file: string) => `assets/${file}`;
export const thumbnailKey = (file: string) => `thumbnails/${file}`;

// ---------- reading ----------

interface ThemeRow {
  id: string;
  code: string;
  name: string;
  description: string;
  category: ShareThemeSummary['category'];
  tags: string;
  auto_tags: string;
  author_id: string | null;
  author_name: string | null;
  author_official: number;
  remix_of: string | null;
  remix_name: string | null;
  remix_author_name: string | null;
  version: number;
  published_at: number;
  updated_at: number;
  thumbnail: string | null;
  likes: number;
  downloads: number;
  reports: number;
  cleared_reports: number;
  hidden_by_moderator: number;
  hidden: number;
  author_banned: number;
  /** The remix source is hidden, so it is not named. */
  remix_hidden: number;
  liked: number;
}

/**
 * Hidden: by a moderator, because the author is suspended, or by reports — at least 3 accounts
 * and more than 5% of the downloads (reports a moderator already cleared do not count).
 */
const hiddenSql = (t: string, a: string) => `(${t}.hidden_by_moderator = 1 OR IFNULL(${a}.banned, 0) = 1
  OR ((${t}.reports - ${t}.cleared_reports) >= 3 AND (${t}.reports - ${t}.cleared_reports) > ${t}.downloads * 0.05))`;
const HIDDEN = hiddenSql('t', 'a');

/** Themes with author, remix source, hidden flag and whether the viewer (`?1`) liked them. */
const SELECT = `SELECT t.*, a.display_name AS author_name, r.name AS remix_name, ra.display_name AS remix_author_name,
  ${HIDDEN} AS hidden,
  IFNULL(a.banned, 0) AS author_banned,
  IFNULL(a.official, 0) AS author_official,
  ${hiddenSql('r', 'ra')} AS remix_hidden,
  EXISTS (SELECT 1 FROM likes l WHERE l.theme_id = t.id AND l.account_id = ?1) AS liked
  FROM themes t
  LEFT JOIN accounts a ON a.id = t.author_id
  LEFT JOIN themes r ON r.id = t.remix_of
  LEFT JOIN accounts ra ON ra.id = r.author_id`;

function summary(context: Context, row: ThemeRow): ShareThemeSummary {
  const base = context.env.PUBLIC_URL.replace(/\/+$/, '');
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: JSON.parse(row.tags) as string[],
    autoTags: JSON.parse(row.auto_tags) as string[],
    author:
      row.author_id && row.author_name !== null
        ? { id: row.author_id, name: row.author_name, ...(row.author_official ? { official: true } : {}) }
        : null,
    likes: row.likes,
    downloads: row.downloads,
    version: row.version,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    ...(row.thumbnail ? { thumbnail: `${base}${sharePaths.thumbnail(row.thumbnail)}` } : {}),
    remixOf:
      row.remix_of && row.remix_name !== null && !row.remix_hidden
        ? { id: row.remix_of, name: row.remix_name, authorName: row.remix_author_name }
        : null,
    liked: Boolean(row.liked),
    hidden: Boolean(row.hidden),
  };
}

/** Hidden themes are visible only to their author and to moderators. */
const canSee = (row: ThemeRow, viewer: AccountRow | null) =>
  !row.hidden || (viewer !== null && (viewer.id === row.author_id || viewer.role === 'moderator'));

async function loadTheme(context: Context, id: string, viewer: AccountRow | null): Promise<ThemeRow | null> {
  return context.env.DB.prepare(`${SELECT} WHERE t.id = ?2`)
    .bind(viewer?.id ?? '', id)
    .first<ThemeRow>();
}

async function visibleTheme(context: Context, id: string, viewer: AccountRow | null): Promise<ThemeRow> {
  const row = await loadTheme(context, id, viewer);
  if (!row || !canSee(row, viewer)) throw new ShareError('not-found');
  return row;
}

const SORTS: Record<ShareSort, string> = {
  popular: 't.downloads + t.likes * 3 DESC, t.published_at DESC',
  newest: 't.published_at DESC',
  likes: 't.likes DESC, t.published_at DESC',
};

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

/** `GET /v1/themes` */
export async function listThemes(context: Context): Promise<Response> {
  const viewer = await sessionAccount(context);
  const params = context.url.searchParams;
  const sort = (params.get('sort') ?? 'popular') as ShareSort;
  if (!(sort in SORTS)) throw new ShareError('invalid');
  const page = Number(params.get('page') ?? 0);
  if (!Number.isInteger(page) || page < 0 || page > 1000) throw new ShareError('invalid');
  const where = [`NOT ${HIDDEN}`];
  const binds: unknown[] = [viewer?.id ?? ''];
  const category = params.get('category');
  if (category) {
    if (!isShareCategory(category)) throw new ShareError('invalid');
    where.push(`t.category = ?${binds.push(category)}`);
  }
  const words = (params.get('search') ?? '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  for (const word of words)
    where.push(
      `(t.search || ' ' || lower(IFNULL(a.display_name, ''))) LIKE ?${binds.push(`%${escapeLike(word)}%`)} ESCAPE '\\'`,
    );
  const filter = where.join(' AND ');
  const db = context.env.DB;
  const [rows, count] = await Promise.all([
    db
      .prepare(
        `${SELECT} WHERE ${filter} ORDER BY ${SORTS[sort]} LIMIT ${SHARE_PAGE_SIZE} OFFSET ${page * SHARE_PAGE_SIZE}`,
      )
      .bind(...binds)
      .all<ThemeRow>(),
    db
      .prepare(
        `SELECT COUNT(*) AS total FROM themes t LEFT JOIN accounts a ON a.id = t.author_id WHERE ${filter.replace(/\?(\d+)/g, (_m, n: string) => `?${Number(n) - 1}`)}`,
      )
      .bind(...binds.slice(1))
      .first<{ total: number }>(),
  ]);
  const total = count?.total ?? 0;
  const result: SharePage = {
    items: rows.results.map((row) => summary(context, row)),
    total,
    nextPage: (page + 1) * SHARE_PAGE_SIZE < total ? page + 1 : null,
  };
  return ok(result);
}

/** `GET /v1/codes/:code` */
export async function findByCode(context: Context, input: string): Promise<Response> {
  const code = parseShareCode(input);
  if (!code) throw new ShareError('not-found');
  const viewer = await sessionAccount(context);
  const row = await context.env.DB.prepare(`${SELECT} WHERE t.code = ?2`)
    .bind(viewer?.id ?? '', code)
    .first<ThemeRow>();
  if (!row || !canSee(row, viewer)) throw new ShareError('not-found');
  return ok(summary(context, row));
}

/** `GET /v1/themes/:id` */
export async function getTheme(context: Context, id: string): Promise<Response> {
  const viewer = await sessionAccount(context);
  const row = await visibleTheme(context, id, viewer);
  const object = await context.env.BUCKET.get(themeKey(id));
  if (!object) throw new ShareError('not-found');
  const theme = JSON.parse(new TextDecoder().decode(await object.arrayBuffer())) as ChatTheme;
  const detail: ShareThemeDetail = { ...summary(context, row), theme };
  return ok(detail);
}

/** `POST /v1/versions` */
export async function versions(context: Context): Promise<Response> {
  const { ids } = await readJson<{ ids?: unknown }>(context.request, 64 * 1024);
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every((id) => typeof id === 'string'))
    throw new ShareError('invalid');
  const result: Record<string, number> = {};
  // D1 takes at most 100 bound values per statement.
  for (let start = 0; start < ids.length; start += 90) {
    const chunk = ids.slice(start, start + 90) as string[];
    const { results } = await context.env.DB.prepare(
      `SELECT t.id, t.version FROM themes t LEFT JOIN accounts a ON a.id = t.author_id
       WHERE t.id IN (${chunk.map(() => '?').join(',')}) AND NOT ${HIDDEN}`,
    )
      .bind(...chunk)
      .all<{ id: string; version: number }>();
    for (const row of results) result[row.id] = row.version;
  }
  return ok(result);
}

// ---------- files ----------

const IMMUTABLE = 'public, max-age=31536000, immutable';

async function serveFile(context: Context, key: string, contentType: string): Promise<Response> {
  const object = await context.env.BUCKET.get(key);
  if (!object) throw new ShareError('not-found');
  return new Response(await object.arrayBuffer(), {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? contentType,
      'Cache-Control': IMMUTABLE,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}

const ASSET_CONTENT_TYPES = { png: 'image/png', webp: 'image/webp', gif: 'image/gif' } as const;
const contentTypeOf = (file: string) =>
  ASSET_CONTENT_TYPES[file.slice(file.lastIndexOf('.') + 1) as keyof typeof ASSET_CONTENT_TYPES] ??
  'application/octet-stream';

/** `GET /v1/assets/:file` */
export function getAsset(context: Context, file: string): Promise<Response> {
  if (!/^[0-9a-f]{64}\.(png|webp|gif)$/.test(file)) throw new ShareError('not-found');
  return serveFile(context, assetKey(file), contentTypeOf(file));
}

/** `PUT /v1/assets/:file`: a frame image, named after the SHA-256 of its bytes. */
export async function uploadAsset(context: Context, file: string): Promise<Response> {
  const account = await requireAccount(context);
  await rateLimit(context, 'upload', account.id);
  const bytes = await readBytes(context.request, SHARE_LIMITS.imageBytes);
  if (!(await isAssetFile(file, bytes))) throw new ShareError('invalid');
  // Written even when it exists: the upload time is what keeps the daily cleanup from removing an
  // image a publish is about to use (same name, same bytes).
  await context.env.BUCKET.put(assetKey(file), bytes, { httpMetadata: { contentType: contentTypeOf(file) } });
  return ok(undefined);
}

/** `GET /v1/thumbnails/:file` */
export function getThumbnail(context: Context, file: string): Promise<Response> {
  if (!/^[A-Za-z0-9_-]+-\d+\.png$/.test(file)) throw new ShareError('not-found');
  return serveFile(context, thumbnailKey(file), 'image/png');
}

// ---------- counts ----------

/** `POST /v1/themes/:id/downloads`: once per anonymous client, theme and day. */
export async function recordDownload(context: Context, id: string): Promise<Response> {
  await rateLimit(context, 'download', clientAddress(context));
  const { clientId } = await readJson<{ clientId?: unknown }>(context.request, 1024);
  if (typeof clientId !== 'string' || !clientId || clientId.length > 100) throw new ShareError('invalid');
  await visibleTheme(context, id, null);
  const db = context.env.DB;
  // One transaction: the count goes up only when the mark was new (`changes()` of the insert).
  await db.batch([
    db
      .prepare('INSERT OR IGNORE INTO download_marks (theme_id, client_hash, day) VALUES (?, ?, ?)')
      .bind(id, await hashOf(clientId, context.env.HASH_SALT), dayOf(context.now)),
    db.prepare('UPDATE themes SET downloads = downloads + changes() WHERE id = ?').bind(id),
  ]);
  return ok(undefined);
}

/** `PUT` / `DELETE /v1/themes/:id/like` */
export async function setLiked(context: Context, id: string, liked: boolean): Promise<Response> {
  const account = await requireAccount(context);
  await rateLimit(context, 'write', account.id);
  await visibleTheme(context, id, account);
  const db = context.env.DB;
  await db.batch([
    liked
      ? db.prepare('INSERT OR IGNORE INTO likes (theme_id, account_id) VALUES (?, ?)').bind(id, account.id)
      : db.prepare('DELETE FROM likes WHERE theme_id = ? AND account_id = ?').bind(id, account.id),
    db.prepare('UPDATE themes SET likes = (SELECT COUNT(*) FROM likes WHERE theme_id = ?1) WHERE id = ?1').bind(id),
  ]);
  return ok(summary(context, (await loadTheme(context, id, account))!));
}

/** `POST /v1/themes/:id/reports`: one report per account and theme. */
export async function report(context: Context, id: string): Promise<Response> {
  const account = await requireAccount(context);
  await rateLimit(context, 'write', account.id);
  const { reason, note } = await readJson<{ reason?: unknown; note?: unknown }>(context.request, 8 * 1024);
  if (!(SHARE_REPORT_REASONS as readonly unknown[]).includes(reason)) throw new ShareError('invalid');
  const exists = await context.env.DB.prepare('SELECT 1 FROM themes WHERE id = ?').bind(id).first();
  if (!exists) throw new ShareError('not-found');
  const db = context.env.DB;
  await db.batch([
    db
      .prepare('INSERT OR IGNORE INTO reports (theme_id, account_id, reason, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(
        id,
        account.id,
        reason as ShareReportReason,
        typeof note === 'string' ? note.trim().slice(0, 500) : '',
        context.now,
      ),
    db.prepare('UPDATE themes SET reports = (SELECT COUNT(*) FROM reports WHERE theme_id = ?1) WHERE id = ?1').bind(id),
  ]);
  return ok(undefined);
}

// ---------- publishing ----------

/** `GET /v1/account/themes` */
export async function mine(context: Context): Promise<Response> {
  const account = await requireAccount(context);
  const { results } = await context.env.DB.prepare(`${SELECT} WHERE t.author_id = ?2 ORDER BY t.updated_at DESC`)
    .bind(account.id, account.id)
    .all<ThemeRow>();
  return ok(results.map((row) => summary(context, row)));
}

interface Prepared {
  theme: ChatTheme;
  name: string;
  description: string;
  category: ShareThemeSummary['category'];
  tags: string[];
  autoTags: string[];
  files: string[];
  thumbnail: Uint8Array | null;
  /** The shared theme this one was installed from, when that was someone else's. */
  remixOf: string | null;
}

/** Reads and checks a publish or update; throws `invalid` with the issues found. */
async function preparePublish(context: Context, account: AccountRow, updatingId?: string): Promise<Prepared> {
  const input = await readJson<Partial<PublishInput>>(context.request, SHARE_MAX_BODY_BYTES);
  if (
    typeof input.name !== 'string' ||
    typeof input.description !== 'string' ||
    typeof input.category !== 'string' ||
    !Array.isArray(input.tags) ||
    !input.tags.every((tag) => typeof tag === 'string') ||
    !input.theme ||
    typeof input.theme !== 'object'
  )
    throw new ShareError('invalid');
  const raw = input.theme;
  if (typeof raw.schemaVersion === 'number' && raw.schemaVersion > THEME_SCHEMA_VERSION)
    throw new ShareError('app-outdated');
  let theme: ChatTheme;
  try {
    theme = normalizeTheme(raw);
  } catch {
    throw new ShareError('invalid');
  }
  const tags = [...new Set(input.tags.map(normalizeTag).filter(Boolean))];

  // Images were uploaded first (`PUT /v1/assets/:file`); data URLs inside the theme are refused.
  const issues: ShareIssue[] = [];
  const sizes = new Map<string, number>();
  const files: string[] = [];
  for (const src of themeImageSources(theme)) {
    const file = assetFileOf(src);
    if (!file) {
      if (!issues.some((issue) => issue.code === 'image-inline')) issues.push({ code: 'image-inline' });
      continue;
    }
    const head = await context.env.BUCKET.head(assetKey(file));
    if (!head) issues.push({ code: 'image-missing', file });
    else sizes.set(src, head.size);
    files.push(file);
  }

  const origin = raw.origin?.shareId
    ? await context.env.DB.prepare('SELECT id, author_id FROM themes WHERE id = ?')
        .bind(raw.origin.shareId)
        .first<{ id: string; author_id: string | null }>()
    : null;
  const fromOther = origin !== null && origin.author_id !== account.id;
  const unchangedCopy = fromOther && themeContentHash(raw as ChatTheme) === raw.origin?.contentHash;

  issues.push(
    ...checkPublish(
      theme,
      { name: input.name, description: input.description, category: input.category as PublishMeta['category'], tags },
      {
        assetBytes: (src) => sizes.get(src) ?? 0,
        unchangedCopy,
      },
    ),
  );
  if (issues.length) throw new ShareError('invalid', issues);

  let thumbnail: Uint8Array | null = null;
  if (input.thumbnail) {
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(input.thumbnail);
    if (!match || dataUrlBytes(input.thumbnail) > SHARE_MAX_THUMBNAIL_BYTES) throw new ShareError('invalid');
    thumbnail = Uint8Array.from(atob(match[1]!), (char) => char.charCodeAt(0));
    if (sniffImage(thumbnail) !== 'png') throw new ShareError('invalid');
  }

  return {
    theme,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category as Prepared['category'],
    tags,
    autoTags: autoTags(theme),
    files: [...new Set(files)],
    thumbnail,
    remixOf: fromOther && origin.id !== updatingId ? origin.id : null,
  };
}

/** Takes one of today's publishes; `rate-limited` when none are left. Moderators have no daily limit. */
async function usePublish(context: Context, account: AccountRow): Promise<void> {
  if (!hasDailyPublishLimit(account.role)) return;
  const today = dayOf(context.now);
  const used = await context.env.DB.prepare(
    `UPDATE accounts SET publish_count = CASE WHEN publish_day = ?1 THEN publish_count + 1 ELSE 1 END, publish_day = ?1
     WHERE id = ?2 AND (publish_day != ?1 OR publish_count < ?3)`,
  )
    .bind(today, account.id, SHARE_LIMITS.dailyPublishes)
    .run();
  if (!used.meta.changes) throw new ShareError('rate-limited');
}

const searchText = (prepared: Prepared) =>
  [prepared.name, prepared.description, ...prepared.tags, ...prepared.autoTags].join(' ').toLowerCase();

/** The theme as stored: no local id, origin or built-in flag. */
function storedTheme(theme: ChatTheme, id: string): ChatTheme {
  const { origin: _origin, builtIn: _builtIn, ...rest } = theme;
  return { ...rest, id };
}

async function storeFiles(context: Context, id: string, version: number, prepared: Prepared): Promise<string | null> {
  await context.env.BUCKET.put(themeKey(id), JSON.stringify(storedTheme(prepared.theme, id)), {
    httpMetadata: { contentType: 'application/json' },
  });
  if (!prepared.thumbnail) return null;
  const file = `${id}-${version}.png`;
  await context.env.BUCKET.put(thumbnailKey(file), prepared.thumbnail, { httpMetadata: { contentType: 'image/png' } });
  return file;
}

const assetStatements = (context: Context, id: string, files: string[]) => [
  context.env.DB.prepare('DELETE FROM theme_assets WHERE theme_id = ?').bind(id),
  ...files.map((file) =>
    context.env.DB.prepare('INSERT INTO theme_assets (theme_id, file) VALUES (?, ?)').bind(id, file),
  ),
];

/** `POST /v1/themes` */
export async function publish(context: Context): Promise<Response> {
  const account = await requireAccount(context);
  const prepared = await preparePublish(context, account);
  await usePublish(context, account);
  const db = context.env.DB;
  const id = newId('thm', context.random);
  const thumbnail = await storeFiles(context, id, 1, prepared);
  for (let attempt = 0; ; attempt++) {
    const code = createShareCode(() => context.random(1)[0]! / 256);
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO themes (id, code, name, description, category, tags, auto_tags, search, author_id, remix_of,
               version, schema_version, published_at, updated_at, thumbnail)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            code,
            prepared.name,
            prepared.description,
            prepared.category,
            JSON.stringify(prepared.tags),
            JSON.stringify(prepared.autoTags),
            searchText(prepared),
            account.id,
            prepared.remixOf,
            prepared.theme.schemaVersion,
            context.now,
            context.now,
            thumbnail,
          ),
        ...assetStatements(context, id, prepared.files),
      ]);
      break;
    } catch (error) {
      // A code already taken; with 32^8 codes this is rare.
      if (attempt >= 4 || !String(error).includes('UNIQUE')) throw error;
    }
  }
  return ok(summary(context, (await loadTheme(context, id, account))!));
}

/** `PUT /v1/themes/:id`: a new version of one of the account's themes. */
export async function update(context: Context, id: string): Promise<Response> {
  const account = await requireAccount(context);
  const current = await loadTheme(context, id, account);
  if (!current) throw new ShareError('not-found');
  if (current.author_id !== account.id) throw new ShareError('forbidden');
  const prepared = await preparePublish(context, account, id);
  await usePublish(context, account);
  const version = current.version + 1;
  const thumbnail = (await storeFiles(context, id, version, prepared)) ?? current.thumbnail;
  const db = context.env.DB;
  await db.batch([
    db
      .prepare(
        `UPDATE themes SET name = ?, description = ?, category = ?, tags = ?, auto_tags = ?, search = ?, version = ?,
           schema_version = ?, updated_at = ?, thumbnail = ? WHERE id = ?`,
      )
      .bind(
        prepared.name,
        prepared.description,
        prepared.category,
        JSON.stringify(prepared.tags),
        JSON.stringify(prepared.autoTags),
        searchText(prepared),
        version,
        prepared.theme.schemaVersion,
        context.now,
        thumbnail,
        id,
      ),
    ...assetStatements(context, id, prepared.files),
  ]);
  if (current.thumbnail && current.thumbnail !== thumbnail)
    await context.env.BUCKET.delete(thumbnailKey(current.thumbnail));
  return ok(summary(context, (await loadTheme(context, id, account))!));
}

/** Removes a theme and its files; frame images go with the next cleanup if nothing else uses them. */
export async function removeTheme(context: Context, row: Pick<ThemeRow, 'id' | 'thumbnail'>): Promise<void> {
  const db = context.env.DB;
  await db.batch([
    db.prepare('DELETE FROM theme_assets WHERE theme_id = ?').bind(row.id),
    db.prepare('DELETE FROM likes WHERE theme_id = ?').bind(row.id),
    db.prepare('DELETE FROM reports WHERE theme_id = ?').bind(row.id),
    db.prepare('DELETE FROM download_marks WHERE theme_id = ?').bind(row.id),
    db.prepare('UPDATE themes SET remix_of = NULL WHERE remix_of = ?').bind(row.id),
    db.prepare('DELETE FROM themes WHERE id = ?').bind(row.id),
  ]);
  await context.env.BUCKET.delete([themeKey(row.id), ...(row.thumbnail ? [thumbnailKey(row.thumbnail)] : [])]);
}

/** `DELETE /v1/themes/:id`: by its author or a moderator. */
export async function unpublish(context: Context, id: string): Promise<Response> {
  const account = await requireAccount(context);
  const row = await loadTheme(context, id, account);
  if (!row) throw new ShareError('not-found');
  if (row.author_id !== account.id && account.role !== 'moderator') throw new ShareError('forbidden');
  await removeTheme(context, row);
  return ok(undefined);
}

export { summary as themeSummary, SELECT as THEME_SELECT, type ThemeRow };
