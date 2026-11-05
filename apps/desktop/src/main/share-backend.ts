import { SHARE_API_URL, type ShareBackend } from '@chatto/share';
import { createFakeShareBackend } from '@chatto/share/fake';
import { createHttpShareBackend } from '@chatto/share/http';

/** Which sharing service to use: the in-memory fake, or a service over HTTP. */
export type ShareService = { kind: 'fake' } | { kind: 'http'; url: string };

/**
 * Picks the sharing service. An override is `fake` or a URL: `CHATTO_SHARE_API` at run time
 * (tests), then `MAIN_VITE_SHARE_API_URL` at build time (apps/desktop/.env; `http://localhost:8787`
 * for `wrangler dev`). Without one, packaged builds use the real service and development builds
 * the fake, so trying things out does not write to the real service.
 */
export function pickShareService(options: { runtime?: string; build?: string; isDev: boolean }): ShareService {
  const override = (options.runtime || options.build || '').trim();
  if (override === 'fake') return { kind: 'fake' };
  if (/^https?:\/\//.test(override)) return { kind: 'http', url: override };
  return options.isDev ? { kind: 'fake' } : { kind: 'http', url: SHARE_API_URL };
}

const isLocal = (url: string) => /^http:\/\/(localhost|127\.0\.0\.1)\b/.test(url);

export function createShareBackend(options: { version: string; isDev: boolean }): ShareBackend {
  const service = pickShareService({
    runtime: process.env.CHATTO_SHARE_API,
    build: import.meta.env.MAIN_VITE_SHARE_API_URL,
    isDev: options.isDev,
  });
  // Development builds sign in to the fake as a moderator, so the moderation tools can be tried.
  if (service.kind === 'fake') return createFakeShareBackend({ moderator: options.isDev });
  return createHttpShareBackend({
    baseUrl: service.url,
    // A local service has no fallback; the real one may move (`share.json` on GitHub).
    fallbackUrl: isLocal(service.url) ? null : undefined,
    client: `chatto/${options.version}`,
  });
}

/** Pages the sign-in may open in the browser: https, and a local service during development. */
export const canOpenSignInPage = (url: string, isDev: boolean) =>
  /^https:\/\//.test(url) || (isDev && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url));
