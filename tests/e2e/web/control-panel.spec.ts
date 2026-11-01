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

  await page.getByRole('switch', { name: '事件 Overlay' }).click();
  await expect(page.getByRole('button', { name: '調整' }).last()).toBeEnabled();
});
