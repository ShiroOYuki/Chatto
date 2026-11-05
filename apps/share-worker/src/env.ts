/**
 * What the Worker is given by Cloudflare. The storage types are the parts of D1 and R2 the
 * Worker uses, so tests can stand in for them (`test/fakes.ts`) without the Workers runtime.
 */

export interface DbResult<T> {
  results: T[];
  meta: { changes: number };
}

export interface DbStatement {
  bind(...values: unknown[]): DbStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<DbResult<T>>;
  run(): Promise<DbResult<unknown>>;
}

/** A D1 database. */
export interface Db {
  prepare(sql: string): DbStatement;
  /** Runs the statements in one transaction. */
  batch(statements: DbStatement[]): Promise<DbResult<unknown>[]>;
}

export interface BucketObject {
  key: string;
  size: number;
  uploaded: Date;
}

export interface BucketObjectBody extends BucketObject {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
}

/** An R2 bucket. */
export interface Bucket {
  get(key: string): Promise<BucketObjectBody | null>;
  head(key: string): Promise<BucketObject | null>;
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  delete(keys: string | string[]): Promise<void>;
  list(options: { prefix?: string; cursor?: string; limit?: number }): Promise<{
    objects: BucketObject[];
    truncated: boolean;
    cursor?: string;
  }>;
}

export interface Env {
  DB: Db;
  BUCKET: Bucket;
  /** The service's own URL, e.g. `https://api.chattolive.com`: OAuth redirects and thumbnail links. */
  PUBLIC_URL: string;
  /** Mixed into hashes of addresses and client ids (a secret), so they cannot be looked up. */
  HASH_SALT?: string;
  TWITCH_CLIENT_ID?: string;
  TWITCH_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
}

/** What a request handler gets besides its parameters. */
export interface Context {
  env: Env;
  request: Request;
  url: URL;
  now: number;
  /** `fetch` for calls to the sign-in platforms; tests replace it. */
  fetch: typeof fetch;
  /** Random bytes; tests may make them predictable. */
  random: (length: number) => Uint8Array;
}

export const DAY = 24 * 60 * 60 * 1000;
export const dayOf = (time: number) => Math.floor(time / DAY);
