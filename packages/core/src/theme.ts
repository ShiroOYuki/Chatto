/**
 * Chat theme schema.
 *
 * A theme is split in two independent axes so users can mix them freely:
 *  - `layout`  — the *style*: structure, shape and motion of each message
 *                (card, bubble, inline, tag, terminal …).
 *  - `palette` — the *colours*: plain design tokens mapped to CSS variables.
 * On top of that, `options` toggle parts of the message and `customCss` gives
 * full control. Themes are plain JSON so they can be exported and shared.
 */

export const THEME_SCHEMA_VERSION = 1 as const;

export type ChatLayoutId = 'card' | 'bubble' | 'inline' | 'tag' | 'terminal' | (string & {});

export type EnterAnimation = 'none' | 'fade' | 'slide-up' | 'slide-left' | 'pop';

export interface ChatPalette {
  /** Message container background (any CSS colour, transparency allowed). */
  surface: string;
  /** Border colour of the message container. */
  border: string;
  text: string;
  mutedText: string;
  /** Accent used by mentions, highlights and links. */
  accent: string;
  /** Background behind the author name in layouts that give it a box (tag). */
  nameSurface: string;
  /** Fallback name colour when the user has none or `useUserColors` is false. */
  name: string;
  /** Outline colour for text stroke (used by stroke-heavy layouts). */
  textStroke: string;
}

export interface ChatTypography {
  fontFamily: string;
  /** Pixel size of the body text. */
  fontSize: number;
  nameWeight: 400 | 500 | 600 | 700 | 800;
  /** Pixel width of the text outline, 0 to disable. */
  textStrokeWidth: number;
}

export interface ChatShape {
  /** Corner radius in px. */
  radius: number;
  /** Border width in px. */
  borderWidth: number;
  /** Inner padding in px [vertical, horizontal]. */
  padding: [number, number];
  /** Gap between messages in px. */
  gap: number;
}

export interface ChatThemeOptions {
  showBadges: boolean;
  showAvatars: boolean;
  showTimestamps: boolean;
  useUserColors: boolean;
  /** Newest message at the bottom (default) or at the top. */
  direction: 'bottom-up' | 'top-down';
  /** Seconds before a message fades out, 0 keeps it forever. */
  messageLifetime: number;
  /** Maximum messages kept on screen. */
  maxMessages: number;
  enterAnimation: EnterAnimation;
  /** Login names whose messages are hidden (bots etc.). */
  hiddenUsers: string[];
  /** Hide messages starting with these prefixes, e.g. `!`. */
  hiddenPrefixes: string[];
}

export interface ChatTheme {
  schemaVersion: typeof THEME_SCHEMA_VERSION;
  id: string;
  name: string;
  /** Built-in presets are read-only; users duplicate them to edit. */
  builtIn?: boolean;
  layout: ChatLayoutId;
  palette: ChatPalette;
  typography: ChatTypography;
  shape: ChatShape;
  options: ChatThemeOptions;
  /**
   * Extra CSS appended after the generated styles. Scoped to the chat root;
   * see docs/theming.md for the stable `.chatto-*` class names.
   */
  customCss: string;
}
