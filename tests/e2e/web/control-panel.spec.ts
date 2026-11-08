import { createMockGiftBatch, createMockNotice, sampleEvent } from '@chatto/chat-ui';
import { fileURLToPath } from 'node:url';
import { chatMessage, expect, test } from '../fixtures';

const PAGES = ['總覽', '聊天室', '主題', '輸出', '帳號', '設定'];

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

test('every clickable control shows a pointer', async ({ panel, page }) => {
  await panel.open();
  const CLICKABLE = [
    'button',
    'a[href]',
    'summary',
    '[role="button"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="combobox"]:not(input)',
  ].join(', ');
  for (const label of [...PAGES, '探索', '提醒']) {
    await panel.nav(label).click();
    await expect(panel.nav(label)).toHaveAttribute('aria-current', 'page');
    const wrong = await page.evaluate((selector) => {
      const disabled = (el: Element) =>
        el.matches(':disabled, [aria-disabled="true"], [data-disabled]') || el.closest('.chatto-root') !== null;
      return [...document.querySelectorAll(selector)]
        .filter((el) => !disabled(el) && el.getClientRects().length > 0)
        .filter((el) => getComputedStyle(el).cursor !== 'pointer')
        .map(
          (el) =>
            `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}"`,
        );
    }, CLICKABLE);
    expect(wrong, label).toEqual([]);
  }
  // Disabled controls keep the arrow.
  await panel.nav('帳號').click();
  await panel.setState({ auth: { status: 'signed-out' }, channel: { state: 'idle' } });
  const connect = page.getByRole('main').getByRole('button', { name: '連線', exact: true });
  await expect(connect).toBeDisabled();
  expect(await connect.evaluate((el) => getComputedStyle(el).cursor)).toBe('default');
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

test('a theme without images is exported as a package too', async ({ panel, page }) => {
  await panel.open('page=themes');
  await page.getByRole('button', { name: '更多動作' }).first().click();
  await expect(page.getByRole('menuitem', { name: 'JSON' })).toHaveCount(0);
  await page.getByRole('menuitem', { name: '匯出主題包' }).click();
  await expect
    .poll(() => page.evaluate(() => window.__chattoMock!.exportedPackages().map((theme) => theme.id)))
    .toEqual(['matcha-glass']);
});

test('a theme card applies its theme to the alert overlay too', async ({ panel, page }) => {
  await panel.open('page=themes');
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: '和紙', level: 2 }) });
  const events = card.getByRole('button', { name: '事件', exact: true });
  await expect(events).toHaveAttribute('aria-pressed', 'false');
  await events.click();
  await expect(events).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.__chattoMock!.getState().selectedThemes.alerts)).toBe('washi');
  // Washi was already the OBS theme, so the card now names both outputs.
  await expect(card.getByText('OBS', { exact: true }).first()).toBeVisible();
  await expect(card.locator('[data-slot="badge"]', { hasText: '事件' })).toBeVisible();
});

test('compact mode picks the alert overlay theme as well', async ({ panel, page }) => {
  await panel.open('compact');
  await page.getByRole('button', { name: '事件', exact: true }).click();
  const list = page.getByTestId('compact-theme-list');
  await expect(list.getByRole('button', { pressed: true })).toContainText('泡泡');
  await list.getByRole('button', { name: /和紙/ }).click();
  await expect.poll(() => page.evaluate(() => window.__chattoMock!.getState().selectedThemes.alerts)).toBe('washi');
  expect(await page.evaluate(() => window.__chattoMock!.getState().selectedThemes.overlay)).toBe('matcha-glass');
});

test('the outputs page sets each desktop window’s backdrop and chat opacity', async ({ panel, page }) => {
  await panel.open('page=outputs');
  const chatLook = page.getByRole('region', { name: '視窗外觀' }).first();
  const backdrop = chatLook.getByRole('slider', { name: '背景不透明度' });
  await backdrop.focus();
  await page.keyboard.press('PageUp'); // +10
  await chatLook.getByRole('slider', { name: '聊天室不透明度' }).focus();
  await page.keyboard.press('PageDown'); // -10
  await expect
    .poll(() => page.evaluate(() => window.__chattoMock!.getState().overlay.look))
    .toEqual({ color: '#000000', backgroundOpacity: 0.1, chatOpacity: 0.9 });
  expect(await page.evaluate(() => window.__chattoMock!.getState().alertsOverlay.look.backgroundOpacity)).toBe(0);
  // The overlay preview shows it.
  const preview = page.getByTestId('live-theme-preview').first();
  await expect(preview.locator('> div')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.1)');
  await expect(preview.locator('> div > div')).toHaveCSS('opacity', '0.9');
});

test('new messages in a chat preview never scroll the page', async ({ panel, page }) => {
  await page.setViewportSize({ width: 960, height: 640 });
  await panel.open('page=outputs');
  const main = page.locator('main');
  const preview = page.getByTestId('live-theme-preview').first();
  // The page loads on first visit; scroll once it is there.
  await expect(preview).toBeVisible();
  // The preview's top is scrolled out of view while the preview itself still shows: a chat line
  // would be the browser's scroll anchor, and each new message would drag the page up with it.
  await main.evaluate((el) => (el.scrollTop = 300));
  const lines = preview.locator('.chatto-list > *');
  const before = await lines.count();
  await expect.poll(() => lines.count(), { timeout: 10_000 }).toBeGreaterThan(before + 1);
  expect(await main.evaluate((el) => el.scrollTop)).toBe(300);
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

test('the editor preview can show only the samples of the current section', async ({ panel, page }) => {
  await panel.open('page=themes');
  await page.getByRole('button', { name: '複製並編輯' }).first().click();
  const rows = page.locator('.chatto-root .chatto-list > *');

  // The structure section has no samples of its own.
  const focus = page.getByRole('button', { name: '這個區塊沒有專屬範例，顯示全部' });
  await expect(focus).toHaveAttribute('aria-disabled', 'true');
  await expect(focus).toHaveAttribute('aria-pressed', 'false');
  // Counted once the editor (loaded on first open) shows its samples.
  await expect(rows.first()).toBeVisible();
  const all = await rows.count();

  await page.getByRole('button', { name: '續訂', exact: true }).click();
  const only = page.getByRole('button', { name: '只看目前區塊的範例' });
  await only.click();
  await expect(only).toHaveAttribute('aria-pressed', 'true');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute('data-event', 'twitch:resub');

  // It follows the section being edited.
  await page.getByRole('button', { name: '新留言提醒', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute('data-highlight', /after-silence/);

  // The live preview is never filtered.
  await page.getByRole('tab', { name: '即時' }).click();
  await expect(only).toHaveCount(0);
  await page.getByRole('tab', { name: '範例' }).click();
  await expect(rows).toHaveCount(1);

  await only.click();
  await expect(rows).toHaveCount(all);
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

test('the OBS tile installs and removes the OBS plugin', async ({ panel, page }) => {
  await panel.open('page=outputs&obsPlugin=not-installed');
  const plugin = page.getByRole('region', { name: 'OBS 外掛' });
  await expect(plugin.getByText('未安裝')).toBeVisible();
  await plugin.getByRole('button', { name: '安裝外掛' }).click();
  await expect(plugin.getByText('已安裝')).toBeVisible();
  await expect(plugin.getByText('開啟 OBS 後，在來源新增「Chatto 聊天室」')).toBeVisible();
  await expect(plugin.getByRole('button', { name: '安裝外掛' })).toHaveCount(0);
  await plugin.getByRole('button', { name: '移除' }).click();
  await expect(plugin.getByText('未安裝')).toBeVisible();
});

test('the title bar offers an OBS plugin update and installs it', async ({ panel, page }) => {
  await panel.open('page=overview&obsPlugin=outdated');
  const update = page.getByRole('button', { name: '更新 OBS 外掛' });
  await update.click();
  await expect(update).toHaveCount(0);
});

test('the title bar suggests installing the OBS plugin until dismissed', async ({ panel, page }) => {
  await panel.open('page=outputs&obsPlugin=not-installed');
  const install = page.getByRole('button', { name: '安裝 OBS 外掛', exact: true });
  await expect(install).toBeVisible();
  await page.getByRole('button', { name: '不再提醒安裝 OBS 外掛' }).click();
  await expect(install).toHaveCount(0);
  // The outputs page still has it.
  await expect(page.getByRole('region', { name: 'OBS 外掛' }).getByRole('button', { name: '安裝外掛' })).toBeVisible();
});

test('switching to compact mode and back', async ({ panel, page }) => {
  await panel.open('page=settings');
  await page.getByRole('button', { name: '外觀', exact: true }).click();
  await page.getByRole('tab', { name: /精簡/ }).click();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByText('精簡模式')).toBeVisible();
  await page.getByTitle('切換到完整模式').click();
  await expect(panel.nav('設定')).toBeVisible();
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
  await panel.open('page=accounts');
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

test('the channel field fills in the signed-in account’s own channel', async ({ panel, page }) => {
  await panel.open('page=accounts');
  const channel = page.getByRole('textbox', { name: '頻道名稱' });
  await channel.fill('someone_else');
  await page.getByRole('button', { name: '填入我的頻道' }).click();
  await expect(channel).toHaveValue('shiraine_ciel');

  await panel.open('compact');
  const compact = page.getByPlaceholder('shiraine_ciel');
  await compact.fill('someone_else');
  await page.getByRole('button', { name: '填入我的頻道' }).click();
  await expect(compact).toHaveValue('shiraine_ciel');

  // Signed out, there is no channel of your own to fill in.
  await panel.setState({ auth: { status: 'signed-out' } });
  await expect(page.getByRole('button', { name: '填入我的頻道' })).toHaveCount(0);
});

test('a built-in Client ID stays under advanced settings and can be swapped and restored', async ({ panel, page }) => {
  await panel.open('page=accounts');
  await expect(page.getByRole('heading', { name: '1. 登入' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Client ID' })).toBeHidden();

  await page.getByText('進階設定').click();
  await expect(page.getByText('使用 Chatto 內建的 Client ID').last()).toBeVisible();
  await page.getByRole('textbox', { name: 'Client ID' }).fill('my-own-id');
  await page.getByRole('button', { name: '儲存' }).click();
  await expect(page.getByText('使用你自己的 Client ID').last()).toBeVisible();
  // A different Client ID needs a new sign-in.
  await expect(page.getByRole('button', { name: '用 Twitch 登入' })).toBeVisible();

  await page.getByRole('button', { name: '改回內建' }).click();
  await expect(page.getByText('使用 Chatto 內建的 Client ID').last()).toBeVisible();
  await expect(page.getByRole('button', { name: '改回內建' })).toHaveCount(0);
});

test('without a built-in Client ID, entering one is the first step', async ({ panel, page }) => {
  await panel.open('page=accounts');
  await panel.setState({ clientId: { source: 'none', hasBuiltIn: false }, auth: { status: 'signed-out' } });
  await expect(page.getByRole('heading', { name: '1. 應用程式' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '2. 登入' })).toBeVisible();
  await expect(page.getByRole('button', { name: '用 Twitch 登入' })).toBeDisabled();
  await expect(page.getByText('進階設定')).toHaveCount(0);
});

test('an update is found, downloaded on request and offered as a restart', async ({ panel, page }) => {
  await panel.open('page=settings');
  await page.getByRole('button', { name: '關於', exact: true }).click();
  await expect(page.getByText('已是最新版本')).toBeVisible();
  // Nothing to act on yet, so the title bar stays quiet.
  await expect(page.getByRole('button', { name: /有新版本/ })).toHaveCount(0);

  await page.getByRole('button', { name: '檢查更新' }).click();
  await expect(page.getByText('有新版本 0.2.0').first()).toBeVisible();
  // The title bar badge offers the download too; the settings button starts it here.
  await expect(page.getByRole('button', { name: '有新版本 0.2.0' })).toBeVisible();
  await page.getByRole('button', { name: '下載更新' }).click();
  await expect(page.getByRole('progressbar')).toBeVisible();

  await expect(page.getByRole('button', { name: '重新啟動並更新' })).toBeVisible();
  await expect(page.getByRole('button', { name: '重新啟動以更新' })).toBeVisible();
});

test('a failed update check says what went wrong in plain words', async ({ panel, page }) => {
  await panel.open('page=settings');
  await page.getByRole('button', { name: '關於', exact: true }).click();
  await panel.setState({ update: { status: 'error', error: 'not-found' } });
  await expect(page.getByText('目前讀不到更新資訊，請稍後再試')).toBeVisible();
  await expect(page.getByRole('button', { name: '檢查更新' })).toBeEnabled();
});

test('the license dialog shows the disclaimer, the GPL and third-party notices', async ({ panel, page }) => {
  await panel.open('page=settings');
  await page.getByRole('button', { name: '關於', exact: true }).click();
  await page.getByRole('button', { name: '授權條款' }).click();
  const dialog = page.getByRole('dialog', { name: '免責聲明與授權' });
  await expect(dialog.getByRole('heading', { name: '不提供擔保' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '內容責任' })).toBeVisible();

  await dialog.getByRole('tab', { name: 'GPL-3.0' }).click();
  await expect(dialog.getByText('GNU GENERAL PUBLIC LICENSE').first()).toBeVisible();

  await dialog.getByRole('tab', { name: '第三方授權' }).click();
  await expect(dialog.getByRole('heading', { name: 'Fonts' })).toBeVisible();
  await expect(dialog.getByRole('cell', { name: 'SIL Open Font License 1.1' }).first()).toBeVisible();

  await dialog.getByRole('button', { name: '關閉' }).click();
  await expect(dialog).toHaveCount(0);
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
