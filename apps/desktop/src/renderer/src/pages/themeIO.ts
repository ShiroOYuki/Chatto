import { THEME_SCHEMA_VERSION, type ChatTheme } from '@chatto/core';

/** Downloads a theme as a shareable JSON file. */
export function exportTheme(theme: ChatTheme): void {
  const { builtIn: _builtIn, ...data } = theme;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chatto-theme-${theme.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parses a theme file. Imported themes always get a fresh id so they can
 * never overwrite a built-in or an existing custom theme.
 */
export function parseThemeFile(text: string): ChatTheme {
  const data = JSON.parse(text) as Partial<ChatTheme>;
  if (data.schemaVersion !== THEME_SCHEMA_VERSION) throw new Error('不支援的主題版本');
  if (!data.layout || !data.palette || !data.typography || !data.shape || !data.options) {
    throw new Error('檔案缺少必要的主題欄位');
  }
  return {
    ...(data as ChatTheme),
    id: `custom-${Date.now().toString(36)}`,
    name: data.name ? `${data.name}（匯入）` : '匯入的主題',
    builtIn: false,
    customCss: typeof data.customCss === 'string' ? data.customCss : '',
  };
}

export function pickThemeFile(): Promise<ChatTheme> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('沒有選擇檔案'));
      try {
        resolve(parseThemeFile(await file.text()));
      } catch (error) {
        reject(error instanceof SyntaxError ? new Error('檔案不是有效的 JSON') : error);
      }
    };
    input.click();
  });
}
