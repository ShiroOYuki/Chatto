import { SHARE_LOOPBACK_PATH } from '@chatto/share';
import { describe, expect, it } from 'vitest';
import { openSignInLoopback } from './share-loopback';

describe('openSignInLoopback', () => {
  it('hands over the first visit to the sign-in page and shows the browser a page', async () => {
    const loopback = await openSignInLoopback();
    try {
      expect(loopback.port).toBeGreaterThan(1023);
      const base = `http://127.0.0.1:${loopback.port}`;
      expect((await fetch(`${base}/other`)).status).toBe(404);
      const page = await fetch(`${base}${SHARE_LOOPBACK_PATH}?code=abc`);
      expect(page.headers.get('content-type')).toContain('text/html');
      expect(await page.text()).toContain('Signed in');
      expect((await loopback.result).get('code')).toBe('abc');
      const failed = await fetch(`${base}${SHARE_LOOPBACK_PATH}?error=banned`);
      expect(await failed.text()).toContain('didn’t finish');
    } finally {
      loopback.close();
    }
  });
});
