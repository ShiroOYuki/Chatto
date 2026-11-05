import { defineMessages } from '../define';

/** The accounts page and the account card in the sidebar. */
export default defineMessages({
  'zh-TW': {
    title: '帳號',
    description: '管理 Chatto 帳號與直播平台的連線',
    chatto: {
      title: 'Chatto 帳號',
      hint: '用來投稿、按讚與檢舉主題，和聊天室連線分開',
    },
    platforms: {
      title: '直播平台',
      hint: '讀取聊天室用，和 Chatto 帳號分開',
    },
    sidebar: {
      open: '開啟帳號頁',
      signedOut: '未登入 Chatto',
      signingIn: '等待登入',
    },
  },
  en: {
    title: 'Accounts',
    description: 'Manage your Chatto account and streaming platforms',
    chatto: {
      title: 'Chatto account',
      hint: 'For publishing, liking and reporting themes; separate from your chat connection',
    },
    platforms: {
      title: 'Streaming platforms',
      hint: 'Where Chatto reads chat from; separate from your Chatto account',
    },
    sidebar: {
      open: 'Open accounts',
      signedOut: 'Not signed in',
      signingIn: 'Signing in',
    },
  },
});
