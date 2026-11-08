import { defineMessages } from '../define';

/** Dialogs that open on their own over any page: a new version (#39) and a theme file opened from Windows (#40). */
export default defineMessages({
  'zh-TW': {
    update: {
      title: (version: string) => `有新版本 ${version}`,
      current: (version: string) => `目前是 ${version}`,
      kinds: { new: '新功能', improved: '改進', fixed: '修正' },
      noNotes: '讀不到這一版的更新內容',
      viewChangelog: '查看更新內容',
      close: '關閉',
      skip: '略過此版本',
      skipHint: '這一版不再自動跳出；標題列和設定頁仍可更新',
      update: '更新',
      updateHint: '在背景下載，不會中斷直播；下載完成後重新啟動即可安裝',
    },
    openedTheme: {
      title: '匯入主題',
      from: (file: string) => `來自 ${file}`,
      more: (count: number) => `之後還有 ${count} 個檔案`,
      import: '匯入',
      cancel: '取消',
      failed: '無法匯入這個檔案',
      close: '關閉',
      imported: (name: string) => `已匯入「${name}」`,
      applyTo: '要直接套用嗎？',
      done: '完成',
    },
  },
  en: {
    update: {
      title: (version: string) => `Version ${version} is out`,
      current: (version: string) => `You have ${version}`,
      kinds: { new: 'New', improved: 'Improved', fixed: 'Fixed' },
      noNotes: 'Can’t load what’s new in this version',
      viewChangelog: 'See what’s new',
      close: 'Close',
      skip: 'Skip this version',
      skipHint: 'This version won’t pop up again; you can still update from the title bar or Settings',
      update: 'Update',
      updateHint: 'Downloads in the background without interrupting your stream; restart to install it',
    },
    openedTheme: {
      title: 'Import theme',
      from: (file: string) => `From ${file}`,
      more: (count: number) => `${count} more ${count === 1 ? 'file' : 'files'} after this`,
      import: 'Import',
      cancel: 'Cancel',
      failed: 'Can’t import this file',
      close: 'Close',
      imported: (name: string) => `Imported ${name}`,
      applyTo: 'Use it now?',
      done: 'Done',
    },
  },
});
