/**
 * The changelog of each Chatto product, newest first. An entry with `upcoming: true` is work on
 * `develop` that has not been released; it is shown without a version or date. Every text is
 * written in every language (English, Traditional Chinese, Japanese). An OBS plugin or Chatto
 * Themes entry names the Chatto release it comes with (`chatto`): the site shows it once that
 * release is published. The release notes include the OBS plugin's entry. Released app entries
 * are also attached to each GitHub Release as `changelog.json` (`changelogJson.mjs`) for the
 * app's update dialog.
 *
 * Write each item as one plain sentence. The only formatting is `backticks` for code (the site
 * and the app show it in a monospace font); no other Markdown.
 */

/** @typedef {{ en: string, 'zh-TW': string, ja: string }} Text */
/** @typedef {{ kind: 'new' | 'improved' | 'fixed', items: Text[] }} Section */
/** @typedef {{ version?: string, date?: string, upcoming?: boolean, download?: boolean, chatto?: string, summary?: Text, sections: Section[] }} Entry */

/** @type {(en: string, zh: string, ja: string) => Text} */
const t = (en, zh, ja) => ({ en, 'zh-TW': zh, ja });

/** @type {Record<'app' | 'themes' | 'obs', Entry[]>} */
export const CHANGELOG = {
  app: [
    {
      version: 'v0.4.0',
      date: '2026-11-09',
      download: true,
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'Chatto speaks Japanese: the app, event texts on the overlays and OBS, the installer, the OBS plugin and this site',
              'Chatto 支援日文：App、Overlay 與 OBS 的事件文字、安裝程式、OBS 外掛與網站都有日文版',
              'Chatto が日本語に対応しました。アプリ、オーバーレイと OBS のイベント文、インストーラー、OBS プラグイン、このサイトが日本語で使えます',
            ),
            t(
              'When a new version is out, Chatto shows what changed in a dialog at startup; update, close it until next time, or skip that version',
              '有新版本時，Chatto 啟動後會用對話框列出更新內容，可以直接更新、這次先關閉，或略過這個版本',
              '新しいバージョンがあると、起動時にダイアログで変更内容を表示し、すぐにアップデートするか、今回は閉じるか、そのバージョンをスキップするかを選べます',
            ),
            t(
              'Double-click a .chattotheme file to open it in Chatto, preview it and import it',
              '雙擊 .chattotheme 檔就會用 Chatto 開啟，預覽後即可匯入',
              '.chattothemeファイルをダブルクリックするとChattoで開き、プレビューしてからインポートできます',
            ),
            t(
              'Set global shortcuts in Settings to show or hide the overlays, switch them to movable, pause new messages or clear the chat on screen, even while a game has focus',
              '設定頁可以設定全域快捷鍵：顯示或隱藏 Overlay、切換可移動、暫停新訊息、清空畫面上的聊天，玩遊戲時也能用',
              '設定でグローバルショートカットを割り当てると、ゲーム中でもオーバーレイの表示・非表示、移動可能への切り替え、新着メッセージの一時停止、画面上のチャットのクリアができます',
            ),
            t(
              'Pause new messages on the overlays and in OBS, or clear the chat on screen, from the Outputs page',
              '輸出頁可以暫停 Overlay 和 OBS 的新訊息，或清空畫面上的聊天',
              '「出力」ページで、オーバーレイとOBSの新着メッセージを一時停止したり、画面上のチャットをクリアしたりできます',
            ),
            t(
              'A getting-started list on the overview walks you through signing in, connecting and picking a theme',
              '總覽頁新增「開始使用」清單，帶你完成登入、連線和選主題',
              'ホームに「はじめに」リストを追加し、ログイン、接続、テーマ選びまでを案内します',
            ),
          ],
        },
      ],
    },
    {
      version: 'v0.3.1',
      date: '2026-11-08',
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'Export diagnostics from Settings › About to attach to a bug report; sign-in details and chat messages are never included, and the channel name only when you choose',
              '設定「關於」可以匯出診斷資訊，回報問題時附上；不含登入資訊與聊天訊息，頻道名稱由你決定是否包含',
              '「設定」›「情報」から不具合報告に添付する診断情報をエクスポートでき、ログイン情報とチャットメッセージは含まれず、チャンネル名を含めるかどうかは自分で選べます',
            ),
            t(
              'Report a problem on GitHub straight from Settings › About',
              '設定「關於」可以直接到 GitHub 回報問題',
              '「設定」›「情報」から直接GitHubで問題を報告できます',
            ),
          ],
        },
        {
          kind: 'improved',
          items: [
            t(
              'Chatto uses much less memory when the control panel is out of sight: after five minutes in the tray or minimized, the window is replaced with a fresh one that keeps the whole session',
              '控制台不在畫面上時記憶體用量大幅降低：縮到系統匣或最小化 5 分鐘後會換成新的視窗，聊天紀錄與兌換清單都還在',
              'コントロールパネルが画面に出ていないときのメモリ使用量を大幅に減らし、タスクトレイへの格納や最小化から5分経つと、チャット履歴や引き換えの一覧を保ったまま新しいウィンドウに置き換えます',
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
              '「見つける」ページで、Chatto公式アカウントが共有したテーマに「公式」バッジが表示されます',
            ),
            t(
              'Download a theme from the Explore page as a .chattotheme file, or publish straight from one',
              '探索頁的主題可以下載成 .chattotheme 檔，投稿時也能直接選一個 .chattotheme 檔',
              '「見つける」ページのテーマを.chattothemeファイルとしてダウンロードしたり、.chattothemeファイルから直接投稿したりできます',
            ),
            t(
              'The quiet-spell label can have its own text for each chat language',
              '沉寂後新留言的標籤可以為每種聊天室語言各設一段文字',
              '静寂アラートのラベルに、チャットの言語ごとに別の文言を設定できます',
            ),
            t(
              'Give the desktop overlay and the alert overlay a background color and opacity, and fade the chat, on the Outputs page',
              '輸出頁可以替桌面 Overlay 和事件 Overlay 加上背景顏色與不透明度，也能調淡聊天室',
              '「出力」ページで、デスクトップオーバーレイとアラートオーバーレイに背景色と不透明度を設定したり、チャットを薄くしたりできます',
            ),
            t(
              'Apply a theme to the alert overlay straight from its card on the Themes page, or from compact mode',
              '主題頁的卡片和精簡模式可以直接把主題套用到事件 Overlay',
              '「テーマ」ページのカードやコンパクトモードから、テーマを直接アラートオーバーレイに適用できます',
            ),
          ],
        },
        {
          kind: 'improved',
          items: [
            t(
              'Custom CSS can switch the words it adds to the chat language with :lang()',
              '自訂 CSS 加上的文字可以用 :lang() 跟著聊天室語言切換',
              'カスタム CSSで追加した文字を、:lang()でチャットの言語に合わせて切り替えられます',
            ),
            t(
              'Custom CSS overrides a theme’s styles with the same selector, without a .chatto-root prefix',
              '自訂 CSS 用相同的選擇器就能覆蓋主題樣式，不必加 .chatto-root 前綴',
              'カスタム CSSは同じセレクターでテーマのスタイルを上書きでき、.chatto-rootを前に付ける必要はありません',
            ),
            t(
              'Themes always export as a .chattotheme file, named after the theme; old .json files still import',
              '主題一律匯出成 .chattotheme 檔，檔名就是主題名稱；舊的 .json 檔仍然可以匯入',
              'テーマは常にテーマ名をファイル名とした.chattothemeファイルとしてエクスポートされ、以前の.jsonファイルも引き続きインポートできます',
            ),
            t(
              'My Themes can fetch a theme you published from another computer, so you can change and update it here',
              '「我的主題」可以把在別台電腦發佈的主題取得到本機，在這裡修改並更新',
              '「マイテーマ」で、別のパソコンから投稿したテーマを取得し、このパソコンで編集して更新できます',
            ),
            t(
              'Publishing starts from a theme you made, and warns before sending an unchanged copy of someone else’s theme',
              '投稿時預設選你自己做的主題，並在送出別人主題的未修改副本前提醒',
              '投稿時は自分で作ったテーマが最初に選ばれ、ほかの人のテーマを変更しないまま送ろうとすると確認します',
            ),
            t(
              'The control panel uses much less CPU while chat is busy',
              '聊天熱絡時，控制台佔用的 CPU 大幅降低',
              'チャットが盛り上がっているときのコントロールパネルのCPU使用率を大幅に減らしました',
            ),
            t(
              'Faint text, viewer names, mentions and links are easier to read in light and dark mode',
              '亮色與暗色模式下，淡色文字、觀眾名稱、提及與連結都更容易閱讀',
              'ライトモードとダークモードで、薄い文字、視聴者名、メンション、リンクが読みやすくなりました',
            ),
            t(
              'In narrow or short windows, rows wrap instead of crowding, and the theme editor puts hints under their labels',
              '視窗較窄或較矮時，各頁的列會換行而不擠在一起，主題編輯器的說明改放在標籤下方',
              'ウィンドウの幅や高さが小さいときは行が詰まらずに折り返し、テーマエディターでは説明がラベルの下に表示されます',
            ),
            t(
              'The overview and title bar say when chat is connecting, reconnecting or failed, with a button to fix it',
              '總覽與標題列會顯示聊天室正在連線、重新連線或連線失敗，並提供前往處理的按鈕',
              'ホームとタイトルバーに、チャットの接続中、再接続中、接続失敗が表示され、対処するためのボタンも表示されます',
            ),
            t(
              'Installed and update badges on Explore cards stand out on any theme preview',
              '探索頁卡片上的「已安裝」「有更新」徽章，在任何主題預覽上都看得清楚',
              '「見つける」ページのカードにある「インストール済み」「アップデートあり」バッジが、どのテーマのプレビューの上でも見やすくなりました',
            ),
            t(
              'The tea cup keeps its brand colors in dark mode',
              '茶杯在暗色模式也維持品牌配色',
              'ティーカップがダークモードでもブランドカラーのまま表示されます',
            ),
          ],
        },
        {
          kind: 'fixed',
          items: [
            t(
              'The delete confirmation button is readable in dark mode',
              '暗色模式下，刪除確認按鈕的文字看得清楚',
              'ダークモードで削除確認ボタンの文字が読みやすくなりました',
            ),
            t(
              'Uploaded frame images now show in the control panel’s previews',
              '控制台的預覽現在會顯示上傳的外框圖片',
              'アップロードしたフレーム画像が、コントロールパネルのプレビューに表示されるようになりました',
            ),
            t(
              'Installing a shared theme updates its download count right away',
              '安裝分享主題後，下載次數會立即更新',
              '共有テーマをインストールすると、ダウンロード数がすぐに更新されるようになりました',
            ),
            t(
              'New messages in a chat preview no longer scroll the control panel page',
              '聊天室預覽出現新訊息時，控制台頁面不會再跟著捲動',
              'チャットのプレビューに新着メッセージが届いても、コントロールパネルのページがスクロールしなくなりました',
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
              'ほかの人が作ったテーマを閲覧、インストール、共有できる「見つける」ページを追加しました',
            ),
            t(
              'The theme editor’s preview can show just the samples for the section you’re editing',
              '主題編輯器的預覽可以只看目前區塊的範例',
              'テーマエディターのプレビューで、編集中のセクションのサンプルだけを表示できます',
            ),
            t(
              'Channel points redemptions show on the overlays and in OBS, with a list in the app you can clear as you go',
              '忠誠點數兌換會顯示在 Overlay 與 OBS，App 裡也有兌換紀錄，處理完可以逐筆關掉',
              'チャンネルポイントの引き換えがオーバーレイとOBSに表示され、アプリ内の一覧からは対応済みのものを1件ずつ閉じられます',
            ),
          ],
        },
        {
          kind: 'improved',
          items: [
            t(
              'One Accounts page for your Chatto account and your streaming platforms, opened from the card at the bottom of the sidebar',
              '新的「帳號」頁集中管理 Chatto 帳號與直播平台，左側欄底部的帳號卡也能直接打開',
              'Chattoアカウントと配信プラットフォームをまとめて管理する「アカウント」ページを追加し、サイドバー下部のアカウントカードからも開けます',
            ),
            t(
              'Fill in your own channel with one click',
              '一鍵填入自己的頻道',
              '自分のチャンネルをワンクリックで入力できます',
            ),
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
              '設定を「一般」「外観」「詳細」「情報」の4つに分けました',
            ),
            t(
              'Read the disclaimer and licenses in the app and the installer',
              'App 與安裝檔裡可以查看免責聲明與授權',
              'アプリとインストーラーで免責事項とライセンスを確認できます',
            ),
          ],
        },
        {
          kind: 'fixed',
          items: [
            t(
              'When the port is already in use, Chatto explains why instead of closing',
              '連接埠被占用時說明原因，不再直接關閉',
              'ポートがすでに使われているときは、終了せずに理由を説明します',
            ),
            t(
              'Update errors show a short explanation',
              '更新失敗時顯示簡短的說明',
              'アップデートに失敗したときは短い説明を表示します',
            ),
          ],
        },
      ],
    },
    {
      version: 'v0.1.0',
      date: '2026-11-04',
      summary: t('The first public version.', '第一個公開版本。', '最初の公開バージョンです。'),
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'A transparent, always-on-top desktop overlay that lets clicks pass through',
              '透明、置頂、滑鼠可穿透的桌面 Overlay',
              'クリックが通り抜ける、透明で常に最前面のデスクトップオーバーレイ',
            ),
            t(
              'OBS browser source and the “Chatto Chat” plugin',
              'OBS 瀏覽器來源與「Chatto 聊天室」外掛',
              'OBS ブラウザソースと「Chatto Chat」プラグイン',
            ),
            t(
              'Seven built-in themes and the theme editor',
              '七種內建主題與主題編輯器',
              '7つの内蔵テーマとテーマエディター',
            ),
            t(
              'Alerts for new messages after a lull, and the alert overlay',
              '新留言提醒與事件 Overlay',
              '静寂アラートとアラートオーバーレイ',
            ),
            t('English and Traditional Chinese', '繁體中文與英文介面', '英語と繁体字中国語のインターフェース'),
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
        'テーマ共有はChatto v0.2.0とともに公開され、アプリの「見つける」ページで使えます。',
      ),
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'Browse themes by category and tag, or open one by its eight-character code',
              '依類別與標籤瀏覽主題，或輸入 8 碼代碼直接開啟',
              'カテゴリーとタグでテーマを閲覧したり、8文字のコードを入力して直接開いたりできます',
            ),
            t(
              'Install with one click and get a notice when an installed theme is updated',
              '一鍵安裝，安裝過的主題有新版時提示',
              'ワンクリックでインストールでき、インストールしたテーマが更新されるとお知らせします',
            ),
            t(
              'Share your own themes, and update them later',
              '分享自己做的主題，之後也能更新',
              '自分で作ったテーマを共有し、あとから更新できます',
            ),
            t('Like and report themes', '按讚與檢舉', 'テーマへのいいねと通報'),
            t(
              'Sign in with Twitch, Google or Discord, separately from your chat connection',
              '用 Twitch、Google 或 Discord 登入，和聊天室的連線分開',
              'チャットの接続とは別に、Twitch、Google、Discordでログインできます',
            ),
          ],
        },
      ],
    },
  ],
  obs: [
    {
      version: 'v0.2.0',
      date: '2026-11-09',
      chatto: 'v0.4.0',
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'The source’s settings and the waiting screen in Japanese',
              '來源的設定與等待畫面支援日文',
              'ソースの設定と待機画面が日本語に対応しました',
            ),
          ],
        },
      ],
    },
    {
      version: 'v0.1.0',
      date: '2026-11-04',
      chatto: 'v0.1.0',
      summary: t(
        'The first version, included with Chatto v0.1.0.',
        '第一個版本，隨 Chatto v0.1.0 附上。',
        '最初のバージョンで、Chatto v0.1.0に同梱されています。',
      ),
      sections: [
        {
          kind: 'new',
          items: [
            t(
              'The “Chatto Chat” source: no URL to paste',
              '「Chatto 聊天室」來源，不用貼網址',
              'URLを貼る必要がない「Chatto Chat」ソース',
            ),
            t(
              'Pick a theme for each source, or follow Chatto’s OBS theme',
              '每個來源各選一個主題，或跟隨 Chatto 的 OBS 主題',
              'ソースごとにテーマを選ぶか、ChattoのOBS用テーマに従うかを選べます',
            ),
            t(
              'A waiting screen with the tea cup while Chatto is closed',
              'Chatto 沒開時顯示茶杯的等待畫面',
              'Chattoを閉じている間はティーカップの待機画面を表示します',
            ),
          ],
        },
      ],
    },
  ],
};
