import { sampleEvent } from '@chatto/chat-ui';
import { expect, test } from '../fixtures';

test('redemptions list on the overview and the chat page, and closing one closes it on both', async ({
  panel,
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await panel.open('page=overview');
  const list = page.getByTestId('redemptions');
  await expect(page.getByText('還沒有人兌換獎勵')).toBeVisible();

  await panel.emit(sampleEvent('twitch:redemption'), sampleEvent('twitch:auto-redemption'));
  await expect(list.getByRole('listitem')).toHaveCount(2);
  // Newest first: the Twitch reward, then the streamer's own with what the viewer typed.
  await expect(list.getByRole('listitem').first()).toContainText('隨機解鎖表情符號');
  await expect(list.getByRole('listitem').last()).toContainText('點一首歌');
  await expect(list.getByRole('listitem').last()).toContainText('500 點');
  await expect(list.getByRole('listitem').last()).toContainText('夜に駆ける');

  await list.getByRole('button', { name: '關閉「點一首歌」' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(1);

  await panel.nav('聊天室').click();
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list.getByText('點一首歌')).toHaveCount(0);
  await list.getByRole('button', { name: '關閉「隨機解鎖表情符號」' }).click();
  await expect(page.getByText('還沒有人兌換獎勵')).toBeVisible();

  await panel.nav('總覽').click();
  await expect(page.getByText('還沒有人兌換獎勵')).toBeVisible();
});

test('an older sign-in is asked to sign in again for redemptions', async ({ panel, page }) => {
  await panel.open('page=overview');
  await panel.setState({ auth: { status: 'signed-in', login: 'shiraine_ciel', redemptionScope: false } });
  await expect(page.getByText('重新登入以啟用兌換提醒')).toBeVisible();

  await panel.nav('連線').click();
  await expect(page.getByTestId('redemption-reauth')).toBeVisible();
  await expect(page.getByText('權限：讀取聊天室', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '重新登入' }).click();
  // The device code shows like any sign-in; the account stays signed in until then.
  await expect(page.getByText('MATCHA42')).toBeVisible();
  await expect(page.getByText('權限：讀取聊天室、忠誠點數兌換')).toBeVisible({ timeout: 8000 });
  await expect(page.getByTestId('redemption-reauth')).toHaveCount(0);
});

test("watching someone else's channel explains that redemptions only come to the streamer", async ({ panel, page }) => {
  await panel.open('page=overview');
  await panel.setState({ channel: { login: 'okome_rice', state: 'connected' } });
  // Nothing can arrive, so the overview leaves the list out.
  await expect(page.getByTestId('redemptions')).toHaveCount(0);
  await expect(page.getByText('還沒有人兌換獎勵')).toHaveCount(0);

  await panel.nav('連線').click();
  await expect(page.getByText('只有用實況主帳號登入時才能收到兌換')).toBeVisible();

  await panel.nav('提醒').click();
  await expect(page.getByTestId('redemption-note')).toHaveText('只有用實況主帳號登入時才能收到兌換');
});

test('redemptions have one alert switch and can stay out of OBS', async ({ panel, page }) => {
  await panel.open('page=alerts');
  const rule = page.locator('[data-alert-rule="twitch:redemption"]');
  await expect(rule.getByRole('switch', { name: '提醒忠誠點數兌換' })).toHaveAttribute('aria-checked', 'true');
  // Twitch's own rewards share this switch instead of having their own.
  await expect(page.locator('[data-alert-rule="twitch:auto-redemption"]')).toHaveCount(0);

  const obs = rule.getByRole('switch', { name: '顯示在 OBS' });
  await expect(obs).toHaveAttribute('aria-checked', 'true');
  await obs.click();
  await expect(obs).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('redemption-note')).toHaveCount(0);
});

test('in a short window the redemptions take the column only while there are some', async ({ panel, page }) => {
  await page.setViewportSize({ width: 960, height: 640 });
  await panel.open('page=overview');
  const activity = page.getByRole('heading', { name: '最近活動' });
  const redemptions = page.getByRole('heading', { name: '兌換紀錄' });
  await expect(activity).toBeVisible();
  await expect(redemptions).toBeHidden();

  await panel.emit(sampleEvent('twitch:redemption'));
  await expect(redemptions).toBeVisible();
  await expect(activity).toBeHidden();

  await page.getByRole('button', { name: '關閉「點一首歌」' }).click();
  await expect(activity).toBeVisible();
});
