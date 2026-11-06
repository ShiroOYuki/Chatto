import { mapThemeImages, normalizeTheme } from '@chatto/chat-ui';
import { assetFileOf, type ChatTheme } from '@chatto/core';
import type { Messages } from '../i18n';
import { themes } from '../services/themes';

/** Texts for imported themes and import errors (`useMessages().themes.io`). */
export type ThemeIOMessages = Messages['themes']['io'];

/** File extension of theme packages (a theme plus its frame images). */
export const THEME_PACKAGE_EXTENSION = 'chattotheme';

/**
 * Shares a theme as a file. Always a `.chattotheme` package (a zip with `theme.json` and the
 * frame images it uses), with or without images, so there is one format to pass around.
 * Resolves false when the user cancels the save dialog.
 */
export function exportTheme(theme: ChatTheme): Promise<boolean> {
  return themes.exportPackage(theme);
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
  return asImportedTheme(parseThemeJson(text, m), m);
}

/** A theme JSON file's theme as written (normalized, unsaved), without the frames it cannot carry. */
function parseThemeJson(text: string, m: ThemeIOMessages): ChatTheme {
  let theme: ChatTheme;
  try {
    theme = normalizeTheme(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) throw error;
    throw new Error(m.unsupported);
  }
  return mapThemeImages(theme, (image) => (assetFileOf(image.src) ? null : image));
}

/** Lets the user pick a theme JSON or package and returns it, ready to save. */
export async function pickThemeFile(m: ThemeIOMessages): Promise<ChatTheme> {
  return asImportedTheme(await readPickedThemeFile(m), m);
}

/**
 * Lets the user pick a theme JSON or package and returns its theme as written: normalized,
 * images stored, but with the file's id and name. Give it a fresh id (`asImportedTheme`) to save.
 */
export function readPickedThemeFile(m: ThemeIOMessages): Promise<ChatTheme> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `application/json,.json,.${THEME_PACKAGE_EXTENSION}`;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error(m.noFile));
      try {
        if (file.name.toLowerCase().endsWith(`.${THEME_PACKAGE_EXTENSION}`)) {
          resolve(await themes.importPackage(new Uint8Array(await file.arrayBuffer())));
        } else {
          resolve(parseThemeJson(await file.text(), m));
        }
      } catch (error) {
        reject(error instanceof SyntaxError ? new Error(m.invalidJson) : error);
      }
    };
    input.click();
  });
}
