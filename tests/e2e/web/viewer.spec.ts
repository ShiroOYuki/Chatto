import { createTheme, getPresetTheme, PRESET_THEMES, scopeCustomCss, themeToCss } from '@chatto/chat-ui';
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

test('a desktop window look tints the window and fades only the chat; edit mode still shows its frame', async ({
  page,
}) => {
  await page.goto(`${VIEWER_URL}/overlay?specimen`);
  const body = page.locator('body');
  const root = page.locator('#root');
  // Without a look (OBS) the page stays transparent.
  await expect(body).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(root).toHaveCSS('opacity', '1');

  // What the desktop app runs in the overlay window (overlayLookScript).
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--chatto-backdrop', 'rgba(27, 34, 48, 0.5)');
    document.documentElement.style.setProperty('--chatto-chat-opacity', '0.6');
  });
  await expect(body).toHaveCSS('background-color', 'rgba(27, 34, 48, 0.5)');
  await expect(root).toHaveCSS('opacity', '0.6');
  await expect(root).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  await page.evaluate(() => document.body.toggleAttribute('data-edit', true));
  await expect(body).toHaveCSS('background-color', 'rgba(23, 52, 4, 0.25)');
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

test('custom CSS overrides the generated styles with plain selectors', async ({ page }) => {
  const scope = '.chatto-root[data-chatto-id="t"]';
  const theme = {
    ...getPresetTheme('matcha-glass')!,
    customCss: '.chatto-root { font-size: 31px } .chatto-body { color: rgb(1, 2, 3) }',
  };
  const css = [themeToCss(theme, scope), scopeCustomCss(theme.customCss, scope)].join('\n');
  await page.setContent(
    `<style>${css}</style><div class="chatto-root" data-chatto-id="t"><ol class="chatto-list">` +
      `<li class="chatto-message"><span class="chatto-body">hi</span></li></ol></div>`,
  );
  expect(await page.locator('.chatto-root').evaluate((el) => getComputedStyle(el).fontSize)).toBe('31px');
  expect(await page.locator('.chatto-body').evaluate((el) => getComputedStyle(el).color)).toBe('rgb(1, 2, 3)');
});

test('the quiet-spell label follows the chat language', async ({ page }) => {
  const scope = '.chatto-root[data-chatto-id="t"]';
  const theme = createTheme('t', 't', { attention: { label: 'New', labels: { 'zh-TW': '新留言' } } });
  const label = async (lang: string) => {
    await page.setContent(
      `<style>${themeToCss(theme, scope)}</style><div class="chatto-root" data-chatto-id="t" lang="${lang}">` +
        `<ol class="chatto-list"><li class="chatto-message" data-highlight="after-silence">` +
        `<span class="chatto-body">hi</span></li></ol></div>`,
    );
    return page.locator('.chatto-message').evaluate((el) => getComputedStyle(el, '::after').content);
  };
  expect(await label('zh-TW')).toBe('"新留言"');
  expect(await label('en')).toBe('"New"');
});

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
