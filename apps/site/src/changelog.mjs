/**
 * The changelog of each Chatto product, newest first. An entry with `upcoming: true` is work on
 * `develop` that has not been released; it is shown without a version or date. Every text is
 * written in both languages. An OBS plugin or Chatto Themes entry names the Chatto release it comes
 * with (`chatto`): the site shows it once that release is published. The release notes include the
 * OBS plugin's entry. Released app entries are also attached to each GitHub Release as
 * `changelog.json` (`changelogJson.mjs`) for the app's update dialog.
 *
 * Write each item as one plain sentence. The only formatting is `backticks` for code (the site
 * and the app show it in a monospace font); no other Markdown.
 */

/** @typedef {{ en: string, 'zh-TW': string }} Text */
/** @typedef {{ kind: 'new' | 'improved' | 'fixed', items: Text[] }} Section */
/** @typedef {{ version?: string, date?: string, upcoming?: boolean, download?: boolean, chatto?: string, summary?: Text, sections: Section[] }} Entry */

const t = (en, zh) => ({ en, 'zh-TW': zh });

/** @type {Record<'app' | 'themes' | 'obs', Entry[]>} */
export const CHANGELOG = {
  app: [
    {
      upcoming: true,
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'When a new version is out, Chatto shows what changed in a dialog at startup; update, close it until next time, or skip that version',
              '有新版本時，Chatto 啟動後會用對話框列出更新內容，可以直接更新、這次先關閉，或略過這個版本',
            ),
            t(
              'Double-click a .chattotheme file to open it in Chatto, preview it and import it',
              '雙擊 .chattotheme 檔就會用 Chatto 開啟，預覽後即可匯入',
            ),
            t(
              'Set global shortcuts in Settings to show or hide the overlays, switch them to movable, pause new messages or clear the chat on screen, even while a game has focus',
              '設定頁可以設定全域快捷鍵：顯示或隱藏 Overlay、切換可移動、暫停新訊息、清空畫面上的聊天，玩遊戲時也能用',
            ),
            t(
              'Pause new messages on the overlays and in OBS, or clear the chat on screen, from the Outputs page',
              '輸出頁可以暫停 Overlay 和 OBS 的新訊息，或清空畫面上的聊天',
            ),
            t(
              'A getting-started list on the overview walks you through signing in, connecting and picking a theme',
              '總覽頁新增「開始使用」清單，帶你完成登入、連線和選主題',
            ),
          ],
        },
      ],
    },
    {
      version: 'v0.3.1',
      date: '2026-11-08',
      download: true,
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'Export diagnostics from Settings › About to attach to a bug report; sign-in details and chat messages are never included, and the channel name only when you choose',
              '設定「關於」可以匯出診斷資訊，回報問題時附上；不含登入資訊與聊天訊息，頻道名稱由你決定是否包含',
            ),
            t('Report a problem on GitHub straight from Settings › About', '設定「關於」可以直接到 GitHub 回報問題'),
          ],
        },
        {
          kind: 'improved',
          items: [
            t(
              'Chatto uses much less memory when the control panel is out of sight: after five minutes in the tray or minimized, the window is replaced with a fresh one that keeps the whole session',
              '控制台不在畫面上時記憶體用量大幅降低：縮到系統匣或最小化 5 分鐘後會換成新的視窗，聊天紀錄與兌換清單都還在',
            ),
          ],
        },
      ],
    },
    {
      version: 'v0.3.0',
      date: '2026-11-07',
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'Themes from Chatto’s official account show an Official badge on the Explore page',
              '探索頁上，Chatto 官方帳號分享的主題會顯示「官方」徽章',
            ),
            t(
              'Download a theme from the Explore page as a .chattotheme file, or publish straight from one',
              '探索頁的主題可以下載成 .chattotheme 檔，投稿時也能直接選一個 .chattotheme 檔',
            ),
            t(
              'The quiet-spell label can have its own text for each chat language',
              '沉寂後新留言的標籤可以為每種聊天室語言各設一段文字',
            ),
            t(
              'Give the desktop overlay and the alert overlay a background color and opacity, and fade the chat, on the Outputs page',
              '輸出頁可以替桌面 Overlay 和事件 Overlay 加上背景顏色與不透明度，也能調淡聊天室',
            ),
            t(
              'Apply a theme to the alert overlay straight from its card on the Themes page, or from compact mode',
              '主題頁的卡片和精簡模式可以直接把主題套用到事件 Overlay',
            ),
          ],
        },
        {
          kind: 'improved',
          items: [
            t(
              'Custom CSS can switch the words it adds to the chat language with :lang()',
              '自訂 CSS 加上的文字可以用 :lang() 跟著聊天室語言切換',
            ),
            t(
              'Custom CSS overrides a theme’s styles with the same selector, without a .chatto-root prefix',
              '自訂 CSS 用相同的選擇器就能覆蓋主題樣式，不必加 .chatto-root 前綴',
            ),
            t(
              'Themes always export as a .chattotheme file, named after the theme; old .json files still import',
              '主題一律匯出成 .chattotheme 檔，檔名就是主題名稱；舊的 .json 檔仍然可以匯入',
            ),
            t(
              'My Themes can fetch a theme you published from another computer, so you can change and update it here',
              '「我的主題」可以把在別台電腦發佈的主題取得到本機，在這裡修改並更新',
            ),
            t(
              'Publishing starts from a theme you made, and warns before sending an unchanged copy of someone else’s theme',
              '投稿時預設選你自己做的主題，並在送出別人主題的未修改副本前提醒',
            ),
            t('The control panel uses much less CPU while chat is busy', '聊天熱絡時，控制台佔用的 CPU 大幅降低'),
            t(
              'Faint text, viewer names, mentions and links are easier to read in light and dark mode',
              '亮色與暗色模式下，淡色文字、觀眾名稱、提及與連結都更容易閱讀',
            ),
            t(
              'In narrow or short windows, rows wrap instead of crowding, and the theme editor puts hints under their labels',
              '視窗較窄或較矮時，各頁的列會換行而不擠在一起，主題編輯器的說明改放在標籤下方',
            ),
            t(
              'The overview and title bar say when chat is connecting, reconnecting or failed, with a button to fix it',
              '總覽與標題列會顯示聊天室正在連線、重新連線或連線失敗，並提供前往處理的按鈕',
            ),
            t(
              'Installed and update badges on Explore cards stand out on any theme preview',
              '探索頁卡片上的「已安裝」「有更新」徽章，在任何主題預覽上都看得清楚',
            ),
            t('The tea cup keeps its brand colors in dark mode', '茶杯在暗色模式也維持品牌配色'),
          ],
        },
        {
          kind: 'fixed',
          items: [
            t('The delete confirmation button is readable in dark mode', '暗色模式下，刪除確認按鈕的文字看得清楚'),
            t('Uploaded frame images now show in the control panel’s previews', '控制台的預覽現在會顯示上傳的外框圖片'),
            t('Installing a shared theme updates its download count right away', '安裝分享主題後，下載次數會立即更新'),
            t(
              'New messages in a chat preview no longer scroll the control panel page',
              '聊天室預覽出現新訊息時，控制台頁面不會再跟著捲動',
            ),
          ],
        },
      ],
    },
    {
      version: 'v0.2.0',
      date: '2026-11-06',
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
