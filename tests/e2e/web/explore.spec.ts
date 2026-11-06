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
  // Themes from Chatto's own account carry the official badge; others do not.
  await expect(page.getByRole('button', { name: 'Tea Garden' }).getByText('官方')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Soda Bubbles' }).getByText('官方')).toHaveCount(0);

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
  await expect(page.getByRole('heading', { level: 2, name: 'Neon Arcade' })).toBeVisible();
});

test('installing a theme counts the download on its card right away, once', async ({ panel, page }) => {
  await panel.open('page=explore');
  const card = page.getByRole('button', { name: 'Shop Curtain' });
  await expect(card.getByLabel('下載')).toHaveText('150');
  await card.click();
  const detail = page.getByRole('dialog', { name: 'Shop Curtain' });
  await detail.getByRole('button', { name: '安裝' }).click();
  await expect(detail.getByRole('status')).toContainText('已安裝為「Shop Curtain」');
  // Another copy the same day is not another download.
  await detail.getByRole('button', { name: '再安裝一份' }).click();
  await expect(detail.getByRole('status')).toContainText('已安裝為');
  await page.keyboard.press('Escape');
  await expect(card.getByLabel('下載')).toHaveText('151');
});

test('a shared theme is saved as a .chattotheme file without installing it', async ({ panel, page }) => {
  await panel.open('page=explore');
  const card = page.getByRole('button', { name: 'Shop Curtain' });
  await expect(card.getByLabel('下載')).toHaveText('150');
  await card.click();
  const detail = page.getByRole('dialog', { name: 'Shop Curtain' });
  await detail.getByRole('button', { name: '下載檔案' }).click();
  await expect(detail.getByText('已把「Shop Curtain」存成主題檔')).toBeVisible();
  const exported = await page.evaluate(() => window.__chattoMock!.exportedPackages().map((theme) => theme.name));
  expect(exported).toEqual(['Shop Curtain']);
  // Not installed, and installing afterwards is the same download.
  await expect(detail.getByRole('button', { name: '安裝', exact: true })).toBeVisible();
  await detail.getByRole('button', { name: '安裝', exact: true }).click();
  await expect(detail.getByRole('status')).toContainText('已安裝為');
  await page.keyboard.press('Escape');
  await expect(card.getByLabel('下載')).toHaveText('151');
});

test('a theme file is published straight from the publish dialog', async ({ panel, page }) => {
  await panel.open('page=explore');
  await signIn(page);
  await page.getByRole('tab', { name: '我的主題' }).click();
  await page.getByRole('button', { name: '投稿主題' }).click();
  const dialog = page.getByRole('dialog', { name: '投稿主題' });
  await expect(dialog.getByText('只能投稿自訂主題')).toBeVisible();

  const chooser = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: '從檔案選擇' }).click();
  const file = { ...createTheme('from-file', '檔案裡的主題'), builtIn: false };
  await (
    await chooser
  ).setFiles({
    name: 'theme.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(file)),
  });
  // Saved under its own name, picked, and named after it.
  await expect(dialog.getByRole('combobox', { name: '要投稿的主題' })).toHaveText('檔案裡的主題');
  await expect(dialog.getByRole('textbox', { name: '名稱' })).toHaveValue('檔案裡的主題');
  await page.keyboard.press('Escape');
  await panel.nav('主題').click();
  await expect(page.getByRole('heading', { level: 2, name: '檔案裡的主題' })).toBeVisible();
});

test('liking and reporting ask for an account first', async ({ panel, page }) => {
  await panel.open('page=explore');
  await page.getByRole('button', { name: 'Soda Bubbles' }).click();
  await page.getByRole('dialog', { name: 'Soda Bubbles' }).getByRole('button', { name: '按讚' }).click();
  await expect(page.getByRole('dialog', { name: '登入 Chatto 帳號' })).toBeVisible();
});

test('signing in on the explore page, then managing the account on the accounts page', async ({ panel, page }) => {
  await panel.open('page=explore');
  await expect(page.getByRole('tab', { name: '帳號' })).toHaveCount(0);
  await signIn(page);
  await expect(page.getByTestId('sidebar-account')).toContainText('shiraine_ciel');

  // The name in the header opens the accounts page.
  await page.getByRole('button', { name: 'shiraine_ciel', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: '帳號' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chatto 帳號' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '直播平台' })).toBeVisible();

  // The Twitch card below has its own sign-out; stay inside the Chatto account section.
  const chatto = page.getByRole('region', { name: 'Chatto 帳號' });
  await chatto.getByRole('listitem').filter({ hasText: 'Google' }).getByRole('button', { name: '連結' }).click();
  const dialog = page.getByRole('dialog', { name: '登入 Chatto 帳號' });
  await dialog.getByRole('button', { name: '連結 Google' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(chatto.getByRole('listitem').filter({ hasText: 'Google' })).toContainText('Ciel');

  await chatto.getByRole('textbox', { name: '顯示名稱' }).fill('Ciel 的茶館');
  await chatto.getByRole('button', { name: '儲存' }).click();
  await expect(page.getByTestId('sidebar-account')).toContainText('Ciel 的茶館');

  await chatto.getByRole('button', { name: '登出' }).click();
  await expect(chatto.getByRole('button', { name: '登入', exact: true })).toBeVisible();
  await expect(page.getByTestId('sidebar-account')).toContainText('未登入 Chatto');
  // Signing out of Chatto leaves the chat connection alone.
  await expect(page.getByRole('region', { name: '直播平台' }).getByRole('button', { name: '中斷連線' })).toBeVisible();
});

test('the sidebar account card opens the accounts page', async ({ panel, page }) => {
  await panel.open('page=overview');
  await page.getByTestId('sidebar-account').click();
  await expect(page.getByRole('heading', { level: 1, name: '帳號' })).toBeVisible();
  await expect(page.getByTestId('sidebar-account')).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('region', { name: 'Chatto 帳號' }).getByRole('button', { name: '登入', exact: true }),
  ).toBeVisible();
});

test('a custom theme is checked, published and listed under my themes', async ({ panel, page }) => {
  await panel.open('page=explore');
  await panel.setState({ themes: [...PRESET_THEMES, { ...createTheme('mine', '抹茶草稿'), builtIn: false }] });
  await signIn(page);

  await page.getByRole('tab', { name: '我的主題' }).click();
  // The fake service signs in as a moderator, who has no daily publish limit.
  await expect(page.getByText('投稿不限每日次數')).toBeVisible();
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

  await expect(page.getByRole('heading', { level: 2, name: '我的抹茶' })).toBeVisible();
  await expect(page.getByText('公開中')).toBeVisible();
});

test('a theme published elsewhere is fetched to this computer to update it', async ({ panel, page }) => {
  await panel.open('page=explore');
  await panel.setState({ themes: [...PRESET_THEMES, { ...createTheme('mine', '抹茶草稿'), builtIn: false }] });
  await signIn(page);
  await page.getByRole('tab', { name: '我的主題' }).click();
  await page.getByRole('button', { name: '投稿主題' }).click();
  const publish = page.getByRole('dialog', { name: '投稿主題' });
  await publish.getByRole('textbox', { name: '名稱' }).fill('遠方的抹茶');
  await publish.getByRole('combobox', { name: '類別' }).click();
  await page.getByRole('option', { name: '自然' }).click();
  await publish.getByRole('button', { name: '投稿' }).click();
  await expect(publish.getByText('已發佈')).toBeVisible();
  await page.keyboard.press('Escape');

  // As if it had been published from another computer: no local theme is linked to it.
  await panel.setState({ themes: [...PRESET_THEMES, { ...createTheme('other', '別的草稿'), builtIn: false }] });
  const row = page.getByRole('article').filter({ hasText: '遠方的抹茶' });
  await row.getByRole('button', { name: '更新' }).click();
  const update = page.getByRole('dialog', { name: '更新「遠方的抹茶」' });
  await expect(update.getByText('「別的草稿」不是從「遠方的抹茶」來的')).toBeVisible();
  await page.keyboard.press('Escape');

  await row.getByRole('button', { name: '取得到本機' }).click();
  await expect(page.getByText('已存成本機主題「遠方的抹茶」')).toBeVisible();
  await expect(row.getByRole('button', { name: '取得到本機' })).toHaveCount(0);
  await row.getByRole('button', { name: '更新' }).click();
  // The fetched copy is picked, so nothing gets replaced by mistake.
  await expect(update.getByRole('combobox', { name: '要投稿的主題' })).toHaveText('遠方的抹茶');
  await expect(update.getByText('不是從')).toHaveCount(0);
});

test('publishing starts from a theme of your own, and flags an unchanged copy before sending', async ({
  panel,
  page,
}) => {
  await panel.open('page=explore');
  await signIn(page);
  // Install someone else's theme, then add a theme of your own after it.
  await page.getByRole('button', { name: 'Shop Curtain' }).click();
  const detail = page.getByRole('dialog', { name: 'Shop Curtain' });
  await detail.getByRole('button', { name: '安裝' }).click();
  await expect(detail.getByRole('status')).toContainText('已安裝為');
  await page.keyboard.press('Escape');
  const installed = await page.evaluate(() => window.__chattoMock!.getState().themes.filter((t) => !t.builtIn));
  await panel.setState({
    themes: [...PRESET_THEMES, ...installed, { ...createTheme('mine', '抹茶草稿'), builtIn: false }],
  });

  await page.getByRole('tab', { name: '我的主題' }).click();
  await page.getByRole('button', { name: '投稿主題' }).click();
  const dialog = page.getByRole('dialog', { name: '投稿主題' });
  // The copy comes first in the list, but your own theme is picked.
  await expect(dialog.getByRole('textbox', { name: '名稱' })).toHaveValue('抹茶草稿');

  await dialog.getByRole('combobox', { name: '要投稿的主題' }).click();
  await page.getByRole('option', { name: 'Shop Curtain' }).click();
  await expect(dialog.getByText('這是別人分享的主題，修改後才能以改作投稿')).toBeVisible();
  await expect(dialog.getByRole('button', { name: '投稿' })).toHaveAttribute('aria-disabled', 'true');
});

test('reporting a theme confirms it in the dialog and on the theme', async ({ panel, page }) => {
  await panel.open('page=explore');
  await signIn(page);
  await page.getByRole('button', { name: 'Soda Bubbles' }).click();
  const detail = page.getByRole('dialog', { name: 'Soda Bubbles' });
  await detail.getByRole('button', { name: '檢舉' }).click();
  const report = page.getByRole('dialog', { name: '檢舉主題' });
  await report.getByRole('combobox', { name: '原因' }).click();
  await page.getByRole('option', { name: '垃圾內容或重複投稿' }).click();
  await report.getByRole('button', { name: '送出檢舉' }).click();
  await expect(report.getByText('已收到你的檢舉')).toBeVisible();
  await report.getByRole('button', { name: '關閉' }).first().click();
  await expect(detail.getByText('已送出檢舉，管理者會查看這個主題')).toBeVisible();
  await expect(detail.getByRole('button', { name: '已檢舉' })).toHaveAttribute('aria-disabled', 'true');
});

test('moderators restore hidden themes from the reports', async ({ panel, page }) => {
  await panel.open('page=explore');
  await signIn(page);
  await page.getByRole('tab', { name: '管理' }).click();
  const row = page.getByRole('article').filter({ hasText: 'Copied Bubbles' });
  await expect(row.getByText('已隱藏')).toBeVisible();
  await row.getByRole('button', { name: '恢復' }).click();
  await expect(row.getByText('已隱藏')).toHaveCount(0);
  await expect(page.getByText('已恢復「Copied Bubbles」')).toBeVisible();

  await page.getByRole('tab', { name: '瀏覽' }).click();
  await expect(page.getByRole('button', { name: 'Copied Bubbles' })).toBeVisible();
});
