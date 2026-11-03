import { PRESET_THEMES } from '@chatto/chat-ui';
import { blockExternal, expect, FIXED_TIME, test, VIEWER_URL } from '../fixtures';

test.use({ viewport: { width: 460, height: 1400 } });

test.beforeEach(async ({ page }) => {
  await blockExternal(page);
  await page.clock.setFixedTime(FIXED_TIME);
});

for (const theme of PRESET_THEMES) {
  test(`theme ${theme.id}`, async ({ page }) => {
    // `backdrop` paints a checkerboard behind the transparent page, like the editor preview.
    await page.goto(`${VIEWER_URL}/embed?specimen&backdrop&theme=${theme.id}&lang=zh-TW`);
    await expect(page.locator(`.chatto-root[data-theme-id="${theme.id}"]`)).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${theme.id}.png`, { fullPage: true });
  });
}

// Event texts in English (the chat language), on one theme.
test('theme matcha-glass with English event texts', async ({ page }) => {
  await page.goto(`${VIEWER_URL}/embed?specimen&backdrop&theme=matcha-glass&lang=en`);
  await expect(page.locator('.chatto-root[data-theme-id="matcha-glass"]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('matcha-glass-en.png', { fullPage: true });
});
