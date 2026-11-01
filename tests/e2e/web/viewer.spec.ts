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

test('the alert overlay shows one card at a time and moves on', async ({ page }) => {
  await page.goto(`${VIEWER_URL}/alerts?mock=1`);
  const card = page.locator('.chatto-list > li');
  await expect(card).toHaveCount(1);
  // The exit animation is short; record it instead of polling for it.
  await page.evaluate(() => {
    const root = document.querySelector('.chatto-root')!;
    new MutationObserver(() => {
      if (root.hasAttribute('data-leaving')) (window as { sawLeaving?: boolean }).sawLeaving = true;
    }).observe(root, { attributes: true });
  });
  const first = await card.getAttribute('data-event');
  // Mock cards stay 2.5 s, play their exit animation, then the next event comes up.
  await expect.poll(() => card.getAttribute('data-event'), { timeout: 10_000 }).not.toBe(first);
  await expect(card).toHaveCount(1);
  expect(await page.evaluate(() => (window as { sawLeaving?: boolean }).sawLeaving)).toBe(true);
});

test('the overlay marks a message that broke a quiet spell', async ({ page }) => {
  await page.goto(`${VIEWER_URL}/overlay?specimen`);
  const calm = page.locator('.chatto-message[data-highlight~="after-silence"]');
  await expect(calm).toHaveCount(1);
  const label = await calm.evaluate((element) => getComputedStyle(element, '::after').content);
  expect(label).toBe('"新留言"');
});
