import { ASSET_FILE, assetFileOf } from '@chatto/core';
import type { ChatTheme } from '@chatto/core';
import { themeImageSources } from '@chatto/chat-ui/themes';
import { strFromU8, strToU8, unzipSync, zipSync, type Unzipped } from 'fflate';
import { MAX_ASSET_BYTES } from './theme-assets';

/**
 * A theme package (`.chattotheme`) is a zip holding `theme.json` and the frame
 * images it uses under `assets/`, so a theme with images can be shared as one file.
 */
export const THEME_PACKAGE_EXTENSION = 'chattotheme';
const THEME_ENTRY = 'theme.json';
const ASSET_DIR = 'assets/';
/** Guards against zip bombs: limits on what an imported package may unpack to. */
const MAX_ENTRIES = 64;
const MAX_THEME_BYTES = 1024 * 1024;

/** Stored asset files a theme points at. */
export function themeAssetFiles(theme: ChatTheme): string[] {
  return themeImageSources(theme).flatMap((src) => {
    const file = assetFileOf(src);
    return file ? [file] : [];
  });
}

/** Zips a theme with the asset files it uses; missing assets are left out. */
export function packTheme(theme: ChatTheme, readAsset: (file: string) => Uint8Array | null): Uint8Array {
  const { builtIn: _builtIn, ...data } = theme;
  const entries: Record<string, Uint8Array> = { [THEME_ENTRY]: strToU8(JSON.stringify(data, null, 2)) };
  for (const file of themeAssetFiles(theme)) {
    const bytes = readAsset(file);
    if (bytes) entries[`${ASSET_DIR}${file}`] = bytes;
  }
  return zipSync(entries, { level: 6 });
}

export interface UnpackedTheme {
  /** The raw theme JSON; normalize it before use. */
  theme: unknown;
  /** Asset files by name. Names are checked, contents are not: store them through ThemeAssets. */
  assets: Map<string, Uint8Array>;
}

/** Reads a theme package. Throws on anything that is not a well-formed package. */
export function unpackTheme(bytes: Uint8Array): UnpackedTheme {
  let entries: Unzipped;
  let count = 0;
  try {
    entries = unzipSync(bytes, {
      filter: (file) => {
        count += 1;
        if (count > MAX_ENTRIES) throw new Error('too many entries');
        const limit = file.name === THEME_ENTRY ? MAX_THEME_BYTES : MAX_ASSET_BYTES;
        if (file.originalSize > limit) throw new Error('entry too large');
        return file.name === THEME_ENTRY || isAssetEntry(file.name);
      },
    });
  } catch {
    throw new Error('不是有效的主題包');
  }
  const json = entries[THEME_ENTRY];
  if (!json) throw new Error('主題包裡沒有 theme.json');
  let theme: unknown;
  try {
    theme = JSON.parse(strFromU8(json));
  } catch {
    throw new Error('主題包裡的 theme.json 不是有效的 JSON');
  }
  const assets = new Map<string, Uint8Array>();
  for (const [name, data] of Object.entries(entries)) {
    if (isAssetEntry(name)) assets.set(name.slice(ASSET_DIR.length), data);
  }
  return { theme, assets };
}

const isAssetEntry = (name: string) => name.startsWith(ASSET_DIR) && ASSET_FILE.test(name.slice(ASSET_DIR.length));
