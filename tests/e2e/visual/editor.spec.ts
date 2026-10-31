import { expect, test } from '../fixtures';

/** Every theme editor section (panel and menu; the live preview is masked), so refactors of the editor can be checked against a baseline. */
const sections = [
  '基底與結構',
  '文字',
  '面板',
  '訊息',
  '名稱',
  '內容',
  '細節元件',
  '通用事件訊息',
  '身分樣式',
  '動畫',
  '顯示規則',
  '自訂 CSS',
  '小奇點（Cheer）',
] as const;

test.use({ colorScheme: 'light' });
// One editor per worker at a time: opening every section in parallel starves the machine
// (each editor runs its own preview) and screenshots time out. `default` keeps this file in one worker.
test.describe.configure({ mode: 'default' });
test.setTimeout(60_000);

for (const [index, label] of sections.entries()) {
  test(`theme editor section ${label}`, async ({ panel, page }) => {
    await panel.open('page=themes');
    await page.getByRole('button', { name: '複製並編輯' }).first().click();
    await page
      .getByRole('navigation')
      .filter({ hasText: '基底與結構' })
      .getByRole('button', { name: label, exact: true })
      .click();
    // Hovering a menu item outlines its target in the preview; move away so only the panel is compared.
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`editor-${String(index).padStart(2, '0')}.png`, {
      // The preview keeps animating; its look is covered by themes.spec.ts.
      mask: [page.locator('.chatto-root')],
    });
  });
}
