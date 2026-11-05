import { defineMessages } from '../define';

/** The themes page, theme labels and theme files. */
export default defineMessages({
  'zh-TW': {
    title: '主題',
    description: '風格與配色可以自由組合。內建主題可以複製後再編輯，也能匯出成檔案分享。',
    newTheme: '新增主題',
    copyOf: (name: string) => `${name} 副本`,
    builtIn: '內建',
    custom: '自訂',
    duplicateAndEdit: '複製並編輯',
    moreActions: '更多動作',
    exportPackage: '匯出主題包',
    exportJson: '匯出 JSON',
    duplicate: '建立副本',
    publish: '投稿到探索',
    deleteTheme: '刪除主題',
    deleteTitle: (name: string) => `刪除「${name}」？`,
    deleteDescription: '刪除後無法復原。正在使用這個主題的 Overlay 或 OBS 會改回預設主題。',
    labels: {
      inline: '單行',
      stacked: '上下',
      columns: '分欄',
      blank: '空白 · 自訂 CSS',
    },
    io: {
      importedName: (name: string) => `${name}（匯入）`,
      untitledImport: '匯入的主題',
      unsupported: '不支援的主題檔案或版本',
      noFile: '沒有選擇檔案',
      invalidJson: '檔案不是有效的 JSON',
    },
  },
  en: {
    title: 'Themes',
    description:
      'Mix any layout with any palette. Duplicate a built-in theme to edit it, or export a theme as a file to share.',
    newTheme: 'New theme',
    copyOf: (name: string) => `${name} copy`,
    builtIn: 'Built-in',
    custom: 'Custom',
    duplicateAndEdit: 'Duplicate and edit',
    moreActions: 'More actions',
    exportPackage: 'Export theme package',
    exportJson: 'Export JSON',
    duplicate: 'Duplicate',
    publish: 'Publish to Explore',
    deleteTheme: 'Delete theme',
    deleteTitle: (name: string) => `Delete "${name}"?`,
    deleteDescription:
      'This can’t be undone. An overlay or OBS source using this theme switches back to the default theme.',
    labels: {
      inline: 'Inline',
      stacked: 'Stacked',
      columns: 'Columns',
      blank: 'Blank · custom CSS',
    },
    io: {
      importedName: (name: string) => `${name} (imported)`,
      untitledImport: 'Imported theme',
      unsupported: 'Unsupported theme file or version',
      noFile: 'No file selected',
      invalidJson: 'The file is not valid JSON',
    },
  },
});
