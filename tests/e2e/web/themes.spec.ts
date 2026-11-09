import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

// The themes page with `?library`: Games (Game night, Retro terminal), Talks (Just chatting),
// Unfiled (Loose idea) and two themes in the trash (#41, #42).

const card = (page: Page, name: string) =>
  page.getByRole('article').filter({ has: page.getByRole('heading', { name, level: 2, exact: true }) });
const section = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const cardNames = (page: Page, name: string) => section(page, name).getByRole('heading', { level: 2 });

/** HTML5 drag and drop, dispatched directly: the mouse would scroll the page halfway through. */
async function drag(page: Page, themeId: string, target: ReturnType<Page['locator']>) {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await page.locator(`[data-theme-id="${themeId}"]`).dispatchEvent('dragstart', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
}
const library = (page: Page) => page.evaluate(() => window.__chattoMock!.getState().themeLibrary);

async function cardMenu(page: Page, name: string, item: string | RegExp) {
  await card(page, name).getByRole('button', { name: '更多動作' }).click();
  await page.getByRole('menuitem', { name: item }).click();
}

test('a deleted theme goes to the trash and comes back to its folder', async ({ panel, page }) => {
  await panel.open('library&page=themes');
  await cardMenu(page, 'Retro terminal', '刪除主題');
  await expect(page.getByRole('alertdialog')).toContainText('移到垃圾桶，30 天後自動清除');
  await page.getByRole('button', { name: '移到垃圾桶' }).click();
  await expect(card(page, 'Retro terminal')).toHaveCount(0);

  await page.getByRole('button', { name: '垃圾桶' }).click();
  const dialog = page.getByRole('dialog', { name: '垃圾桶' });
  await expect(dialog.getByRole('listitem')).toHaveCount(3);
  await expect(dialog.getByRole('listitem').first()).toContainText('Retro terminal');
  await expect(dialog.getByRole('listitem').first()).toContainText('剩 30 天');
  await dialog.getByRole('button', { name: '還原 Retro terminal' }).click();
  await expect(dialog.getByRole('status')).toContainText('已還原「Retro terminal」');
  await dialog.getByRole('button', { name: '關閉' }).first().click();

  await expect(cardNames(page, 'Games')).toHaveText(['Game night', 'Retro terminal']);
});

test('a theme whose id is taken again comes back as a separate theme', async ({ panel, page }) => {
  await panel.open('library&page=themes');
  await page.getByRole('button', { name: '垃圾桶' }).click();
  const dialog = page.getByRole('dialog', { name: '垃圾桶' });
  // "Game night" is in the trash as the version before an overwrite, while the theme still exists.
  await expect(dialog.getByRole('listitem').last()).toContainText('覆蓋前的版本');
  await dialog.getByRole('button', { name: '還原 Game night' }).click();
  await dialog.getByRole('button', { name: '關閉' }).first().click();
  await expect(section(page, 'Games').getByRole('heading', { name: 'Game night', level: 2 })).toHaveCount(2);
});

test('the trash deletes forever one theme or all of them', async ({ panel, page }) => {
  await panel.open('library&page=themes');
  await page.getByRole('button', { name: '垃圾桶' }).click();
  const dialog = page.getByRole('dialog', { name: '垃圾桶' });
  await dialog.getByRole('button', { name: '永久刪除 Old bubbles' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '永久刪除' }).click();
  await expect(dialog.getByRole('listitem')).toHaveCount(1);
  await dialog.getByRole('button', { name: '清空垃圾桶' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '清空垃圾桶' }).click();
  await expect(dialog.getByText('垃圾桶是空的')).toBeVisible();
  expect(await page.evaluate(() => window.__chattoMock!.getState().themeTrash)).toEqual([]);
});

test('folders are created, renamed, filled from the menu and deleted without losing themes', async ({
  panel,
  page,
}) => {
  await panel.open('library&page=themes');
  await page.getByRole('button', { name: '新增分區' }).click();
  await page.getByRole('textbox', { name: '分區名稱' }).fill('Music');
  await page.getByRole('button', { name: '建立' }).click();
  await expect(section(page, 'Music')).toContainText('把主題拖到這裡');

  await card(page, 'Loose idea').getByRole('button', { name: '更多動作' }).click();
  await page.getByRole('menuitem', { name: '移到' }).click();
  await page.getByRole('menuitem', { name: 'Music' }).click();
  await expect(cardNames(page, 'Music')).toHaveText(['Loose idea']);
  // Unfiled stays while there are custom themes, so themes can go back there.
  await expect(section(page, '未分類')).toContainText('把主題拖到這裡');

  await section(page, 'Music').getByRole('button', { name: '「Music」的動作' }).click();
  await page.getByRole('menuitem', { name: '改名' }).click();
  await page.getByRole('textbox', { name: '分區名稱' }).fill('Songs');
  await page.getByRole('button', { name: '改名' }).click();
  await expect(section(page, 'Songs')).toBeVisible();

  await section(page, 'Songs').getByRole('button', { name: '「Songs」的動作' }).click();
  await page.getByRole('menuitem', { name: '刪除分區' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '刪除分區' }).click();
  await expect(section(page, 'Songs')).toHaveCount(0);
  await expect(cardNames(page, '未分類')).toHaveText(['Loose idea']);
});

test('themes and folders move up and down from their menus', async ({ panel, page }) => {
  await panel.open('library&page=themes');
  await cardMenu(page, 'Retro terminal', '上移');
  await expect(cardNames(page, 'Games')).toHaveText(['Retro terminal', 'Game night']);

  await section(page, 'Talks').getByRole('button', { name: '「Talks」的動作' }).click();
  await page.getByRole('menuitem', { name: '上移' }).click();
  expect((await library(page)).folders.map((folder) => folder.name)).toEqual(['Talks', 'Games']);
});

test('a theme dragged onto a folder lands at its end, onto a card before that card', async ({ panel, page }) => {
  await panel.open('library&page=themes');
  await drag(page, 'custom-loose', section(page, 'Games').locator('header'));
  await expect(cardNames(page, 'Games')).toHaveText(['Game night', 'Retro terminal', 'Loose idea']);
  await drag(page, 'custom-loose', page.locator('[data-theme-id="custom-game"]'));
  await expect(cardNames(page, 'Games')).toHaveText(['Loose idea', 'Game night', 'Retro terminal']);
});

test('collapsed sections are remembered', async ({ panel, page }) => {
  await panel.open('library&page=themes');
  await page.getByRole('button', { name: '收合「預設」' }).click();
  await expect(card(page, '和紙')).toHaveCount(0);
  expect((await library(page)).collapsed).toEqual(['built-in']);
  await page.getByRole('button', { name: '展開「預設」' }).click();
  await expect(card(page, '和紙')).toBeVisible();
});

test('search and filters show matching themes across sections', async ({ panel, page }) => {
  await panel.open('library&page=themes');
  // Built-in themes are found by their name in any language.
  await page.getByRole('searchbox', { name: '搜尋主題' }).fill('washi');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['和紙']);

  await page.getByRole('searchbox', { name: '搜尋主題' }).fill('');
  await page.getByRole('button', { name: '使用中' }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['抹茶玻璃', '泡泡', 'Just chatting']);

  await page.getByRole('button', { name: '篩選', exact: true }).click();
  await page.getByRole('menuitemcheckbox', { name: '有自訂 CSS' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Just chatting']);

  await page.getByRole('searchbox', { name: '搜尋主題' }).fill('nothing like this');
  await expect(page.getByText('沒有符合的主題')).toBeVisible();
  await page.getByRole('button', { name: '清除搜尋與篩選' }).click();
  await expect(section(page, '預設')).toBeVisible();
  await expect(section(page, 'Games')).toBeVisible();
});

test('duplicating a theme in a folder keeps the copy in that folder', async ({ panel, page }) => {
  await panel.open('library&page=themes');
  await cardMenu(page, 'Just chatting', '建立副本');
  // The editor opens on the copy; the copy is already filed.
  await expect
    .poll(async () => {
      const state = await page.evaluate(() => window.__chattoMock!.getState());
      const copy = state.themes.find((theme) => theme.name === 'Just chatting 副本');
      return copy && state.themeLibrary.folderOf[copy.id];
    })
    .toBe('folder-talks');
});
