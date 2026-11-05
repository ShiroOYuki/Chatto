/**
 * Chatto's theme sharing service (GitHub #4): a Cloudflare Worker with D1 and R2.
 * The API is described in `@chatto/share`'s `protocol.ts`; see `docs/architecture.md`.
 */
import { handle } from './app';
import { cleanup } from './cleanup';
import type { Env } from './env';

/** Anonymous reads that may be answered from the edge cache for a short while. */
const CACHEABLE = /^\/v1\/(themes|codes\/[^/]+)$/;
const CACHE_SECONDS = 60;

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

/** `caches.default` exists only in the Workers runtime. */
const edgeCache = () => (globalThis as { caches?: { default?: Cache } }).caches?.default;

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cache = edgeCache();
    const cacheable =
      cache && request.method === 'GET' && !request.headers.has('Authorization') && CACHEABLE.test(url.pathname);
    if (cacheable) {
      const hit = await cache.match(request);
      if (hit) return hit;
    }
    const response = await handle(request, env);
    if (cacheable && response.status === 200) {
      const copy = new Response(response.clone().body, response);
      copy.headers.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
      context.waitUntil(cache.put(request, copy));
    }
    return response;
  },

  async scheduled(controller: ScheduledController, env: Env, context: ExecutionContext): Promise<void> {
    // The daily run also looks for unused images; the frequent one only clears short-lived rows.
    const daily = controller.cron === DAILY_CRON;
    context.waitUntil(cleanup(env, controller.scheduledTime, { assets: daily }));
  },
};

/** Must match `[triggers] crons` in wrangler.toml. */
const DAILY_CRON = '17 3 * * *';
