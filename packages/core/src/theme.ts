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

/** A styleable rectangle: used for the list panel, messages, name tags, bodies and notices. */
export interface BoxStyle {
  background: string;
  border: BorderSpec;
  radius: Corners;
  padding: Sides;
  shadow: ShadowSpec | null;
  /** Backdrop blur in px (glass effects), 0 to disable. */
  backdropBlur: number;
}

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
export type EnterAnimation = 'none' | 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'pop';

/**
 * How the parts of one message are arranged:
 * - `inline`: name and text flow on one line and wrap together.
 * - `stacked`: name on its own line, text below (bubbles).
 * - `columns`: name in a fixed column on the left, text fills the rest (tags).
 */
export type MessageArrangement = 'inline' | 'stacked' | 'columns';

/** Keys for per-role and per-highlight overrides. */
export type RoleKey = 'broadcaster' | 'moderator' | 'vip' | 'subscriber' | 'first-message';

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

export interface ChatTheme {
  schemaVersion: typeof THEME_SCHEMA_VERSION;
  id: string;
  name: string;
  /** Built-in presets are read-only; users duplicate them to edit. */
  builtIn?: boolean;
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

  roles: Partial<Record<RoleKey, RoleStyle>>;

  animation: {
    enter: EnterAnimation;
    /** ms */
    duration: number;
  };

  options: ChatThemeBehavior;

  /**
   * Extra CSS appended after the generated styles. Scoped to the chat root;
   * see docs/theming.md for the stable `.chatto-*` class names.
   */
  customCss: string;
}
