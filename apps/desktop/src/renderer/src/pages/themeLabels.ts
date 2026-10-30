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

/** A representative colour for small theme swatches. */
export function themeSwatch(theme: {
  base: string;
  list: { box: { background: string } };
  message: { box: { background: string } };
  body: { box: { background: string } };
  author: { color: string };
}): string {
  if (theme.base === 'blank') return 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px';
  for (const color of [theme.message.box.background, theme.body.box.background, theme.list.box.background]) {
    if (filled(color)) return color;
  }
  return theme.author.color;
}
