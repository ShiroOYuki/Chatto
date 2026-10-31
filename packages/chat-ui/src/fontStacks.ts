/**
 * Font stacks offered for chat themes. Every named family ships with the app
 * (see `./fonts.ts`), so OBS renders the same text offline and on any PC.
 * The bundled Noto fonts are variable fonts, registered as "… Variable".
 */
export const FONT_STACKS = {
  huninn: "'Huninn', 'Noto Sans TC Variable', 'Noto Sans TC', system-ui, sans-serif",
  sans: "'Noto Sans TC Variable', 'Noto Sans TC', system-ui, sans-serif",
  serif: "'Noto Serif TC Variable', 'Noto Serif TC', serif",
  mono: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
  system: 'system-ui, sans-serif',
} as const;

/** Stacks saved by earlier versions, which loaded the Noto fonts from Google Fonts. */
const LEGACY_STACKS: Record<string, string> = {
  "'Huninn', 'Noto Sans TC', 'Inter', system-ui, sans-serif": FONT_STACKS.huninn,
  "'Noto Sans TC', 'Inter', system-ui, sans-serif": FONT_STACKS.sans,
  "'Noto Serif TC', 'Noto Serif JP', serif": FONT_STACKS.serif,
};

/** Maps a stack from an older version to its bundled equivalent; other values pass through. */
export function upgradeFontStack(family: string): string {
  return LEGACY_STACKS[family] ?? family;
}
