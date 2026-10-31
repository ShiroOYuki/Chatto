import { PRESET_THEMES } from '@chatto/chat-ui';
import { blockExternal, expect, test, VIEWER_URL } from '../fixtures';

test.beforeEach(async ({ page }) => blockExternal(page));

test('the mock overlay streams chat', async ({ page }) => {
  await page.goto(`${VIEWER_URL}/overlay?mock=1`);
  await expect(page.locator('.chatto-message').first()).toBeVisible();
  const count = await page.locator('.chatto-message').count();
  await expect
    .poll(() => page.locator('.chatto-message, .chatto-notice').count(), { timeout: 10_000 })
    .toBeGreaterThan(count);
});

for (const theme of PRESET_THEMES) {
  test(`embed renders the ${theme.id} preset`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${VIEWER_URL}/embed?specimen&theme=${theme.id}`);
    await expect(page.locator(`.chatto-root[data-theme-id="${theme.id}"]`)).toBeVisible();
    await expect(page.locator('.chatto-notice').first()).toBeAttached();
    expect(errors).toEqual([]);
  });
}

test('the viewer page keeps a transparent background for OBS', async ({ page }) => {
  await page.goto(`${VIEWER_URL}/embed?specimen`);
  await expect(page.locator('.chatto-root')).toBeVisible();
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(['rgba(0, 0, 0, 0)', 'transparent']).toContain(background);
});
