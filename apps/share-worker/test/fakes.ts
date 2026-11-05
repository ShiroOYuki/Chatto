/**
 * Stand-ins for D1 (on Node's built-in SQLite) and R2 (in memory), so the Worker's tests run in
 * the regular Vitest run without the Workers runtime.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { Bucket, BucketObjectBody, Db, DbResult, DbStatement, Env } from '../src/env';

const MIGRATIONS = join(import.meta.dirname, '..', 'migrations');

const toSql = (value: unknown): SQLInputValue => {
  if (value === undefined) throw new Error('D1 does not take undefined');
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value as SQLInputValue;
};

class Statement implements DbStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): DbStatement {
    return new Statement(this.db, this.sql, values);
  }

  #params() {
    return this.values.map(toSql);
  }

  async first<T>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.#params());
    return (row ? { ...row } : null) as T | null;
  }

  async all<T>(): Promise<DbResult<T>> {
    const rows = this.db.prepare(this.sql).all(...this.#params());
    return { results: rows.map((row) => ({ ...row })) as T[], meta: { changes: 0 } };
  }

  async run(): Promise<DbResult<unknown>> {
    const statement = this.db.prepare(this.sql);
    // RETURNING statements give rows; D1's run() still reports them.
    if (/\bRETURNING\b/i.test(this.sql)) {
      const rows = statement.all(...this.#params());
      return { results: rows, meta: { changes: rows.length } };
    }
    const result = statement.run(...this.#params());
    return { results: [], meta: { changes: Number(result.changes) } };
  }

  runSync(): DbResult<unknown> {
    const result = this.db.prepare(this.sql).run(...this.#params());
    return { results: [], meta: { changes: Number(result.changes) } };
  }
}

export function createTestDb(): Db & { sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync(MIGRATIONS).sort()) sqlite.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  return {
    sqlite,
    prepare: (sql) => new Statement(sqlite, sql),
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map((statement) => (statement as Statement).runSync());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

export function createTestBucket(
  now: () => number = Date.now,
): Bucket & { objects: Map<string, BucketObjectBody & { bytes: Uint8Array }> } {
  const objects = new Map<string, BucketObjectBody & { bytes: Uint8Array }>();
  const meta = ({ key, size, uploaded }: BucketObjectBody) => ({ key, size, uploaded });
  return {
    objects,
    async get(key) {
      return objects.get(key) ?? null;
    },
    async head(key) {
      const object = objects.get(key);
      return object ? meta(object) : null;
    },
    async put(key, value, options) {
      const bytes =
        typeof value === 'string'
          ? new TextEncoder().encode(value)
          : new Uint8Array(value instanceof Uint8Array ? value : new Uint8Array(value));
      const copy = bytes.slice();
      objects.set(key, {
        key,
        size: copy.byteLength,
        uploaded: new Date(now()),
        bytes: copy,
        httpMetadata: options?.httpMetadata,
        arrayBuffer: async () => copy.slice().buffer,
      });
    },
    async delete(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) objects.delete(key);
    },
    async list({ prefix = '', limit = 1000, cursor }) {
      const keys = [...objects.keys()].filter((key) => key.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const page = keys.slice(start, start + limit);
      const truncated = start + limit < keys.length;
      return {
        objects: page.map((key) => meta(objects.get(key)!)),
        truncated,
        ...(truncated ? { cursor: String(start + limit) } : {}),
      };
    },
  };
}

export function createTestEnv(now: () => number = Date.now): Env & {
  DB: ReturnType<typeof createTestDb>;
  BUCKET: ReturnType<typeof createTestBucket>;
} {
  return {
    DB: createTestDb(),
    BUCKET: createTestBucket(now),
    PUBLIC_URL: 'https://share.test',
    HASH_SALT: 'salt',
    TWITCH_CLIENT_ID: 'twitch-id',
    TWITCH_CLIENT_SECRET: 'twitch-secret',
    GOOGLE_CLIENT_ID: 'google-id',
    GOOGLE_CLIENT_SECRET: 'google-secret',
    DISCORD_CLIENT_ID: 'discord-id',
    DISCORD_CLIENT_SECRET: 'discord-secret',
  };
}
