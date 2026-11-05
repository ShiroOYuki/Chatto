import type { ShareBackend } from '@chatto/share';
import { createFakeShareBackend } from '@chatto/share/fake';
import { createHttpShareBackend } from '@chatto/share/http';

/** The sharing service set at build time (`MAIN_VITE_SHARE_API_URL` in apps/desktop/.env), or empty. */
export const SHARE_API_OVERRIDE = (import.meta.env.MAIN_VITE_SHARE_API_URL ?? '').trim();

/**
 * The sharing service the app talks to. Until the Worker is online, builds use an in-memory fake
 * with sample themes unless `MAIN_VITE_SHARE_API_URL` names a service: `https://api.chattolive.com`,
 * or `http://localhost:8787` for `wrangler dev` (`apps/share-worker`).
 */
export function createShareBackend(options: { version: string; isDev: boolean }): ShareBackend {
  if (!SHARE_API_OVERRIDE) return createFakeShareBackend({ moderator: options.isDev });
  return createHttpShareBackend({
    baseUrl: SHARE_API_OVERRIDE,
    // A local service has no fallback; the real one may move (`share.json` on GitHub).
    fallbackUrl: /^http:\/\/(localhost|127\.0\.0\.1)\b/.test(SHARE_API_OVERRIDE) ? null : undefined,
    client: `chatto/${options.version}`,
  });
}

/** Pages the sign-in may open in the browser: https, and a local service during development. */
export const canOpenSignInPage = (url: string, isDev: boolean) =>
  /^https:\/\//.test(url) || (isDev && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url));
