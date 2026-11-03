import { createMockGiftBatch, createMockNotice, sampleEvent } from '@chatto/chat-ui';
import { fileURLToPath } from 'node:url';
import { chatMessage, expect, test } from '../fixtures';

const PAGES = ['總覽', '聊天室', '主題', '輸出', '連線', '設定'];

test('every page opens from the sidebar without errors', async ({ panel, page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  await panel.open();

  for (const label of PAGES) {
    await panel.nav(label).click();
    await expect(panel.nav(label)).toHaveAttribute('aria-current', 'page');
    if (label !== '總覽') await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('the chat log shows new messages and marks deleted ones', async ({ panel, page }) => {
  await panel.open('page=chat');
  const keep = chatMessage('這則會留著');
  const removed = chatMessage('這則會被刪除');
  await panel.emit(keep, removed);
  await expect(page.getByText('這則會留著')).toBeVisible();
  await expect(page.getByText('這則會被刪除')).toBeVisible();

  await panel.emit({ type: 'message-deleted', platform: 'twitch', channelId: '1', messageId: removed.message.id });
  await page.getByRole('switch', { name: '顯示已刪除' }).click();
  await expect(page.getByText('這則會被刪除')).toHaveCount(0);
  await page.getByRole('switch', { name: '顯示已刪除' }).click();
  await expect(page.getByText('這則會被刪除')).toBeVisible();
});

test('the chat log can be searched and cleared', async ({ panel, page }) => {
  await panel.open('page=chat');
  await panel.emit(chatMessage('抹茶拿鐵'), chatMessage('焙茶'));
  await page.getByPlaceholder('搜尋留言或名稱').fill('抹茶');
  await expect(page.getByText('抹茶拿鐵')).toBeVisible();
  await expect(page.getByText('焙茶')).toHaveCount(0);

  await page.getByPlaceholder('搜尋留言或名稱').fill('');
  await page.getByRole('button', { name: '清除紀錄' }).click();
  await expect(page.getByText('還沒有人說話')).toBeVisible();
});

for (const [width, height] of [
  [960, 640],
  [1280, 820],
  [1920, 1080],
] as const) {
  test(`the overview fills a ${width}×${height} window without overflowing`, async ({ panel, page }) => {
    await page.setViewportSize({ width, height });
    await panel.open('page=overview');
    const events = Array.from({ length: 80 }, (_, i) => (i % 5 === 0 ? createMockNotice() : chatMessage(`留言 ${i}`)));
    await panel.emit(...events);
    await expect(page.getByText('留言 79')).toBeVisible();

    const layout = await page.evaluate(() => {
      // Either `main` or the page wrapper scrolls, depending on the page.
      const scrollers = [document.querySelector('main')!, document.querySelector('main > div')!];
      const tiles = ['最新留言', '最近活動'].map((title) => {
        const tile = [...document.querySelectorAll('section')].find(
          (el) => el.querySelector('h2')?.textContent === title,
        )!;
        return tile.getBoundingClientRect().bottom;
      });
      return {
        overflow: Math.max(...scrollers.map((el) => el.scrollHeight - el.clientHeight)),
        tiles,
        bottom: document.querySelector('main')!.getBoundingClientRect().bottom,
      };
    });
    // Busy chat stays inside the tiles instead of growing the page (1px for rounding).
    expect(layout.overflow).toBeLessThanOrEqual(1);
    // Both tiles reach down to the page padding, however tall the window is.
    for (const bottom of layout.tiles) {
      expect(bottom).toBeGreaterThan(layout.bottom - 40);
      expect(bottom).toBeLessThanOrEqual(layout.bottom);
    }
  });
}

test('recent activity scrolls and shows a community gift once', async ({ panel, page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await panel.open('page=overview');
  await panel.emit(...Array.from({ length: 12 }, () => sampleEvent('twitch:raid')), ...createMockGiftBatch(5));

  const list = page.getByTestId('recent-notices');
  // The batch is one row at the top, listing who received the subs on request.
  const gift = list.getByText('送出 5 份 Tier 1 訂閱給聊天室');
  await expect(gift).toHaveCount(1);
  await expect(list.getByText(/送了一份/)).toHaveCount(0);
  await list.getByRole('button', { name: '收到的人（5）' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(5);

  const scrolls = await list.evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(scrolls).toBe(true);
  await list.hover();
  await page.mouse.wheel(0, 2000);
  await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

test('switching the interface to English, with chat texts following it', async ({ panel, page }) => {
  await panel.open('page=settings');
  await page.getByRole('combobox', { name: '介面語言' }).click();
  await page.getByRole('option', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(panel.nav('Overview')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Chat language' })).toHaveText(/Same as interface \(English\)/);

  await panel.nav('Overview').click();
  await panel.emit(sampleEvent('twitch:resub'));
  await expect(page.getByTestId('recent-notices')).toContainText(
    "Mochi_Fan resubscribed at Tier 1. They've subscribed for 6 months, currently on a 6 month streak!",
  );
});

test("a theme's own event text shows in the editor preview", async ({ panel, page }) => {
  await panel.open('page=themes');
  await page.getByRole('button', { name: '複製並編輯' }).first().click();
  await page.getByRole('button', { name: '續訂', exact: true }).click();
  await page.getByRole('textbox', { name: '文字' }).fill('感謝 {user} 的 {months} 個月');
  await expect(page.locator('.chatto-root [data-event="twitch:resub"] .chatto-notice-system')).toHaveText(
    '感謝 Mochi_Fan 的 6 個月',
  );
});

test('compact mode fits the smallest window', async ({ panel, page }) => {
  await page.setViewportSize({ width: 960, height: 640 });
  await panel.open('compact');
  await expect(page.getByText('編輯與管理主題')).toBeVisible();
  const overflow = await page.evaluate(() => {
    const scroller = document.querySelector('.overflow-y-auto')!;
    return scroller.scrollHeight - scroller.clientHeight;
  });
  expect(overflow).toBeLessThanOrEqual(1);
});

test('compact mode switches the alert overlay on and moves it', async ({ panel, page }) => {
  await panel.open('compact');
  const alertsSwitch = page.getByRole('switch', { name: '事件 Overlay' });
  const adjust = page.getByRole('button', { name: '調整事件提醒的位置' });
  await expect(alertsSwitch).toHaveAttribute('aria-checked', 'false');
  await expect(adjust).toBeDisabled();
  await alertsSwitch.click();
  await expect(alertsSwitch).toHaveAttribute('aria-checked', 'true');
  await adjust.click();
  await expect(page.getByRole('button', { name: '完成調整' })).toBeVisible();
});

test('the theme editor swaps its side menu for a dropdown in the smallest window', async ({ panel, page }) => {
  await page.setViewportSize({ width: 960, height: 640 });
  await panel.open('page=themes');
  await page
    .getByRole('button', { name: /複製並編輯/ })
    .first()
    .click();
  const picker = page.getByRole('combobox', { name: '編輯項目' });
  await expect(picker).toBeVisible();
  await expect(page.getByRole('button', { name: '基底與結構' })).toBeHidden();
  await picker.click();
  await page.getByRole('option', { name: '文字', exact: true }).click();
  await expect(picker).toHaveText('文字');

  await page.setViewportSize({ width: 1280, height: 820 });
  await expect(picker).toBeHidden();
  await expect(page.getByRole('button', { name: '文字', exact: true })).toBeVisible();
});

test('switching to compact mode and back', async ({ panel, page }) => {
  await panel.open('page=settings');
  await page.getByRole('tab', { name: /精簡/ }).click();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByText('精簡模式')).toBeVisible();
  await page.getByTitle('切換到完整模式').click();
  await expect(page.getByRole('navigation')).toBeVisible();
});

test('duplicating a built-in theme opens the editor and saves a custom copy', async ({ panel, page }) => {
  await panel.open('page=themes');
  await page.getByRole('button', { name: '複製並編輯' }).first().click();
  const name = page.getByRole('textbox', { name: '主題名稱' });
  await expect(name).toBeVisible();
  await name.fill('E2E 測試主題');
  await page.getByRole('button', { name: '儲存' }).click();
  await expect(page.getByRole('button', { name: '已儲存' })).toBeVisible();

  await panel.nav('主題').click();
  await expect(page.getByText('E2E 測試主題')).toBeVisible();
});

test('a picked image becomes a nine-slice frame on the preview', async ({ panel, page }) => {
  await panel.open('page=themes');
  await page.getByRole('button', { name: '複製並編輯' }).first().click();
  await page.getByRole('button', { name: '訊息', exact: true }).click();

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '選擇圖片' }).first().click();
  await (await chooser).setFiles(fileURLToPath(new URL('../../fixtures/frame.png', import.meta.url)));

  // The slice editor opens with thirds of the 96 px image.
  await expect(page.getByText('96 × 96 px')).toBeVisible();
  await expect(page.getByRole('slider', { name: '上切線' })).toHaveAttribute('aria-valuenow', '32');
  const message = page.locator('.chatto-root .chatto-message').first();
  await expect(message).toHaveCSS('border-image-source', /^url\("data:image\/png;base64,/);
  await expect(message).toHaveCSS('border-image-slice', '32 fill');

  await page.getByRole('slider', { name: '上切線' }).focus();
  await page.keyboard.press('Shift+ArrowDown');
  await expect(message).toHaveCSS('border-image-slice', '42 32 32 fill');

  await page.getByRole('button', { name: '移除' }).first().click();
  await expect(message).toHaveCSS('border-image-source', 'none');
});

test('sign-in shows the device code', async ({ panel, page }) => {
  await panel.open('page=connections');
  await panel.setState({ auth: { status: 'signed-out' } });
  await panel.setState({
    auth: {
      status: 'pending',
      deviceCode: {
        userCode: 'MATCHA42',
        verificationUri: 'https://www.twitch.tv/activate',
        expiresAt: Date.now() + 600_000,
      },
    },
  });
  await expect(page.getByText('MATCHA42')).toBeVisible();
});

test('alert settings save from the 提醒 page', async ({ panel, page }) => {
  await panel.open('page=alerts');
  const threshold = page.getByRole('textbox', { name: '安靜多久算沉寂' });
  await threshold.fill('90');
  await threshold.press('Enter');
  await expect(threshold).toHaveValue('90');

  const raid = page.locator('[data-alert-rule="any:raid"]');
  // Every event shows by default, without a sound.
  await expect(raid.getByRole('switch', { name: '提醒揪團' })).toHaveAttribute('aria-checked', 'true');
  await expect(raid.getByRole('switch', { name: '揪團的提示音' })).toHaveAttribute('aria-checked', 'false');
  await raid.getByRole('switch', { name: '提醒揪團' }).click();
  await expect(raid.getByRole('switch', { name: '提醒揪團' })).toHaveAttribute('aria-checked', 'false');
  const minimum = raid.getByRole('textbox', { name: '揪團的最低觀眾人數' });
  await minimum.fill('20');
  await minimum.blur();
  await expect(minimum).toHaveValue('20');
  await expect(page.locator('[data-alert-rule="twitch:highlighted"]')).toBeVisible();

  // The overlay itself is switched on with the other outputs.
  await expect(page.getByRole('switch', { name: '事件 Overlay' })).toHaveCount(0);
  await page.getByRole('button', { name: '開關與位置' }).click();
  await expect(page.getByRole('heading', { name: '輸出', level: 1 })).toBeVisible();
  await page.getByRole('switch', { name: '事件 Overlay' }).click();
  await expect(page.getByRole('button', { name: '調整' }).last()).toBeEnabled();
});
