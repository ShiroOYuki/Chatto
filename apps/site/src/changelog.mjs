/**
 * The changelog of each Chatto product, newest first. An entry with `upcoming: true` is work on
 * `develop` that has not been released; it is shown without a version or date. Every text is
 * written in both languages. An OBS plugin or Chatto Themes entry names the Chatto release it comes
 * with (`chatto`): the site shows it once that release is published. The release notes include the
 * OBS plugin's entry.
 */

/** @typedef {{ en: string, 'zh-TW': string }} Text */
/** @typedef {{ kind: 'new' | 'improved' | 'fixed', items: Text[] }} Section */
/** @typedef {{ version?: string, date?: string, upcoming?: boolean, download?: boolean, chatto?: string, summary?: Text, sections: Section[] }} Entry */

const t = (en, zh) => ({ en, 'zh-TW': zh });

/** @type {Record<'app' | 'themes' | 'obs', Entry[]>} */
export const CHANGELOG = {
  app: [
    {
      version: 'v0.2.0',
      date: '2026-11-06',
      download: true,
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'An Explore page to browse, install and share themes made by others',
              '新增「探索」頁：瀏覽、安裝、分享其他人做的主題',
            ),
            t(
              'The theme editor’s preview can show just the samples for the section you’re editing',
              '主題編輯器的預覽可以只看目前區塊的範例',
            ),
            t(
              'Channel points redemptions show on the overlays and in OBS, with a list in the app you can clear as you go',
              '忠誠點數兌換會顯示在 Overlay 與 OBS，App 裡也有兌換紀錄，處理完可以逐筆關掉',
            ),
          ],
        },
        {
          kind: 'improved',
          items: [
            t(
              'One Accounts page for your Chatto account and your streaming platforms, opened from the card at the bottom of the sidebar',
              '新的「帳號」頁集中管理 Chatto 帳號與直播平台，左側欄底部的帳號卡也能直接打開',
            ),
            t('Fill in your own channel with one click', '一鍵填入自己的頻道'),
          ],
        },
      ],
    },
    {
      version: 'v0.1.1',
      date: '2026-11-04',
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'Settings are split into General, Appearance, Advanced and About',
              '設定頁分成一般、外觀、進階、關於四個區塊',
            ),
            t('Read the disclaimer and licenses in the app and the installer', 'App 與安裝檔裡可以查看免責聲明與授權'),
          ],
        },
        {
          kind: 'fixed',
          items: [
            t(
              'When the port is already in use, Chatto explains why instead of closing',
              '連接埠被占用時說明原因，不再直接關閉',
            ),
            t('Update errors show a short explanation', '更新失敗時顯示簡短的說明'),
          ],
        },
      ],
    },
    {
      version: 'v0.1.0',
      date: '2026-11-04',
      summary: t('The first public version.', '第一個公開版本。'),
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'A transparent, always-on-top desktop overlay that lets clicks pass through',
              '透明、置頂、滑鼠可穿透的桌面 Overlay',
            ),
            t('OBS browser source and the “Chatto Chat” plugin', 'OBS 瀏覽器來源與「Chatto 聊天室」外掛'),
            t('Seven built-in themes and the theme editor', '七種內建主題與主題編輯器'),
            t('Alerts for new messages after a lull, and the alert overlay', '新留言提醒與事件 Overlay'),
            t('English and Traditional Chinese', '繁體中文與英文介面'),
          ],
        },
      ],
    },
  ],
  themes: [
    {
      version: 'v1.0',
      date: '2026-11-06',
      chatto: 'v0.2.0',
      summary: t(
        'Theme sharing opens with Chatto v0.2.0, on its Explore page.',
        '主題分享隨 Chatto v0.2.0 推出，在 App 的「探索」頁使用。',
      ),
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'Browse themes by category and tag, or open one by its eight-character code',
              '依類別與標籤瀏覽主題，或輸入 8 碼代碼直接開啟',
            ),
            t(
              'Install with one click and get a notice when an installed theme is updated',
              '一鍵安裝，安裝過的主題有新版時提示',
            ),
            t('Share your own themes, and update them later', '分享自己做的主題，之後也能更新'),
            t('Like and report themes', '按讚與檢舉'),
            t(
              'Sign in with Twitch, Google or Discord, separately from your chat connection',
              '用 Twitch、Google 或 Discord 登入，和聊天室的連線分開',
            ),
          ],
        },
      ],
    },
  ],
  obs: [
    {
      version: 'v0.1.0',
      date: '2026-11-04',
      chatto: 'v0.1.0',
      summary: t('The first version, included with Chatto v0.1.0.', '第一個版本，隨 Chatto v0.1.0 附上。'),
      sections: [
        {
          kind: 'new',
          items: [
            t('The “Chatto Chat” source: no URL to paste', '「Chatto 聊天室」來源，不用貼網址'),
            t(
              'Pick a theme for each source, or follow Chatto’s OBS theme',
              '每個來源各選一個主題，或跟隨 Chatto 的 OBS 主題',
            ),
            t('A waiting screen with the tea cup while Chatto is closed', 'Chatto 沒開時顯示茶杯的等待畫面'),
          ],
        },
      ],
    },
  ],
};
