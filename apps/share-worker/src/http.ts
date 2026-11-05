import {
  SHARE_ERROR_STATUS,
  shareFail,
  shareOk,
  type ShareErrorCode,
  type ShareIssue,
  type ShareResult,
} from '@chatto/share';

/** Response headers every API answer carries. The API is only called by the app, never from pages. */
const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
} as const;

export function json<T>(result: ShareResult<T>, init: { cache?: number } = {}): Response {
  const status = result.ok ? 200 : SHARE_ERROR_STATUS[result.error];
  const headers: Record<string, string> = { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8' };
  if (result.ok && init.cache) headers['Cache-Control'] = `public, max-age=${init.cache}`;
  return new Response(JSON.stringify(result), { status, headers });
}

export const ok = <T>(value: T) => json(shareOk(value));
export const fail = (error: ShareErrorCode, issues?: ShareIssue[]) => json(shareFail(error, issues));

/** Thrown inside handlers to answer with an error. */
export class ShareError extends Error {
  constructor(
    readonly code: ShareErrorCode,
    readonly issues?: ShareIssue[],
  ) {
    super(code);
  }
}

/** Reads a JSON body up to `limit` bytes; anything else is `invalid`. */
export async function readJson<T>(request: Request, limit: number): Promise<T> {
  const bytes = await readBytes(request, limit);
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    throw new ShareError('invalid');
  }
}

/** Reads the body up to `limit` bytes, without trusting Content-Length. */
export async function readBytes(request: Request, limit: number): Promise<Uint8Array> {
  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > limit) throw new ShareError('invalid');
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new ShareError('invalid');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

type Handler<C> = (context: C, params: Record<string, string>) => Promise<Response>;

interface Route<C> {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler<C>;
}

/** A small method + path router; `:name` segments become params. */
export class Router<C> {
  readonly #routes: Route<C>[] = [];

  on(method: string, path: string, handler: Handler<C>): this {
    const keys: string[] = [];
    const source = path.replace(/:([a-zA-Z]+)/g, (_match, key: string) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.#routes.push({ method, pattern: new RegExp(`^${source}$`), keys, handler });
    return this;
  }

  /** The handler for a request, or the error to answer with (404 or 405). */
  match(method: string, path: string): { handler: Handler<C>; params: Record<string, string> } | ShareErrorCode {
    let pathMatched = false;
    for (const route of this.#routes) {
      const found = route.pattern.exec(path);
      if (!found) continue;
      pathMatched = true;
      if (route.method !== method) continue;
      const params: Record<string, string> = {};
      try {
        route.keys.forEach((key, index) => {
          params[key] = decodeURIComponent(found[index + 1]!);
        });
      } catch {
        return 'not-found'; // a malformed %-escape
      }
      return { handler: route.handler, params };
    }
    return pathMatched ? 'invalid' : 'not-found';
  }
}
