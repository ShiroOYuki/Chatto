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

    // Folders, the unfiled section and the trash (#41, #42), scrolled to the custom themes.
    test('themes page with folders', async ({ panel, page }) => {
      await panel.open('page=themes&library');
      await page.getByRole('region', { name: 'Games', exact: true }).scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`themes-folders-${scheme}.png`, { mask: livePreviews(page) });
    });

    test('theme trash', async ({ panel, page }) => {
      await panel.open('page=themes&library');
      await page.getByRole('button', { name: '垃圾桶' }).click();
      await expect(page.getByRole('dialog', { name: '垃圾桶' }).getByRole('listitem')).toHaveCount(2);
      await page.evaluate(() => document.fonts.ready);
      // Deletion dates and days left follow the real clock.
      const dialog = page.getByRole('dialog');
      await expect(dialog).toHaveScreenshot(`theme-trash-${scheme}.png`, { mask: [dialog.locator('li p.text-xs')] });
    });

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
