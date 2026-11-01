import { assetFileOf, type ChatTheme } from '@chatto/core';

export const ARRANGEMENT_LABEL: Record<string, string> = {
  inline: '單行',
  stacked: '上下',
  columns: '分欄',
};

/** Short description of a theme for lists: blank, or its arrangement. */
export function describeTheme(theme: { base: string; message: { arrangement: string } }): string {
  return theme.base === 'blank'
    ? '空白 · 自訂 CSS'
    : (ARRANGEMENT_LABEL[theme.message.arrangement] ?? theme.message.arrangement);
}

const filled = (color: string) => color && color !== 'transparent';

/** A representative background for small theme swatches: the message frame image, or a colour. */
export function themeSwatch(
  theme: Pick<ChatTheme, 'base' | 'list' | 'message' | 'body' | 'author'>,
  assetUrl?: (file: string) => string,
): string {
  if (theme.base === 'blank') return 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px';
  const image = theme.message.box.image ?? theme.body.box.image;
  if (image) {
    const file = assetFileOf(image.src);
    const url = file ? assetUrl?.(file) : image.src;
    if (url) return `center / cover no-repeat url("${url}")`;
  }
  for (const color of [theme.message.box.background, theme.body.box.background, theme.list.box.background]) {
    if (filled(color)) return color;
  }
  return theme.author.color;
}
