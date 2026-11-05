/** Words of the website, apart from the legal texts (those come from `@chatto/share`). */

export const GITHUB_URL = 'https://github.com/ShiroOYuki/Chatto';
export const DOWNLOAD_URL = `${GITHUB_URL}/releases/latest`;
export const SUPPORT_EMAIL = 'support@chattolive.com';

export const CONTENT = {
  en: {
    lang: 'en',
    /** Joins sentences: a space in English, nothing in Chinese. */
    space: ' ',
    otherLanguage: '繁體中文',
    nav: { home: 'Home', privacy: 'Privacy', terms: 'Terms' },
    home: {
      title: 'Chatto — Live chat overlay for streamers',
      description:
        'Chatto puts your stream chat on your desktop as a see-through overlay and in OBS as a themed chat source. Free and open source for Windows.',
      tagline: 'Chat on your desktop and in OBS',
      lead: 'Display chat as a transparent desktop overlay or add it to OBS. Customize both with your own themes.',
      download: 'Download for Windows',
      source: 'View on GitHub',
      note: 'Free and open source · Windows 10+',
      previewAlt: 'A chat in the Bubbles theme: five messages and a raid alert',
      featuresTitle: 'What it does',
      features: [
        {
          title: 'Desktop overlay',
          body: 'A transparent, always-on-top chat that clicks through to the game below, so you can read chat without alt-tabbing.',
        },
        {
          title: 'OBS chat source',
          body: 'Add the “Chatto Chat” source in OBS and pick a theme for each one. Deleted and banned messages leave the stream right away.',
        },
        {
          title: 'Themes',
          body: 'Start from seven built-in themes, then tune padding, corners, frames and roles, or write your own CSS.',
        },
        {
          title: 'Private chat alerts',
          body: 'Get notified when new messages arrive after a quiet period.',
        },
      ],
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
      license: 'Chatto is free software under the GPL-3.0-or-later.',
      unofficial: 'Not affiliated with any streaming platform or the OBS Project.',
    },
    notFound: { title: 'Page not found', body: 'This page doesn’t exist.', back: 'Go to the home page' },
  },
  'zh-TW': {
    lang: 'zh-Hant-TW',
    space: '',
    otherLanguage: 'English',
    nav: { home: '首頁', privacy: '隱私說明', terms: '使用條款' },
    home: {
      title: 'Chatto — 給實況主的聊天室 Overlay',
      description:
        'Chatto 是給實況主的聊天室工具：桌面上的透明 Overlay，加上可自訂主題的 OBS 聊天室來源。免費、開源，支援 Windows。',
      tagline: '在桌面和 OBS 顯示聊天室',
      lead: '將聊天室以透明浮層顯示在桌面，或加入 OBS，兩者都能使用自訂主題。',
      download: '下載 Windows 版',
      source: '在 GitHub 查看',
      note: '免費開源 · Windows 10 以上',
      previewAlt: '「泡泡」主題的聊天室：五則留言與一張揪團提醒',
      featuresTitle: '功能',
      features: [
        {
          title: '桌面 Overlay',
          body: '透明、置頂、滑鼠可以穿透到下面的遊戲，不用切視窗就能看聊天室。',
        },
        {
          title: 'OBS 聊天室來源',
          body: '在 OBS 加入「Chatto 聊天室」來源，每個來源各自選主題。被刪除或封鎖的訊息會立刻從直播畫面消失。',
        },
        {
          title: '主題',
          body: '從七個內建主題開始，再調整內距、圓角、圖片外框與身分樣式，或寫自己的 CSS。',
        },
        {
          title: '只有你看得到的聊天室提醒',
          body: '聊天室安靜一段時間後有新訊息時通知你。',
        },
      ],
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
      license: 'Chatto 是以 GPL-3.0-or-later 授權的自由軟體。',
      unofficial: '與各直播平台及 OBS Project 沒有關聯。',
    },
    notFound: { title: '找不到這個頁面', body: '這個頁面不存在。', back: '回到首頁' },
  },
};
