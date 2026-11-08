/**
 * Words of the website, apart from the legal texts (those come from `@chatto/share`) and the
 * changelog (`changelog.mjs`). Every language has the same shape.
 */

export const GITHUB_URL = 'https://github.com/ShiroOYuki/Chatto';
export const DOWNLOAD_URL = `${GITHUB_URL}/releases/latest`;
export const ISSUES_URL = `${GITHUB_URL}/issues`;
export const SUPPORT_EMAIL = 'support@chattolive.com';

/** The built-in themes, in the order the app lists them. Previews are drawn by `build.mjs`. */
export const THEME_IDS = ['matcha-glass', 'washi', 'bubble', 'outline', 'noren', 'terminal', 'tea-leaf'];

export const CONTENT = {
  en: {
    lang: 'en',
    /** Joins sentences: a space in English, nothing in Chinese or Japanese. */
    space: ' ',
    language: 'Language',
    darkMode: 'Dark mode',
    nav: {
      label: 'Main',
      home: 'Home',
      themes: 'Themes',
      guide: 'Guide',
      faq: 'FAQ',
      changelog: 'Changelog',
      privacy: 'Privacy',
      terms: 'Terms',
    },
    download: 'Download for Windows',
    source: 'GitHub',
    note: 'Free and open source, for Windows 10 and later',
    more: 'More',
    sample: {
      greeting: 'Evening! What are we playing today?',
      hello: 'Evening!',
      boss: 'This boss is so hard',
      chest: 'there’s a chest on the left',
      raid: 'ShiroLive is raiding with 42 viewers!',
      raidTag: 'Raid',
    },
    home: {
      title: 'Chatto — Live chat overlay for streamers',
      description:
        'Chatto puts your stream chat on your desktop as a see-through overlay and in OBS as a themed chat source. Free and open source for Windows.',
      tagline: 'Chat on your desktop\nand in OBS',
      lead: 'Display chat as a transparent desktop overlay or add it to OBS. Customize both with your own themes.',
      featuresTitle: 'What it does',
      features: [
        {
          icon: 'monitor',
          title: 'On top of your game, out of the way',
          body: 'The overlay stays above everything and clicks pass straight through. Unlock it to move or resize it, then drag the edges.',
        },
        {
          icon: 'obs',
          title: 'Pick it as a source in OBS',
          body: 'Add a “Chatto Chat” source, with no URL to paste, and give each source its own theme. While Chatto is closed, it shows a waiting screen.',
        },
        {
          icon: 'sliders',
          title: 'Tune every part',
          body: 'Padding, corners, borders, image frames and role styles, with the result right in front of you. Write CSS if you like, and export a theme to share it.',
        },
        {
          icon: 'bell',
          title: 'Alerts only you see',
          body: 'Raids and subs pop up as cards in a corner of your desktop, and you get a nudge when someone writes after chat has gone quiet. None of it shows on stream.',
        },
      ],
      themesTitle: 'Seven built-in themes,\nall of them adjustable',
      themesMore: 'See all themes',
      themesLead:
        'Pick one to stick on and change it if it isn’t quite right. The desktop and OBS can use different ones.',
      themesSheet: 'Chatto theme stickers',
      themesBlank: 'Draw your own',
      themesBlankNote: 'Custom CSS',
      guideTitle: 'Before you go live',
      guideMore: 'Read the full guide',
      steps: [
        {
          title: 'Download and install',
          body: 'To use Chatto in OBS, check “Install the OBS plugin” in the installer.',
        },
        {
          title: 'Connect your channel',
          body: 'Sign in to your streaming platform on the Accounts page and chat appears in the preview.',
        },
        { title: 'Choose where it shows', body: 'Turn on the desktop overlay, or add a “Chatto Chat” source in OBS.' },
      ],
      faqTitle: 'Asked a lot',
      faqOther: 'Something else?',
      faqMore: 'See all questions',
      closing: 'Download Chatto and go live',
      latest: (version, date) => `Latest version ${version}, released ${date}.`,
      latestMore: 'See what changed',
      heroCaption: 'Matcha Glass, tonight’s chat',
      heroSticky: 'The checkered part is see-through. Your game shows through it, and so do your clicks.',
    },
    specimen: {
      unlocked: 'Unlocked, drag to adjust',
      obsTitle: 'Properties for “Chatto Chat”',
      theme: 'Theme',
      width: 'Width',
      height: 'Height',
      connected: 'Connected to Chatto',
      radius: 'Corners',
      opacity: 'Background opacity',
      border: 'Border color',
      reply: 'love this song',
      raidTitle: 'ShiroLive is raiding',
      raidBody: 'with 42 viewers',
      sub: 'subscribed for 3 months',
    },
    themes: {
      title: 'Themes',
      description: 'Chatto’s seven built-in chat themes and what you can change in each one.',
      lead: 'Start from one of seven built-in themes, then adjust it until it looks right.',
      jump: 'Themes',
      default: 'Default',
      colors: 'Colors',
      shape: 'Shape',
      motion: 'Motion',
      blank: { name: 'Blank', body: 'No styles at all, only the structure and classes, for writing CSS from scratch.' },
      customTitle: 'Customize',
      customBody:
        'The theme editor shows a sample of every element at once, so you see each change right away. The desktop overlay and OBS can each use their own theme.',
      custom: [
        'Padding for each side, radius for each corner, borders, shadow and blur',
        'Nine-slice image frames (PNG, WebP, GIF)',
        'Separate styles for moderators, VIPs and subscribers',
        'Styles and wording for subs, raids and other events',
        'Custom CSS with autocomplete and an inspector',
        'Export and import .chattotheme files, images included',
      ],
      list: {
        'matcha-glass': {
          name: 'Matcha Glass',
          idea: 'A glass of iced matcha with light shining through',
          colors: 'See-through deep green, pale mint names, pale green text',
          shape: '12px corners and a thin light border',
          motion: 'Fade in',
        },
        washi: {
          name: 'Washi',
          idea: 'Messages written on washi paper',
          colors: 'Rice paper, ink text, tea-brown names, vermilion accents',
          shape: 'Almost square corners, Noto Serif TC',
          motion: 'Fade in',
        },
        bubble: {
          name: 'Bubbles',
          idea: 'Chat bubbles on a phone',
          colors: 'Pale coral bubbles, dark tea text, coral accents',
          shape: 'Large corners with one tucked in; events get a border and a tilted sticker',
          motion: 'Pop in',
        },
        outline: {
          name: 'Outline',
          idea: 'Game subtitles',
          colors: 'White text with a black outline, mint names, gold accents',
          shape: 'No background, only text, a little larger',
          motion: 'Fade in',
        },
        noren: {
          name: 'Noren',
          idea: 'The curtain at a shop’s door',
          colors: 'Indigo cloth, names on a deeper block, gold accents',
          shape: 'Name and message as two blocks, 6px corners',
          motion: 'Slide in from the left',
        },
        terminal: {
          name: 'Terminal',
          idea: 'A developer’s terminal',
          colors: 'Near-black panel, light grey text, teal names',
          shape: 'Monospace, an @ before names, timestamps, one panel',
          motion: 'None',
        },
        'tea-leaf': {
          name: 'Tea Leaf',
          idea: 'Chatto’s own look',
          colors: 'Dark ground, a pale matcha frame, sakura accents',
          shape: 'A nine-slice image frame with two leaves at opposite corners',
          motion: 'Pop in',
        },
      },
    },
    guide: {
      title: 'Guide',
      description: 'Install Chatto, connect your channel and put chat on your desktop and in OBS.',
      lead: 'Install Chatto, connect your channel, and put chat on your desktop and in OBS.',
      toc: 'On this page',
      step: 'Step',
      sections: [
        {
          id: 'install',
          title: 'Install',
          body: [
            'Download the installer and run it. To use Chatto in OBS, check “Install the OBS plugin”. You can also install it later on the Outputs page.',
          ],
          note: 'Chatto checks for new versions by itself and tells you in the title bar. It downloads only after you agree.',
        },
        {
          id: 'connect',
          title: 'Connect your channel',
          steps: [
            'Open the Accounts page and click Sign in on your streaming platform.',
            'Your browser opens the platform’s authorization page. Enter the code Chatto shows you.',
            'Back in Chatto, chat appears in the preview on the Chat page.',
          ],
        },
        {
          id: 'overlay',
          title: 'Desktop overlay',
          body: [
            'A transparent chat just for you. It stays above every window and lets clicks pass through. Turn it on in Outputs, click Adjust, then drag it to move and drag its edges to resize. Click “Finish adjusting” when you’re done.',
          ],
          tips: [
            {
              title: 'Use borderless windowed mode',
              body: 'Exclusive fullscreen covers every always-on-top window, including the overlay.',
            },
            {
              title: 'Use game or window capture in OBS',
              body: 'Display capture records the overlay into your stream too.',
            },
          ],
        },
        {
          id: 'obs',
          title: 'Add it to OBS',
          cards: [
            {
              title: 'With the OBS plugin',
              badge: 'Recommended',
              body: 'In OBS, add a “Chatto Chat” source. There’s no URL to paste, and each source can use its own theme. While Chatto is closed, the source shows a waiting screen.',
            },
            {
              title: 'With a browser source',
              steps: [
                'In OBS, add a “Browser” source.',
                'Paste the URL from the Outputs page. 420 wide by 600 tall works well.',
                'Check “Refresh browser when scene becomes active” for more stability.',
              ],
            },
          ],
        },
        {
          id: 'theme',
          title: 'Tune a theme',
          body: [
            'On the Themes page, duplicate a built-in theme and open the editor. Pick a section on the left; the preview on the right shows samples of every element and event. Changes stay in a draft until you click Save. On the Outputs page, choose a theme for the desktop overlay and for OBS.',
          ],
          link: 'See all built-in themes',
        },
        {
          id: 'alerts',
          title: 'Alerts only you see',
          cards: [
            {
              title: 'New message after a lull',
              body: 'When someone writes after chat has been quiet for a while (2 minutes by default, 30 seconds to 30 minutes), the desktop overlay marks the message and plays a sound.',
            },
            {
              title: 'Alert overlay',
              body: 'Subs, raids and other events pop up as cards in the top-right corner of your desktop. Choose which events on the Alerts page.',
            },
          ],
          note: 'Neither appears in OBS.',
        },
      ],
      stuck: 'Still stuck?',
      stuckBody: 'Check the FAQ, or send an email.',
      email: 'Email us',
    },
    faq: {
      title: 'FAQ',
      description: 'Answers to common questions about Chatto’s desktop overlay, OBS plugin and themes.',
      lead: 'Can’t find your answer? Write to support@chattolive.com.',
      groups: [
        {
          id: 'basics',
          title: 'Basics',
          items: [
            {
              q: 'Does Chatto cost anything?',
              a: 'No. Chatto is free, open source software under the GPL-3.0. All of its source code is on GitHub.',
            },
            { q: 'Which streaming platforms does it support?', a: 'Twitch for now. YouTube and Kick are planned.' },
            { q: 'Does it run on macOS?', a: 'Not yet. Chatto runs on Windows 10 and later.' },
            {
              q: 'How do I update?',
              a: 'Chatto checks for new versions when it starts and every six hours, and tells you in the title bar and under Settings › About. It downloads only after you agree, then installs when you click “Restart and update” or the next time you quit.',
            },
          ],
        },
        {
          id: 'overlay',
          title: 'Desktop overlay',
          items: [
            {
              q: 'Will the overlay get in the way of my game?',
              a: 'No. Clicks pass straight through it. You can only drag it after clicking Adjust on the Outputs page.',
            },
            {
              q: 'I can’t see the overlay in fullscreen games',
              a: 'Exclusive fullscreen covers every always-on-top window. Switch the game to borderless windowed mode.',
            },
            {
              q: 'The overlay shows up in my stream',
              a: 'Display capture records everything on screen, the overlay included. Use game capture or window capture instead.',
            },
          ],
        },
        {
          id: 'obs',
          title: 'OBS',
          items: [
            {
              q: 'Do deleted messages stay on stream?',
              a: 'No. When a moderator deletes a message, bans someone or clears chat, the messages leave the overlay and OBS right away.',
            },
            {
              q: 'What does OBS show while Chatto is closed?',
              a: 'The “Chatto Chat” source shows a waiting screen with the tea cup, and connects by itself once Chatto opens.',
            },
            {
              q: 'The plugin installer says OBS is running',
              a: 'Close OBS, then click Install plugin on the Outputs page again.',
            },
            {
              q: 'Plugin or browser source?',
              a: 'Use the plugin if you can: it needs no URL, each source can pick its own theme, and it shows a waiting screen while Chatto is closed. A browser source also works if you’d rather not install anything into OBS.',
            },
          ],
        },
        {
          id: 'themes',
          title: 'Themes',
          items: [
            { q: 'Can the overlay and OBS use different themes?', a: 'Yes. Choose one for each on the Outputs page.' },
            {
              q: 'How do I share a theme?',
              a: 'Export it on the Themes page as a .chattotheme file, which includes its images. The other person double-clicks the file to import it, or imports it on the Themes page. Themes on the Explore page can be downloaded as the same file from their details.',
            },
            {
              q: 'Can I write my own CSS?',
              a: 'Yes. Every element has a stable chatto-* class. The editor has autocomplete, and can open your CSS in VS Code with a reference of every class.',
            },
          ],
        },
        {
          id: 'privacy',
          title: 'Privacy',
          items: [
            {
              q: 'Where is my streaming account sign-in kept?',
              a: 'Only on your computer, encrypted by Windows. Chatto connects to the platform directly and never sends it anywhere else.',
            },
            { q: 'How do I report a problem?', a: 'Open an issue on GitHub, or write to support@chattolive.com.' },
          ],
        },
      ],
    },
    changelog: {
      title: 'Changelog',
      description: 'What changed in each version of Chatto, Chatto Themes and the Chatto OBS plugin.',
      lead: 'Chatto checks for new versions by itself and downloads only after you agree.',
      products: { app: 'Chatto', themes: 'Chatto Themes', obs: 'Chatto OBS' },
      intro: {
        app: 'The desktop app: overlay, OBS output, themes and alerts.',
        themes: 'Theme sharing: browse, install and share themes made by others.',
        obs: 'The OBS plugin that adds the “Chatto Chat” source. It comes with the Chatto installer.',
      },
      kinds: { new: 'New', improved: 'Improved', fixed: 'Fixed' },
      latest: 'Latest',
      upcoming: 'Next version',
      inProgress: 'In progress',
      notReleased: 'Not released yet',
      downloadVersion: (version) => `Download ${version}`,
      releases: 'Every version’s full changes and installers are on',
    },
    privacy: {
      title: 'Privacy Notice',
      intro:
        'This notice covers the Chatto desktop app and its theme sharing service. Chatto is an independent open source project; questions go to',
      app: 'The Chatto app',
      sharing: 'Theme sharing',
      signIn: {
        title: 'How sign-in data is used',
        body: 'When you sign in to theme sharing with Twitch, Google or Discord, Chatto receives only your user id and display name from that platform. It uses them only to recognise your Chatto account and to suggest your display name. They are never sold or shared, never used for advertising, and are deleted when you unlink that sign-in method or delete your account. Chatto does not request your email address, and it revokes the platform’s access token right after reading your id.',
      },
    },
    terms: {
      title: 'Terms of Use',
      intro: 'These terms cover theme sharing in the Chatto app. The app itself is free software under',
      app: 'The Chatto app',
    },
    updated: 'Last updated',
    footer: {
      contact: 'Contact',
      license: '© 2026 Chatto, licensed under GPL-3.0-or-later.',
      unofficial: 'Not affiliated with any streaming platform or the OBS Project.',
    },
    notFound: { title: 'Page not found', body: 'This page doesn’t exist.', back: 'Go to the home page' },
  },

  'zh-TW': {
    lang: 'zh-Hant-TW',
    space: '',
    language: '語言',
    darkMode: '深色模式',
    nav: {
      label: '主選單',
      home: '首頁',
      themes: '主題',
      guide: '使用教學',
      faq: '常見問題',
      changelog: '更新紀錄',
      privacy: '隱私說明',
      terms: '使用條款',
    },
    download: '下載 Windows 版',
    source: 'GitHub',
    note: '免費開源，Windows 10 以上',
    more: '更多',
    sample: {
      greeting: '晚安，今天玩什麼？',
      hello: '晚安',
      boss: '這個 boss 好難',
      chest: '左邊有寶箱',
      raid: 'ShiroLive 帶著 42 位觀眾揪團過來了',
      raidTag: '揪團',
    },
    home: {
      title: 'Chatto — 給實況主的聊天室 Overlay',
      description:
        'Chatto 是給實況主的聊天室工具：桌面上的透明 Overlay，加上可自訂主題的 OBS 聊天室來源。免費、開源，支援 Windows。',
      tagline: '在桌面和 OBS\n顯示聊天室',
      lead: '將聊天室以透明 Overlay 顯示在桌面，或加入 OBS，兩者都能使用自訂主題。',
      featuresTitle: '能做什麼',
      features: [
        {
          icon: 'monitor',
          title: '疊在遊戲上，不擋操作',
          body: 'Overlay 永遠在最上層，滑鼠直接穿過去。要移動或縮放時解鎖，拖曳邊框就好。',
        },
        {
          icon: 'obs',
          title: 'OBS 裡選來源就好',
          body: '新增「Chatto 聊天室」來源，不用貼網址，每個來源各選一個主題；Chatto 沒開時顯示等待畫面。',
        },
        {
          icon: 'sliders',
          title: '每一項都能調',
          body: '內距、圓角、框線、外框圖片、身分樣式，改了馬上看到。也能直接寫 CSS，做好的主題可以匯出給別人。',
        },
        {
          icon: 'bell',
          title: '只有你看得到的提醒',
          body: '揪團、訂閱會在桌面角落跳出卡片；聊天室安靜一陣子後有人留言，也會提醒你。這些都不會出現在直播畫面上。',
        },
      ],
      themesTitle: '七種內建主題，\n每一種都能再調整',
      themesMore: '看全部主題',
      themesLead: '挑一張貼上，覺得不對再改。桌面和 OBS 可以貼不一樣的。',
      themesSheet: 'Chatto 主題貼紙',
      themesBlank: '自己畫一張',
      themesBlankNote: '自訂 CSS',
      guideTitle: '開台前要做的事',
      guideMore: '完整教學',
      steps: [
        { title: '下載並安裝', body: '要在 OBS 用，安裝時勾選「安裝 OBS 外掛」。' },
        { title: '連上你的頻道', body: '在「帳號」頁登入直播平台，預覽裡就會出現聊天。' },
        { title: '選擇顯示的地方', body: '開啟桌面 Overlay，或在 OBS 新增「Chatto 聊天室」來源。' },
      ],
      faqTitle: '常被問到的',
      faqOther: '還有別的問題？',
      faqMore: '看全部常見問題',
      closing: '下載 Chatto，開始直播',
      latest: (version, date) => `最新版本 ${version}，${date} 發佈。`,
      latestMore: '看看改了什麼',
      heroCaption: '抹茶玻璃主題，今晚的聊天室',
      heroSticky: '格子的地方是透明的，底下的遊戲會直接透出來。滑鼠也穿得過去。',
    },
    specimen: {
      unlocked: '已解鎖，拖曳調整',
      obsTitle: '「Chatto 聊天室」的屬性',
      theme: '主題',
      width: '寬度',
      height: '高度',
      connected: '已連上 Chatto',
      radius: '圓角',
      opacity: '背景不透明度',
      border: '框線顏色',
      reply: '這首好聽',
      raidTitle: 'ShiroLive 揪團',
      raidBody: '帶著 42 位觀眾過來了',
      sub: '訂閱了 3 個月',
    },
    themes: {
      title: '主題',
      description: 'Chatto 的七種內建聊天室主題，以及每一種可以調整的地方。',
      lead: '從七種內建主題挑一個當起點，再逐項調整成你要的樣子。',
      jump: '主題列表',
      default: '預設',
      colors: '色彩',
      shape: '形狀',
      motion: '動態',
      blank: { name: '空白', body: '不帶任何樣式，只留結構與 class，給想從零寫 CSS 的人。' },
      customTitle: '自訂',
      customBody: '主題編輯器會同時顯示所有元件的範例，改了什麼立刻看得到。桌面 Overlay 和 OBS 可以各用一個主題。',
      custom: [
        '四邊內距、四角圓角、框線、陰影、模糊',
        '九宮格圖片外框（PNG、WebP、GIF）',
        '管理員、VIP、訂閱者各自的樣式',
        '訂閱、揪團等事件的樣式與文字',
        '自訂 CSS，附自動完成與檢查模式',
        '匯出與匯入 .chattotheme 主題檔，圖片一起打包',
      ],
      list: {
        'matcha-glass': {
          name: '抹茶玻璃',
          idea: '一杯透光的冰抹茶',
          colors: '半透明深綠底、淡薄荷名字、淡綠文字',
          shape: '12px 圓角、淡色細邊框',
          motion: '淡入',
        },
        washi: {
          name: '和紙',
          idea: '寫在和紙上的留言',
          colors: '米色紙底、墨色文字、茶褐色名字、朱紅強調',
          shape: '近乎直角、思源宋體',
          motion: '淡入',
        },
        bubble: {
          name: '泡泡',
          idea: '手機聊天的對話泡泡',
          colors: '淡珊瑚底、深茶色文字、珊瑚色強調',
          shape: '大圓角、一角收尖；事件加邊框與歪斜貼紙',
          motion: '彈出',
        },
        outline: {
          name: '極簡描邊',
          idea: '遊戲字幕',
          colors: '白字黑描邊、薄荷名字、金色強調',
          shape: '沒有底，只有字，字級稍大',
          motion: '淡入',
        },
        noren: {
          name: '暖簾',
          idea: '店門口的暖簾',
          colors: '深藍布色、名字在更深的布塊上、金色強調',
          shape: '名字與內容左右兩塊、6px 圓角',
          motion: '從左滑入',
        },
        terminal: {
          name: '終端機',
          idea: '開發者的終端機',
          colors: '近黑底、灰白文字、青綠名字與強調',
          shape: '等寬字、@ 前綴、顯示時間、一整塊面板',
          motion: '無',
        },
        'tea-leaf': {
          name: '茶葉框',
          idea: 'Chatto 自己的樣子',
          colors: '深色底配淡抹茶外框、櫻色強調',
          shape: '九宮格圖片外框，對角兩片茶葉',
          motion: '彈出',
        },
      },
    },
    guide: {
      title: '使用教學',
      description: '安裝 Chatto、連上頻道，把聊天室放到桌面和 OBS。',
      lead: '安裝 Chatto、連上頻道，把聊天室放到桌面和 OBS。',
      toc: '本頁目錄',
      step: 'STEP',
      sections: [
        {
          id: 'install',
          title: '安裝',
          body: ['下載安裝檔並執行。要在 OBS 裡用的話，勾選「安裝 OBS 外掛」；之後也能在 App 的「輸出」頁安裝。'],
          note: '裝好後 Chatto 會自動檢查新版本，有更新時在標題列提示，你同意後才下載。',
        },
        {
          id: 'connect',
          title: '連上頻道',
          steps: [
            '打開「帳號」頁，在直播平台的卡片上按「登入」。',
            '瀏覽器會開啟平台的授權頁，在那裡輸入 Chatto 顯示的代碼。',
            '授權完成後回到 Chatto，聊天就會出現在「聊天室」頁的預覽裡。',
          ],
        },
        {
          id: 'overlay',
          title: '桌面 Overlay',
          body: [
            '給自己看的透明聊天室，浮在所有視窗上方，滑鼠可以直接穿過。在「輸出」頁開啟，按「調整」後拖曳移動位置、拖曳邊緣改大小，完成後按「完成調整」。',
          ],
          tips: [
            { title: '遊戲用無邊框視窗', body: '獨佔全螢幕會蓋過所有置頂視窗，Overlay 就看不到了。' },
            { title: 'OBS 改用遊戲或視窗擷取', body: '「顯示器擷取」會把 Overlay 一起錄進直播。' },
          ],
        },
        {
          id: 'obs',
          title: '放進 OBS',
          cards: [
            {
              title: '用 OBS 外掛',
              badge: '建議',
              body: '在 OBS 的來源新增「Chatto 聊天室」，不用貼網址，每個來源都能選自己的主題。Chatto 沒開時，來源會顯示等待畫面。',
            },
            {
              title: '手動新增瀏覽器來源',
              steps: [
                '在 OBS 的來源新增「瀏覽器」。',
                '貼上 Chatto「輸出」頁的網址，建議寬 420、高 600。',
                '勾選「場景啟用時重新整理瀏覽器」會更穩定。',
              ],
            },
          ],
        },
        {
          id: 'theme',
          title: '調整主題',
          body: [
            '在「主題」頁複製一個內建主題，再打開編輯器。左側選區塊，右側預覽會同時顯示所有元件與事件的範例；改的是草稿，按「儲存」才會套用。在「輸出」頁替桌面 Overlay 和 OBS 各選一個主題。',
          ],
          link: '看所有內建主題',
        },
        {
          id: 'alerts',
          title: '只有你看得到的提醒',
          cards: [
            {
              title: '新留言提醒',
              body: '聊天室安靜一段時間後（預設 2 分鐘，可設 30 秒到 30 分鐘）有人留言，桌面 Overlay 會標出那則留言並播放提示音。',
            },
            { title: '事件 Overlay', body: '訂閱、揪團等事件在桌面右上角跳出卡片。在「提醒」頁選擇要提醒哪些事件。' },
          ],
          note: '這兩種提醒都不會出現在 OBS 的畫面上。',
        },
      ],
      stuck: '還是卡住了？',
      stuckBody: '看看常見問題，或直接寫信來問。',
      email: '寫信聯絡',
    },
    faq: {
      title: '常見問題',
      description: '關於 Chatto 桌面 Overlay、OBS 外掛與主題的常見問題。',
      lead: '找不到答案的話，寫信到 support@chattolive.com。',
      groups: [
        {
          id: 'basics',
          title: '基本',
          items: [
            { q: 'Chatto 要付費嗎？', a: '不用。Chatto 是免費的開源軟體，以 GPL-3.0 授權，原始碼都在 GitHub。' },
            { q: '支援哪些直播平台？', a: '目前支援 Twitch，YouTube 與 Kick 正在規劃中。' },
            { q: '支援 macOS 嗎？', a: '目前只支援 Windows 10 以上。' },
            {
              q: '怎麼更新？',
              a: 'Chatto 會在啟動時和之後每 6 小時檢查新版本，有新版時在標題列和設定頁「關於」提示。你同意後才下載；下載完按「重新啟動並更新」立即安裝，或等下次結束 Chatto 時自動安裝。',
            },
          ],
        },
        {
          id: 'overlay',
          title: '桌面 Overlay',
          items: [
            {
              q: 'Overlay 會擋到遊戲操作嗎？',
              a: '不會。滑鼠會直接穿過 Overlay，只有在「輸出」頁按「調整」時才能拖曳它。',
            },
            {
              q: '遊戲全螢幕時看不到 Overlay',
              a: '獨佔全螢幕會蓋過所有置頂視窗。把遊戲改成「無邊框視窗」模式就看得到。',
            },
            {
              q: 'Overlay 被一起錄進直播了',
              a: '「顯示器擷取」會錄下螢幕上的所有東西，包括 Overlay。改用「遊戲擷取」或「視窗擷取」。',
            },
          ],
        },
        {
          id: 'obs',
          title: 'OBS',
          items: [
            {
              q: '被刪除的訊息會留在直播畫面上嗎？',
              a: '不會。管理員刪除訊息、封鎖觀眾或清除聊天室時，訊息會立刻從 Overlay 和 OBS 消失。',
            },
            {
              q: 'Chatto 沒開時，OBS 會顯示什麼？',
              a: '「Chatto 聊天室」來源會顯示茶杯的等待畫面，打開 Chatto 後會自動連上。',
            },
            { q: '安裝外掛時說 OBS 正在執行', a: '先關閉 OBS，再到「輸出」頁按一次「安裝外掛」。' },
            {
              q: '外掛和瀏覽器來源該用哪個？',
              a: '建議用外掛：不用貼網址，每個來源能選自己的主題，Chatto 沒開時也有等待畫面。不想在 OBS 裡安裝東西的話，用瀏覽器來源也可以。',
            },
          ],
        },
        {
          id: 'themes',
          title: '主題',
          items: [
            { q: 'Overlay 和 OBS 可以用不同主題嗎？', a: '可以，在「輸出」頁各選一個。' },
            {
              q: '怎麼把主題分享給別人？',
              a: '在「主題」頁匯出成 .chattotheme 檔（圖片會一起打包），對方雙擊檔案就能匯入（也可以在「主題」頁匯入）。分享到探索頁的主題，也可以在詳細頁下載成同樣的檔案。',
            },
            {
              q: '可以自己寫 CSS 嗎？',
              a: '可以。每個元素都有固定的 chatto-* class，編輯器有自動完成；也能用 VS Code 開啟，裡面附有所有 class 的說明。',
            },
          ],
        },
        {
          id: 'privacy',
          title: '隱私與帳號',
          items: [
            {
              q: '直播平台的登入資訊存在哪裡？',
              a: '只存在你的電腦上，由 Windows 加密保存。Chatto 直接連到平台，不會把它傳到其他地方。',
            },
            { q: '遇到問題要怎麼回報？', a: '在 GitHub 開 issue，或寫信到 support@chattolive.com。' },
          ],
        },
      ],
    },
    changelog: {
      title: '更新紀錄',
      description: 'Chatto、Chatto Themes 與 Chatto OBS 外掛每個版本的變更。',
      lead: '已安裝的 Chatto 會自動檢查新版本，你同意後才下載。',
      products: { app: 'Chatto', themes: 'Chatto Themes', obs: 'Chatto OBS' },
      intro: {
        app: '桌面 App：Overlay、OBS 輸出、主題與提醒。',
        themes: '主題分享：瀏覽、安裝、分享其他人做的主題。',
        obs: '新增「Chatto 聊天室」來源的 OBS 外掛，隨 Chatto 安裝檔附上。',
      },
      kinds: { new: '新功能', improved: '改進', fixed: '修正' },
      latest: '最新',
      upcoming: '下一版',
      inProgress: '開發中',
      notReleased: '尚未發佈',
      downloadVersion: (version) => `下載 ${version}`,
      releases: '每個版本的完整變更與安裝檔都在',
    },
    privacy: {
      title: '隱私說明',
      intro: '這份說明涵蓋 Chatto 桌面 App 與主題分享服務。Chatto 是個人開發的開源專案，有任何問題請寄信到',
      app: 'Chatto App',
      sharing: '主題分享',
      signIn: {
        title: '登入資料的用途',
        body: '用 Twitch、Google 或 Discord 登入主題分享時，Chatto 只從平台取得你的使用者 id 與顯示名稱，只用來辨識你的 Chatto 帳號、預先帶入顯示名稱。這些資料不會出售或提供給他人，也不會用於廣告；解除該登入方式或刪除帳號時就會刪除。Chatto 不要求你的 email，讀取使用者 id 後會立即撤銷平台發給的存取權杖。',
      },
    },
    terms: {
      title: '使用條款',
      intro: '這份條款適用於 Chatto App 的主題分享功能。App 本身是自由軟體，授權為',
      app: 'Chatto App',
    },
    updated: '最後更新',
    footer: {
      contact: '聯絡',
      license: '© 2026 Chatto，以 GPL-3.0-or-later 授權。',
      unofficial: '與各直播平台及 OBS Project 沒有關聯。',
    },
    notFound: { title: '找不到這個頁面', body: '這個頁面不存在。', back: '回到首頁' },
  },

  ja: {
    lang: 'ja',
    space: '',
    language: '言語',
    darkMode: 'ダークモード',
    nav: {
      label: 'メイン',
      home: 'ホーム',
      themes: 'テーマ',
      guide: '使い方',
      faq: 'よくある質問',
      changelog: '更新履歴',
      privacy: 'プライバシー',
      terms: '利用規約',
    },
    download: 'Windows版をダウンロード',
    source: 'GitHub',
    note: '無料・オープンソース、Windows 10以降に対応',
    more: 'もっと見る',
    sample: {
      greeting: 'こんばんは、今日は何やるの？',
      hello: 'こんばんは',
      boss: 'このボス強すぎる',
      chest: '左に宝箱あるよ',
      raid: 'ShiroLiveが42人の視聴者とRaidしに来ました',
      raidTag: 'Raid',
    },
    home: {
      title: 'Chatto — 配信者のためのチャットオーバーレイ',
      description:
        'Chattoは配信者のためのチャットツールです。デスクトップには透明なオーバーレイとして、OBSにはテーマを自由に変えられるチャットソースとして表示できます。無料・オープンソースのWindowsアプリです。',
      tagline: 'チャットを\nデスクトップとOBSに',
      lead: 'チャットを透明なオーバーレイとしてデスクトップに表示したり、OBSに追加したりできます。どちらもカスタムテーマで見た目を変えられます。',
      featuresTitle: 'できること',
      features: [
        {
          icon: 'monitor',
          title: 'ゲームの上に重ねても邪魔しない',
          body: 'オーバーレイは常に最前面に表示され、クリックはそのまま通り抜けます。移動やサイズ変更はロックを解除して、端をドラッグするだけです。',
        },
        {
          icon: 'obs',
          title: 'OBSではソースを選ぶだけ',
          body: '「Chatto チャット」ソースを追加するだけで、URLを貼る必要はありません。ソースごとにテーマを選べ、Chattoを閉じている間は待機画面を表示します。',
        },
        {
          icon: 'sliders',
          title: 'すべての項目を調整できる',
          body: '余白、角丸、枠線、画像フレーム、ロールごとのスタイルを、結果を見ながら変更できます。CSSを直接書くこともでき、作ったテーマはエクスポートして共有できます。',
        },
        {
          icon: 'bell',
          title: '自分だけに見えるアラート',
          body: 'Raidやサブスクはデスクトップの隅にカードで表示され、チャットがしばらく静かだったあとに誰かが書き込むとお知らせします。どれも配信画面には映りません。',
        },
      ],
      themesTitle: '7つの内蔵テーマ、\nどれも自由に調整できる',
      themesMore: 'すべてのテーマを見る',
      themesLead: '好きな1枚を貼って、しっくりこなければ変えてください。デスクトップとOBSで別のテーマを使えます。',
      themesSheet: 'Chattoテーマステッカー',
      themesBlank: '自分で描く',
      themesBlankNote: 'カスタム CSS',
      guideTitle: '配信を始める前に',
      guideMore: '使い方をすべて見る',
      steps: [
        {
          title: 'ダウンロードしてインストール',
          body: 'OBSで使う場合は、インストール時に「OBS プラグインをインストールする」にチェックを入れてください。',
        },
        {
          title: 'チャンネルを接続',
          body: '「アカウント」ページで配信プラットフォームにログインすると、プレビューにチャットが表示されます。',
        },
        {
          title: '表示する場所を選ぶ',
          body: 'デスクトップオーバーレイをオンにするか、OBSに「Chatto チャット」ソースを追加します。',
        },
      ],
      faqTitle: 'よくある質問',
      faqOther: 'ほかに質問がある場合',
      faqMore: 'すべての質問を見る',
      closing: 'Chattoをダウンロードして配信を始める',
      latest: (version, date) => `最新バージョンは${version}（${date}リリース）です。`,
      latestMore: '変更内容を見る',
      heroCaption: '抹茶ガラス、今夜のチャット',
      heroSticky: 'チェック柄の部分は透明です。下のゲームがそのまま透けて見え、クリックも通り抜けます。',
    },
    specimen: {
      unlocked: 'ロック解除中、ドラッグで調整',
      obsTitle: '「Chatto チャット」のプロパティ',
      theme: 'テーマ',
      width: '幅',
      height: '高さ',
      connected: 'Chattoに接続済み',
      radius: '角丸',
      opacity: '背景の不透明度',
      border: '枠線の色',
      reply: 'この曲好き',
      raidTitle: 'ShiroLiveがRaid',
      raidBody: '42人の視聴者と来ました',
      sub: '3か月サブスク更新中',
    },
    themes: {
      title: 'テーマ',
      description: 'Chattoの7つの内蔵チャットテーマと、それぞれで調整できる項目。',
      lead: '7つの内蔵テーマから1つを選び、好みの見た目になるまで項目ごとに調整できます。',
      jump: 'テーマ一覧',
      default: 'デフォルト',
      colors: '色',
      shape: '形',
      motion: 'アニメーション',
      blank: {
        name: 'Blank（カスタム CSS）',
        body: 'スタイルを一切持たず、構造とclassだけを残したテーマ。CSSを一から書きたい人向けです。',
      },
      customTitle: 'カスタマイズ',
      customBody:
        'テーマエディターはすべての要素のサンプルを同時に表示するので、変更をすぐに確認できます。デスクトップオーバーレイとOBSでそれぞれ別のテーマを使えます。',
      custom: [
        '四辺ごとの余白、四隅ごとの角丸、枠線、影、ぼかし',
        '9スライス画像フレーム（PNG、WebP、GIF）',
        'モデレーター、VIP、サブスク登録者それぞれのスタイル',
        'サブスクやRaidなどのイベントのスタイルと文言',
        'カスタム CSS（自動補完と検査モード付き）',
        '.chattothemeファイルのエクスポートとインポート（画像も同梱）',
      ],
      list: {
        'matcha-glass': {
          name: '抹茶ガラス',
          idea: '光が透けるグラスのアイス抹茶',
          colors: '半透明の深緑の背景、淡いミントの名前、淡い緑の文字',
          shape: '12pxの角丸、明るく細い枠線',
          motion: 'フェードイン',
        },
        washi: {
          name: '和紙',
          idea: '和紙に書かれたメッセージ',
          colors: '生成りの紙、墨色の文字、茶色の名前、朱色のアクセント',
          shape: 'ほぼ直角の角、Noto Serif TC',
          motion: 'フェードイン',
        },
        bubble: {
          name: 'バブル',
          idea: 'スマホのチャットの吹き出し',
          colors: '淡いコーラルの吹き出し、濃い茶色の文字、コーラルのアクセント',
          shape: '大きな角丸で一角だけ尖った形、イベントには枠線と傾いたステッカー',
          motion: 'ポップイン',
        },
        outline: {
          name: 'アウトライン',
          idea: 'ゲームの字幕',
          colors: '黒縁の白い文字、ミントの名前、金色のアクセント',
          shape: '背景なしで文字だけ、少し大きめ',
          motion: 'フェードイン',
        },
        noren: {
          name: 'のれん',
          idea: '店の入口にかかるのれん',
          colors: '藍色の布地、さらに濃い布地に名前、金色のアクセント',
          shape: '名前と本文を左右2つのブロックに、6pxの角丸',
          motion: '左からスライドイン',
        },
        terminal: {
          name: 'ターミナル',
          idea: '開発者のターミナル',
          colors: '黒に近い背景、明るいグレーの文字、ティールの名前とアクセント',
          shape: '等幅フォント、名前の前に@、タイムスタンプ、1枚のパネル',
          motion: 'なし',
        },
        'tea-leaf': {
          name: '茶葉フレーム',
          idea: 'Chatto自身の見た目',
          colors: '暗い背景に淡い抹茶色のフレーム、桜色のアクセント',
          shape: '対角に茶葉が2枚ある9スライス画像フレーム',
          motion: 'ポップイン',
        },
      },
    },
    guide: {
      title: '使い方',
      description: 'Chattoをインストールしてチャンネルを接続し、チャットをデスクトップとOBSに表示する方法。',
      lead: 'Chattoをインストールしてチャンネルを接続し、チャットをデスクトップとOBSに表示します。',
      toc: 'このページの内容',
      step: 'STEP',
      sections: [
        {
          id: 'install',
          title: 'インストール',
          body: [
            'インストーラーをダウンロードして実行します。OBSで使う場合は「OBS プラグインをインストールする」にチェックを入れてください。あとからアプリの「出力」ページでインストールすることもできます。',
          ],
          note: 'Chattoは新しいバージョンを自動で確認し、タイトルバーでお知らせします。ダウンロードは同意したあとにだけ行います。',
        },
        {
          id: 'connect',
          title: 'チャンネルを接続',
          steps: [
            '「アカウント」ページを開き、配信プラットフォームのカードで「ログイン」をクリックします。',
            'ブラウザでプラットフォームの認証ページが開くので、Chattoに表示されたコードを入力します。',
            '認証が終わってChattoに戻ると、「チャット」ページのプレビューにチャットが表示されます。',
          ],
        },
        {
          id: 'overlay',
          title: 'デスクトップオーバーレイ',
          body: [
            '自分だけが見る透明なチャットです。すべてのウィンドウの上に表示され、クリックはそのまま通り抜けます。「出力」ページでオンにして「調整」をクリックし、ドラッグで移動、端をドラッグしてサイズを変更します。終わったら「調整を終える」をクリックします。',
          ],
          tips: [
            {
              title: 'ゲームはボーダーレスウィンドウで',
              body: '排他的フルスクリーンは、オーバーレイを含むすべての最前面ウィンドウを覆い隠します。',
            },
            {
              title: 'OBSはゲームキャプチャかウィンドウキャプチャで',
              body: '画面キャプチャでは、オーバーレイも配信に映ってしまいます。',
            },
          ],
        },
        {
          id: 'obs',
          title: 'OBSに追加',
          cards: [
            {
              title: 'OBSプラグインを使う',
              badge: 'おすすめ',
              body: 'OBSで「Chatto チャット」ソースを追加します。URLを貼る必要はなく、ソースごとにテーマを選べます。Chattoを閉じている間、ソースには待機画面が表示されます。',
            },
            {
              title: 'ブラウザソースを使う',
              steps: [
                'OBSで「ブラウザ」ソースを追加します。',
                'Chattoの「出力」ページにあるURLを貼り付けます。幅420、高さ600がおすすめです。',
                '「シーンがアクティブになったときにブラウザの表示を更新する」にチェックを入れると、より安定します。',
              ],
            },
          ],
        },
        {
          id: 'theme',
          title: 'テーマを調整',
          body: [
            '「テーマ」ページで内蔵テーマを複製し、エディターを開きます。左でセクションを選ぶと、右のプレビューにすべての要素とイベントのサンプルが表示されます。変更は「保存」をクリックするまで下書きのままです。「出力」ページで、デスクトップオーバーレイとOBSそれぞれのテーマを選びます。',
          ],
          link: 'すべての内蔵テーマを見る',
        },
        {
          id: 'alerts',
          title: '自分だけに見えるアラート',
          cards: [
            {
              title: '静寂アラート',
              body: 'チャットがしばらく静かだったあと（デフォルトは2分、30秒〜30分で設定可能）に誰かが書き込むと、デスクトップオーバーレイがそのメッセージに印を付けて通知音を鳴らします。',
            },
            {
              title: 'アラートオーバーレイ',
              body: 'サブスクやRaidなどのイベントが、デスクトップの右上にカードで表示されます。通知するイベントは「アラート」ページで選べます。',
            },
          ],
          note: 'どちらもOBSの画面には表示されません。',
        },
      ],
      stuck: 'まだ解決しない場合',
      stuckBody: 'よくある質問を見るか、メールでお問い合わせください。',
      email: 'メールで問い合わせる',
    },
    faq: {
      title: 'よくある質問',
      description: 'Chattoのデスクトップオーバーレイ、OBSプラグイン、テーマに関するよくある質問。',
      lead: '答えが見つからない場合は、support@chattolive.comまでご連絡ください。',
      groups: [
        {
          id: 'basics',
          title: '基本',
          items: [
            {
              q: 'Chattoは有料ですか？',
              a: 'いいえ。ChattoはGPL-3.0でライセンスされた無料のオープンソースソフトウェアです。ソースコードはすべてGitHubで公開しています。',
            },
            {
              q: '対応している配信プラットフォームは？',
              a: '現在はTwitchに対応しています。YouTubeとKickは対応予定です。',
            },
            { q: 'macOSで使えますか？', a: 'まだ使えません。ChattoはWindows 10以降で動作します。' },
            {
              q: 'アップデートするには？',
              a: 'Chattoは起動時と、その後6時間ごとに新しいバージョンを確認し、タイトルバーと「設定」›「情報」でお知らせします。ダウンロードは同意したあとにだけ行い、「再起動してアップデート」をクリックするとすぐに、またはChattoを次に終了したときにインストールされます。',
            },
          ],
        },
        {
          id: 'overlay',
          title: 'デスクトップオーバーレイ',
          items: [
            {
              q: 'オーバーレイがゲームの操作の邪魔になりませんか？',
              a: 'なりません。クリックはオーバーレイをそのまま通り抜けます。ドラッグできるのは「出力」ページで「調整」をクリックしたときだけです。',
            },
            {
              q: 'フルスクリーンのゲームでオーバーレイが見えない',
              a: '排他的フルスクリーンは、すべての最前面ウィンドウを覆い隠します。ゲームをボーダーレスウィンドウモードに切り替えてください。',
            },
            {
              q: 'オーバーレイが配信に映ってしまう',
              a: '画面キャプチャは、オーバーレイを含め画面上のすべてを映します。代わりにゲームキャプチャかウィンドウキャプチャを使ってください。',
            },
          ],
        },
        {
          id: 'obs',
          title: 'OBS',
          items: [
            {
              q: '削除されたメッセージは配信画面に残りますか？',
              a: '残りません。モデレーターがメッセージを削除したり、視聴者を追放したり、チャットをクリアしたりすると、そのメッセージはオーバーレイとOBSからすぐに消えます。',
            },
            {
              q: 'Chattoを閉じている間、OBSには何が表示されますか？',
              a: '「Chatto チャット」ソースにはティーカップの待機画面が表示され、Chattoを開くと自動で接続します。',
            },
            {
              q: 'プラグインのインストール時にOBSが実行中と表示される',
              a: 'OBSを閉じてから、「出力」ページでもう一度「プラグインをインストール」をクリックしてください。',
            },
            {
              q: 'プラグインとブラウザソース、どちらを使えばいい？',
              a: 'できればプラグインがおすすめです。URLが不要で、ソースごとにテーマを選べ、Chattoを閉じている間も待機画面が表示されます。OBSに何もインストールしたくない場合は、ブラウザソースでも使えます。',
            },
          ],
        },
        {
          id: 'themes',
          title: 'テーマ',
          items: [
            {
              q: 'オーバーレイとOBSで別のテーマを使えますか？',
              a: 'はい。「出力」ページでそれぞれ選べます。',
            },
            {
              q: 'テーマをほかの人と共有するには？',
              a: '「テーマ」ページで.chattothemeファイルとしてエクスポートします（画像も同梱されます）。受け取った人はファイルをダブルクリックするか、「テーマ」ページでインポートできます。「見つける」ページで共有されているテーマも、詳細画面から同じ形式のファイルとしてダウンロードできます。',
            },
            {
              q: '自分でCSSを書けますか？',
              a: 'はい。すべての要素に固定のchatto-* classがあり、エディターには自動補完があります。VS Codeで開くこともでき、すべてのclassの説明が付いています。',
            },
          ],
        },
        {
          id: 'privacy',
          title: 'プライバシーとアカウント',
          items: [
            {
              q: '配信プラットフォームのログイン情報はどこに保存されますか？',
              a: 'お使いのパソコンにだけ、Windowsで暗号化して保存されます。Chattoはプラットフォームに直接接続し、ほかの場所に送ることはありません。',
            },
            {
              q: '問題を報告するには？',
              a: 'GitHubでissueを作成するか、support@chattolive.comまでご連絡ください。',
            },
          ],
        },
      ],
    },
    changelog: {
      title: '更新履歴',
      description: 'Chatto、Chatto Themes、Chatto OBSプラグインの各バージョンの変更点。',
      lead: 'Chattoは新しいバージョンを自動で確認し、同意したあとにだけダウンロードします。',
      products: { app: 'Chatto', themes: 'Chatto Themes', obs: 'Chatto OBS' },
      intro: {
        app: 'デスクトップアプリ：オーバーレイ、OBS出力、テーマ、アラート。',
        themes: 'テーマ共有：ほかの人が作ったテーマの閲覧、インストール、共有。',
        obs: '「Chatto チャット」ソースを追加するOBSプラグイン。Chattoのインストーラーに同梱されています。',
      },
      kinds: { new: '新機能', improved: '改善', fixed: '修正' },
      latest: '最新',
      upcoming: '次のバージョン',
      inProgress: '開発中',
      notReleased: '未リリース',
      downloadVersion: (version) => `${version}をダウンロード`,
      releases: '各バージョンのすべての変更点とインストーラーはこちら：',
    },
    privacy: {
      title: 'プライバシーポリシー',
      intro:
        'このプライバシーポリシーは、Chattoデスクトップアプリとテーマ共有サービスを対象とします。Chattoは個人が開発するオープンソースプロジェクトです。お問い合わせ先：',
      app: 'Chattoアプリ',
      sharing: 'テーマ共有',
      signIn: {
        title: 'ログイン情報の利用目的',
        body: 'Twitch、Google、Discordのいずれかでテーマ共有にログインすると、ChattoはそのプラットフォームからユーザーIDと表示名のみを受け取ります。これらはChattoアカウントの識別と表示名の初期入力にのみ使用します。販売や第三者への提供、広告への利用は一切行わず、そのログイン方法の連携を解除したとき、またはアカウントを削除したときに削除します。Chattoはメールアドレスを要求せず、ユーザーIDを読み取った直後にプラットフォームのアクセストークンを失効させます。',
      },
    },
    terms: {
      title: '利用規約',
      intro: '本規約は、Chattoアプリのテーマ共有機能に適用されます。アプリ本体は自由ソフトウェアで、ライセンスは',
      app: 'Chattoアプリ',
    },
    updated: '最終更新日',
    footer: {
      contact: 'お問い合わせ',
      license: '© 2026 Chatto、GPL-3.0-or-laterでライセンスされています。',
      unofficial: '各配信プラットフォームおよびOBS Projectとは関係ありません。',
    },
    notFound: { title: 'ページが見つかりません', body: 'このページは存在しません。', back: 'ホームに戻る' },
  },
};
