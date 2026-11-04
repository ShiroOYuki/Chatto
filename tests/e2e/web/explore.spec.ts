import { createTheme, PRESET_THEMES } from '@chatto/chat-ui';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

/** Agrees to the terms and signs in with Twitch against the fake sharing service. */
async function signIn(page: Page) {
  await page.getByRole('button', { name: '登入', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: '登入 Chatto 帳號' });
  await dialog.getByRole('switch', { name: '我已閱讀並同意使用條款與隱私說明' }).click();
  await dialog.getByRole('button', { name: '繼續' }).click();
  await dialog.getByRole('button', { name: '用 Twitch 登入' }).click();
  await expect(dialog.getByText('請在瀏覽器完成登入')).toBeVisible();
  await expect(dialog).toHaveCount(0);
}

test('shared themes can be browsed, filtered, opened by code and installed', async ({ panel, page }) => {
  await panel.open('page=explore');
  await expect(page.getByRole('heading', { level: 1, name: '探索' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Soda Bubbles' })).toBeVisible();

  await page.getByRole('button', { name: '復古', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Green Phosphor' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Soda Bubbles' })).toHaveCount(0);
  await page.getByRole('button', { name: '全部', exact: true }).click();

  await page.getByRole('button', { name: 'Neon Arcade' }).click();
  const detail = page.getByRole('dialog', { name: 'Neon Arcade' });
  const code = (await detail.locator('.font-mono').first().textContent())!.trim();
  await detail.getByRole('button', { name: '安裝' }).click();
  await expect(detail.getByRole('status')).toContainText('已安裝為「Neon Arcade」');
  await expect(detail.getByRole('button', { name: '再安裝一份' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Neon Arcade' }).getByText('已安裝')).toBeVisible();

  // A code, typed loosely, finds the theme.
  await page.getByRole('textbox', { name: '搜尋名稱、tag 或主題代碼' }).fill(code.toLowerCase().replace('-', ' '));
  await expect(page.getByRole('button', { name: /^(Neon Arcade)$/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Soda Bubbles' })).toHaveCount(0);

  await panel.nav('主題').click();
  await expect(page.getByRole('heading', { level: 3, name: 'Neon Arcade' })).toBeVisible();
});

test('liking and reporting ask for an account first', async ({ panel, page }) => {
  await panel.open('page=explore');
  await page.getByRole('button', { name: 'Soda Bubbles' }).click();
  await page.getByRole('dialog', { name: 'Soda Bubbles' }).getByRole('button', { name: '按讚' }).click();
  await expect(page.getByRole('dialog', { name: '登入 Chatto 帳號' })).toBeVisible();
});

test('signing in, linking a method and renaming the account', async ({ panel, page }) => {
  await panel.open('page=explore');
  await signIn(page);
  await expect(page.getByRole('button', { name: 'shiraine_ciel' })).toBeVisible();

  await page.getByRole('tab', { name: '帳號' }).click();
  await page.getByRole('listitem').filter({ hasText: 'Google' }).getByRole('button', { name: '連結' }).click();
  const dialog = page.getByRole('dialog', { name: '登入 Chatto 帳號' });
  await dialog.getByRole('button', { name: '連結 Google' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('listitem').filter({ hasText: 'Google' })).toContainText('Ciel');

  await page.getByRole('textbox', { name: '顯示名稱' }).fill('Ciel 的茶館');
  await page.getByRole('button', { name: '儲存' }).click();
  await expect(page.getByRole('button', { name: 'Ciel 的茶館' })).toBeVisible();

  await page.getByRole('button', { name: '登出' }).click();
  await expect(page.getByRole('button', { name: '登入', exact: true }).first()).toBeVisible();
});

test('a custom theme is checked, published and listed under my themes', async ({ panel, page }) => {
  await panel.open('page=explore');
  await panel.setState({ themes: [...PRESET_THEMES, { ...createTheme('mine', '抹茶草稿'), builtIn: false }] });
  await signIn(page);

  await page.getByRole('tab', { name: '我的主題' }).click();
  await page.getByRole('button', { name: '投稿主題' }).click();
  const dialog = page.getByRole('dialog', { name: '投稿主題' });
  await expect(dialog.getByText('請選擇類別')).toBeVisible();
  await expect(dialog.getByRole('button', { name: '投稿' })).toHaveAttribute('aria-disabled', 'true');

  await dialog.getByRole('textbox', { name: '名稱' }).fill('我的抹茶');
  await dialog.getByRole('combobox', { name: '類別' }).click();
  await page.getByRole('option', { name: '自然' }).click();
  await expect(dialog.getByText('可以投稿')).toBeVisible();
  await dialog.getByRole('button', { name: '投稿' }).click();
  await expect(dialog.getByText('已發佈')).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('heading', { level: 3, name: '我的抹茶' })).toBeVisible();
  await expect(page.getByText('公開中')).toBeVisible();
});

test('moderators restore hidden themes from the reports', async ({ panel, page }) => {
  await panel.open('page=explore');
  await signIn(page);
  await page.getByRole('tab', { name: '管理' }).click();
  const row = page.getByRole('article').filter({ hasText: 'Copied Bubbles' });
  await expect(row.getByText('已隱藏')).toBeVisible();
  await row.getByRole('button', { name: '恢復' }).click();
  await expect(row.getByText('已隱藏')).toHaveCount(0);

  await page.getByRole('tab', { name: '瀏覽' }).click();
  await expect(page.getByRole('button', { name: 'Copied Bubbles' })).toBeVisible();
});
