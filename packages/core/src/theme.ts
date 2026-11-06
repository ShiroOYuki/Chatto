/**
 * Chat theme schema, version 2.
 *
 * Every theme is a set of parameters applied to ONE shared base renderer, so
 * all built-in looks (card, bubble, outline, tag, terminal …) are just
 * different values of the same fields — nothing is hard-coded per style.
 *
 * `base: 'blank'` turns the generated styles off entirely; only the markup
 * (stable `chatto-*` classes) and the theme's `customCss` remain.
 *
 * Units: lengths are px unless noted; `em` fields are relative to the font size.
 * Colours are any CSS colour string; use `transparent` to disable a fill.
 */

import type { Locale } from './i18n';

export const THEME_SCHEMA_VERSION = 2 as const;

/** [top, right, bottom, left] in px. */
export type Sides = [number, number, number, number];
/** [top-left, top-right, bottom-right, bottom-left] in px. */
export type Corners = [number, number, number, number];

export interface ShadowSpec {
  x: number;
  y: number;
  blur: number;
  /** Ignored for text shadows. */
  spread: number;
  color: string;
  /** Box shadows only. */
  inset?: boolean;
}

export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'none';

export interface BorderSpec {
  width: number;
  style: BorderStyle;
  color: string;
}

export type BoxImageRepeat = 'stretch' | 'repeat' | 'round' | 'space';

/**
 * A nine-slice image frame (CSS `border-image`): the corners stay fixed, the
 * edges and the optional centre stretch or tile with the box.
 */
export interface BoxImage {
  /** `asset:<file>` from Chatto's asset folder, or a `data:image/…;base64,` URL. */
  src: string;
  /** Slice lines in image pixels: [top, right, bottom, left]. */
  slice: Sides;
  /** Draw the centre slice as the box background. */
  fill: boolean;
  /** Displayed frame width = slice × scale (e.g. 0.5 for @2x art). */
  scale: number;
  repeat: BoxImageRepeat;
  /** How far the frame overhangs the box, px: [top, right, bottom, left]. */
  outset: Sides;
}

/** A styleable rectangle: used for the list panel, messages, name tags, bodies and notices. */
export interface BoxStyle {
  background: string;
  border: BorderSpec;
  radius: Corners;
  padding: Sides;
  shadow: ShadowSpec | null;
  /** Backdrop blur in px (glass effects), 0 to disable. */
  backdropBlur: number;
  /**
   * Nine-slice image frame; replaces `border` and turns `shadow` into a drop
   * shadow that follows the image. `null` for none.
   */
  image: BoxImage | null;
}

/** Image types a frame may use. SVG is excluded: it can pull in other resources. */
export const ASSET_TYPES = { png: 'image/png', webp: 'image/webp', gif: 'image/gif' } as const;
export type AssetExtension = keyof typeof ASSET_TYPES;

/** The image type of a file, from its first bytes rather than its name. */
export function sniffImage(bytes: Uint8Array): AssetExtension | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'png';
  if (ascii(0, 4) === 'GIF8') return 'gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}

/** A stored asset file: the SHA-256 of its bytes plus its extension. */
export const ASSET_FILE = /^[0-9a-f]{64}\.(png|webp|gif)$/;
const ASSET_PREFIX = 'asset:';
const DATA_IMAGE = /^data:image\/(png|webp|gif);base64,[A-Za-z0-9+/=]+$/;

/** The asset file a frame `src` points at, or null for data URLs and invalid values. */
export function assetFileOf(src: string): string | null {
  if (!src.startsWith(ASSET_PREFIX)) return null;
  const file = src.slice(ASSET_PREFIX.length);
  return ASSET_FILE.test(file) ? file : null;
}

export const assetSrc = (file: string) => `${ASSET_PREFIX}${file}`;

/** Whether a frame `src` is something Chatto will load. */
export const isValidImageSrc = (src: string) => assetFileOf(src) !== null || DATA_IMAGE.test(src);

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
export type EnterAnimation =
  'none' | 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'pop' | 'bounce' | 'shake' | 'zoom';
/** How an item leaves; used by alert cards when their time is up. */
export type ExitAnimation = 'none' | 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'pop' | 'zoom';

/** How a message that broke a quiet spell draws attention on the desktop overlay. */
export type AttentionEffect = 'none' | 'glow' | 'pulse' | 'shake';

/**
 * How the parts of one message are arranged:
 * - `inline`: name and text flow on one line and wrap together.
 * - `stacked`: name on its own line, text below (bubbles).
 * - `columns`: name in a fixed column on the left, text fills the rest (tags).
 */
export type MessageArrangement = 'inline' | 'stacked' | 'columns';

/** Keys for per-role and per-highlight overrides. */
/** `viewer` is everyone without a broadcaster, moderator, VIP or subscriber (founder) role. */
export const ROLE_KEYS = ['viewer', 'broadcaster', 'moderator', 'vip', 'subscriber', 'first-message'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

/**
 * Where an event's frame goes on events that are chat messages (cheers, highlighted messages …):
 * - `wrap`: the event box wraps the whole message.
 * - `surface`: the event colours (fill, border, shadow, blur, accent) restyle the message's own
 *   visible surface — the body when it has a fill (bubbles, tags) — keeping its shape, so
 *   the event does not draw a frame around a frame. System notices always use the full box.
 */
export type EventMessageFrame = 'wrap' | 'surface';

/**
 * Where the title of an event chat message goes (cheers, highlighted messages …):
 * - `line`: its own line above the message.
 * - `sticker`: a small tilted pill on the top-right corner of the message's surface.
 * System notices always show their text as the first line.
 */
export type EventTitlePlacement = 'line' | 'sticker';

/** Look of the title when `titlePlacement` is `sticker`. */
export interface EventSticker {
  background: string;
  color: string;
  /** Tilt in degrees; negative tilts left. */
  rotate: number;
}

/**
 * Style of an event message (subs, raids, cheers …). The theme's `notice`
 * field is the generic event base; individual events can follow it or override it.
 */
export interface EventStyle {
  box: BoxStyle;
  /** Left accent bar colour. */
  accentColor: string;
  /** Left accent bar width, px. */
  accentWidth: number;
  /** Colour of the event title line (system text, or e.g. the bits amount). */
  titleColor: string;
  /** Colour of the attached message text; empty string inherits. */
  bodyColor: string;
  /** Text shown before the title, e.g. an emoji; empty for none. */
  icon: string;
  /** How the frame applies to events that are chat messages. */
  messageFrame: EventMessageFrame;
  /** Where the title of events that are chat messages goes. */
  titlePlacement: EventTitlePlacement;
  sticker: EventSticker;
}

/**
 * Per-event setting, keyed by `${platform}:${eventType}` (e.g. `twitch:resub`).
 * `linked: true` keeps following the generic event base (`notice`) as it
 * changes; editing the event turns it into an independent copy (`linked: false`).
 */
export interface EventOverride {
  linked: boolean;
  style: EventStyle;
}

export interface RoleStyle {
  nameColor?: string;
  nameBackground?: string;
  /** Background of the message's visible surface (the body if it has a fill, otherwise the message). */
  surfaceBackground?: string;
  borderColor?: string;
  /** Nine-slice frame on the message's visible surface. */
  frame?: BoxImage;
}

export interface ChatThemeBehavior {
  /** Seconds before a message is removed, 0 keeps it forever. */
  messageLifetime: number;
  /** Maximum messages kept on screen. */
  maxMessages: number;
  /** Login names whose messages are hidden (bots etc.). */
  hiddenUsers: string[];
  /** Hide messages starting with these prefixes, e.g. `!`. */
  hiddenPrefixes: string[];
}

/** @deprecated v1 name, kept so feed helpers read naturally. */
export type ChatThemeOptions = ChatThemeBehavior;

/** Where a theme installed from theme sharing came from. */
export interface ThemeOrigin {
  /** The shared theme's id on the sharing platform. */
  shareId: string;
  /** The shared version that was installed. */
  version: number;
  /** Content hash when installed; once the theme's content differs, the user has changed it. */
  contentHash: string;
}

export interface ChatTheme {
  schemaVersion: typeof THEME_SCHEMA_VERSION;
  id: string;
  name: string;
  /** Built-in presets are read-only; users duplicate them to edit. */
  builtIn?: boolean;
  /** Set on themes installed from theme sharing (and on copies made from them). */
  origin?: ThemeOrigin;
  /** `blank` renders markup only — no generated CSS — for fully custom styling. */
  base: 'styled' | 'blank';

  font: {
    family: string;
    size: number;
    lineHeight: number;
    /** em */
    letterSpacing: number;
    weight: number;
  };

  text: {
    color: string;
    mutedColor: string;
    accentColor: string;
    strokeWidth: number;
    strokeColor: string;
    shadow: ShadowSpec | null;
  };

  /** The panel that holds every message. */
  list: {
    box: BoxStyle;
    gap: number;
    /** Newest at the bottom (default) or at the top. */
    direction: 'bottom-up' | 'top-down';
    /** Horizontal alignment of messages inside the panel. */
    align: 'stretch' | 'start' | 'end';
  };

  message: {
    box: BoxStyle;
    arrangement: MessageArrangement;
    /** Space between avatar, name and text, px. */
    gap: number;
    /** 0 = no limit. */
    maxWidth: number;
    /** Vertical alignment of the avatar against the text. */
    align: 'start' | 'center' | 'end';
  };

  /** The author name (and the header box around time, badges and name). */
  author: {
    color: string;
    useUserColor: boolean;
    weight: number;
    /** em */
    size: number;
    transform: TextTransform;
    prefix: string;
    suffix: string;
    /** Text between name and message, e.g. `: `. */
    separator: string;
    /** Box around the whole header (time, badges, name). */
    box: BoxStyle;
  };

  body: {
    /** Empty string inherits `text.color`. */
    color: string;
    /** em */
    size: number;
    weight: number;
    italic: boolean;
    box: BoxStyle;
  };

  avatar: {
    show: boolean;
    size: number;
    /** % of the avatar size; 50 = circle. */
    radius: number;
  };

  badges: {
    show: boolean;
    /** em */
    size: number;
    gap: number;
    radius: number;
  };

  timestamp: {
    show: boolean;
    hour12: boolean;
    color: string;
    /** em */
    size: number;
  };

  emote: {
    /** em */
    size: number;
  };

  mention: {
    color: string;
    background: string;
    weight: number;
  };

  reply: {
    show: boolean;
    color: string;
  };

  /** Generic event message base (通用事件訊息). Every event follows it unless overridden. */
  notice: EventStyle;

  /** Per-event overrides; a missing key means the event follows `notice`. */
  events: Partial<Record<string, EventOverride>>;

  /**
   * The theme's own event texts, keyed like `events` (e.g. `twitch:resub`), in the
   * template syntax of docs/theming.md. Missing or empty entries use the built-in text
   * in the chat language.
   */
  eventText: Partial<Record<string, string>>;

  roles: Partial<Record<RoleKey, RoleStyle>>;

  animation: {
    enter: EnterAnimation;
    /** ms */
    duration: number;
    /** Used by alert cards; chat messages simply disappear. */
    exit: ExitAnimation;
  };

  /**
   * Look of a message that arrives after a quiet spell (highlight `after-silence`).
   * Only the desktop overlay receives that highlight, so OBS never shows it.
   */
  attention: {
    effect: AttentionEffect;
    color: string;
    /** How many times the effect plays. */
    repeat: number;
    /** Small tag on the message's corner; empty for none. Shown in a chat language without its own text. */
    label: string;
    /**
     * The tag's text per chat language, chosen with `:lang()`. Optional and left out when empty, so
     * themes saved before it existed keep their content hash.
     */
    labels?: Partial<Record<Locale, string>>;
    labelColor: string;
  };

  options: ChatThemeBehavior;

  /**
   * Extra CSS appended after the generated styles. Scoped to the chat root;
   * see docs/theming.md for the stable `.chatto-*` class names.
   */
  customCss: string;
}
