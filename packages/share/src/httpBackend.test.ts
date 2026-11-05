import { describe, expect, it, vi } from 'vitest';
import { createHttpShareBackend } from './httpBackend';
import { SHARE_FALLBACK_URL } from './protocol';

const page = { ok: true, value: { items: [], total: 0, nextPage: null } };

describe('createHttpShareBackend', () => {
  it('sends the token and reads ShareResult bodies', async () => {
    const fetch = vi.fn(async () => Response.json({ ok: false, error: 'unauthorized' }, { status: 401 }));
    const backend = createHttpShareBackend({ baseUrl: 'https://a.test/', fetch, client: 'chatto/1.0.0' });
    expect(await backend.account('tok')).toEqual({ ok: false, error: 'unauthorized' });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://a.test/v1/account');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok', 'X-Chatto-Client': 'chatto/1.0.0' });
  });

  it('turns outages and non-JSON answers into errors', async () => {
    const backend = createHttpShareBackend({
      fallbackUrl: null,
      fetch: async () => new Response('<html>Bad gateway</html>', { status: 502 }),
    });
    expect(await backend.list({ sort: 'popular' })).toEqual({ ok: false, error: 'network' });
    const offline = createHttpShareBackend({
      fallbackUrl: null,
      fetch: async () => {
        throw new TypeError('fetch failed');
      },
    });
    expect(await offline.get('x')).toEqual({ ok: false, error: 'network' });
  });

  it('ignores a fallback that points outside chattolive.com', async () => {
    const fetch = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === SHARE_FALLBACK_URL) return Response.json({ apiUrl: 'https://evil.test' });
      throw new TypeError('fetch failed');
    });
    const backend = createHttpShareBackend({ fetch });
    expect(await backend.account('tok')).toEqual({ ok: false, error: 'network' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('follows share.json once when the service cannot be reached', async () => {
    const fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === SHARE_FALLBACK_URL) return Response.json({ apiUrl: 'https://api2.chattolive.com' });
      if (url.startsWith('https://api2.chattolive.com/')) return Response.json(page);
      throw new TypeError('fetch failed');
    });
    const backend = createHttpShareBackend({ fetch });
    expect(await backend.list({ sort: 'newest', category: 'cute', search: ' tea ' })).toEqual(page);
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      'https://api.chattolive.com/v1/themes?sort=newest&category=cute&search=tea',
      SHARE_FALLBACK_URL,
      'https://api2.chattolive.com/v1/themes?sort=newest&category=cute&search=tea',
    ]);
    expect(backend.assetUrl(`${'a'.repeat(64)}.png`)).toBe(
      `https://api2.chattolive.com/v1/assets/${'a'.repeat(64)}.png`,
    );
  });
});
