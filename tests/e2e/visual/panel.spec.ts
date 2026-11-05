import type { Page } from '@playwright/test';
import { chatMessage, expect, test } from '../fixtures';

/** Live chat previews and rate charts change with timing; theme looks are covered by themes.spec.ts. */
const livePreviews = (page: Page) => [
  page.locator('.chatto-root'),
  page.locator('[aria-hidden="true"].flex.items-end'),
];

const pages = ['overview', 'chat', 'themes', 'explore', 'outputs', 'alerts', 'accounts', 'settings'] as const;

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    for (const id of pages) {
      test(`page ${id}`, async ({ panel, page }) => {
        await panel.open(`page=${id}`);
        // Shared theme cards render their theme once it loads; wait for every card.
        if (id === 'explore') {
          await expect(page.locator('main article').first()).toBeVisible();
          await expect(page.locator('main article .animate-pulse')).toHaveCount(0);
        }
        if (id === 'chat') await panel.emit(chatMessage('歡迎來到茶室'), chatMessage('こんばんは～'));
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`${id}-${scheme}.png`, { mask: livePreviews(page) });
      });
    }

    test('compact dashboard', async ({ panel, page }) => {
      await panel.open('compact');
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`compact-${scheme}.png`, { mask: livePreviews(page) });
    });
  });
}

// The interface in English: the pages with the most text, light mode only.
test.describe('English', () => {
  test.use({ colorScheme: 'light' });
  for (const id of ['overview', 'alerts', 'settings'] as const) {
    test(`page ${id} in English`, async ({ panel, page }) => {
      await panel.open(`page=${id}&lang=en`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${id}-en.png`, { mask: livePreviews(page) });
    });
  }
});
