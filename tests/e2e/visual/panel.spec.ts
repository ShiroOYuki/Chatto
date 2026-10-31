import type { Page } from '@playwright/test';
import { chatMessage, expect, test } from '../fixtures';

/** Live chat previews and rate charts change with timing; theme looks are covered by themes.spec.ts. */
const livePreviews = (page: Page) => [
  page.locator('.chatto-root'),
  page.locator('[aria-hidden="true"].flex.items-end'),
];

const pages = ['overview', 'chat', 'themes', 'outputs', 'connections', 'settings'] as const;

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    for (const id of pages) {
      test(`page ${id}`, async ({ panel, page }) => {
        await panel.open(`page=${id}`);
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
