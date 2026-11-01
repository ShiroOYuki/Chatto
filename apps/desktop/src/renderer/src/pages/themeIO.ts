import { mapThemeImages, normalizeTheme, themeImageSources } from '@chatto/chat-ui';
import { assetFileOf, type ChatTheme } from '@chatto/core';
import { themes } from '../services/themes';

/** File extension of theme packages (a theme plus its frame images). */
export const THEME_PACKAGE_EXTENSION = 'chattotheme';

/** Whether a theme uses images from the asset folder, so it has to travel as a package. */
export const needsPackage = (theme: ChatTheme) => themeImageSources(theme).some((src) => assetFileOf(src) !== null);

/**
 * Shares a theme as a file: a `.chattotheme` package when it uses frame images
 * from the asset folder, otherwise a plain JSON download.
 */
export async function exportTheme(theme: ChatTheme): Promise<void> {
  if (needsPackage(theme)) {
    await themes.exportPackage(theme);
    return;
  }
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
 * Prepares an imported theme for saving. Imported themes always get a fresh id
 * so they can never overwrite a built-in or an existing custom theme.
 */
export function asImportedTheme(theme: ChatTheme): ChatTheme {
  return {
    ...theme,
    id: `custom-${Date.now().toString(36)}`,
    name: theme.name ? `${theme.name}（匯入）` : '匯入的主題',
    builtIn: false,
    customCss: typeof theme.customCss === 'string' ? theme.customCss : '',
  };
}

/**
 * Parses a theme JSON file. Plain JSON cannot carry images, so frames that
 * point at the asset folder are dropped; data URL frames are kept.
 */
export function parseThemeFile(text: string): ChatTheme {
  let theme: ChatTheme;
  try {
    theme = normalizeTheme(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) throw error;
    throw new Error('不支援的主題檔案或版本');
  }
  return asImportedTheme(mapThemeImages(theme, (image) => (assetFileOf(image.src) ? null : image)));
}

/** Lets the user pick a theme JSON or package and returns it, ready to save. */
export function pickThemeFile(): Promise<ChatTheme> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `application/json,.json,.${THEME_PACKAGE_EXTENSION}`;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('沒有選擇檔案'));
      try {
        if (file.name.toLowerCase().endsWith(`.${THEME_PACKAGE_EXTENSION}`)) {
          resolve(asImportedTheme(await themes.importPackage(new Uint8Array(await file.arrayBuffer()))));
        } else {
          resolve(parseThemeFile(await file.text()));
        }
      } catch (error) {
        reject(error instanceof SyntaxError ? new Error('檔案不是有效的 JSON') : error);
      }
    };
    input.click();
  });
}
