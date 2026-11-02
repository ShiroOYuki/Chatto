import { mapThemeImages, normalizeTheme, themeImageSources } from '@chatto/chat-ui';
import { assetFileOf, type ChatTheme } from '@chatto/core';
import type { Messages } from '../i18n';
import { themes } from '../services/themes';

/** Texts for imported themes and import errors (`useMessages().themes.io`). */
export type ThemeIOMessages = Messages['themes']['io'];

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
export function asImportedTheme(theme: ChatTheme, m: ThemeIOMessages): ChatTheme {
  return {
    ...theme,
    id: `custom-${Date.now().toString(36)}`,
    name: theme.name ? m.importedName(theme.name) : m.untitledImport,
    builtIn: false,
    customCss: typeof theme.customCss === 'string' ? theme.customCss : '',
  };
}

/**
 * Parses a theme JSON file. Plain JSON cannot carry images, so frames that
 * point at the asset folder are dropped; data URL frames are kept.
 */
export function parseThemeFile(text: string, m: ThemeIOMessages): ChatTheme {
  let theme: ChatTheme;
  try {
    theme = normalizeTheme(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) throw error;
    throw new Error(m.unsupported);
  }
  return asImportedTheme(
    mapThemeImages(theme, (image) => (assetFileOf(image.src) ? null : image)),
    m,
  );
}

/** Lets the user pick a theme JSON or package and returns it, ready to save. */
export function pickThemeFile(m: ThemeIOMessages): Promise<ChatTheme> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `application/json,.json,.${THEME_PACKAGE_EXTENSION}`;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error(m.noFile));
      try {
        if (file.name.toLowerCase().endsWith(`.${THEME_PACKAGE_EXTENSION}`)) {
          resolve(asImportedTheme(await themes.importPackage(new Uint8Array(await file.arrayBuffer())), m));
        } else {
          resolve(parseThemeFile(await file.text(), m));
        }
      } catch (error) {
        reject(error instanceof SyntaxError ? new Error(m.invalidJson) : error);
      }
    };
    input.click();
  });
}
