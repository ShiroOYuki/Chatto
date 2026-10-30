import { THEME_SCHEMA_VERSION, type BoxStyle, type ChatTheme, type EventOverride, type EventStyle } from '@chatto/core';

/** Deep partial used to describe presets as overrides of the base theme. */
export type ThemeOverrides<T = ChatTheme> = {
  [K in keyof T]?: T[K] extends unknown[] ? T[K] : T[K] extends object ? ThemeOverrides<T[K]> : T[K];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Recursively merges plain objects; arrays and primitives replace. */
export function mergeDeep<T>(base: T, overrides: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(overrides)) return (overrides === undefined ? base : overrides) as T;
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    result[key] = isPlainObject(value) && isPlainObject(result[key]) ? mergeDeep(result[key], value) : value;
  }
  return result as T;
}

/** An empty, invisible box: no fill, border, radius, padding, shadow or blur. */
export function emptyBox(overrides: ThemeOverrides<BoxStyle> = {}): BoxStyle {
  return mergeDeep<BoxStyle>(
    {
      background: 'transparent',
      border: { width: 0, style: 'solid', color: 'transparent' },
      radius: [0, 0, 0, 0],
      padding: [0, 0, 0, 0],
      shadow: null,
      backdropBlur: 0,
    },
    overrides,
  );
}

const sans = "'Huninn', 'Noto Sans TC', 'Inter', system-ui, sans-serif";

/**
 * The one base every theme is built from. Presets below only override values;
 * the editor exposes every field, so users can rebuild any preset by hand.
 */
export const BASE_THEME: ChatTheme = {
  schemaVersion: THEME_SCHEMA_VERSION,
  id: 'base',
  name: '基底',
  base: 'styled',
  font: { family: sans, size: 16, lineHeight: 1.45, letterSpacing: 0, weight: 400 },
  text: {
    color: '#FFFFFF',
    mutedColor: '#B4B2A9',
    accentColor: '#C0DD97',
    strokeWidth: 0,
    strokeColor: '#000000',
    shadow: null,
  },
  list: { box: emptyBox(), gap: 6, direction: 'bottom-up', align: 'stretch' },
  message: { box: emptyBox(), arrangement: 'inline', gap: 8, maxWidth: 0, align: 'start' },
  author: {
    color: '#9FE1CB',
    useUserColor: true,
    weight: 700,
    size: 1,
    transform: 'none',
    prefix: '',
    suffix: '',
    separator: ': ',
    box: emptyBox(),
  },
  body: { color: '', size: 1, weight: 400, italic: false, box: emptyBox() },
  avatar: { show: false, size: 28, radius: 50 },
  badges: { show: true, size: 1.1, gap: 3, radius: 3 },
  timestamp: { show: false, hour12: false, color: '#B4B2A9', size: 0.85 },
  emote: { size: 1.75 },
  mention: { color: '#C0DD97', background: 'transparent', weight: 600 },
  reply: { show: true, color: '#B4B2A9' },
  notice: {
    box: emptyBox({ padding: [0, 0, 0, 10] }),
    accentColor: '#C0DD97',
    accentWidth: 3,
    titleColor: '#C0DD97',
    bodyColor: '',
    icon: '',
  },
  events: {},
  roles: {},
  animation: { enter: 'slide-up', duration: 260 },
  options: {
    messageLifetime: 0,
    maxMessages: 50,
    hiddenUsers: ['nightbot', 'streamelements', 'moobot'],
    hiddenPrefixes: ['!'],
  },
  customCss: '',
};

/** Builds a theme from the base plus overrides. */
export function createTheme(id: string, name: string, overrides: ThemeOverrides = {}): ChatTheme {
  return { ...mergeDeep(BASE_THEME, overrides), id, name };
}

const preset = (id: string, name: string, overrides: ThemeOverrides): ChatTheme => ({
  ...createTheme(id, name, overrides),
  builtIn: true,
});

/** Starter stylesheet for blank themes: a readable minimum to build on. */
export const BLANK_STARTER_CSS = `/*
 * Blank 主題：Chatto 不產生任何樣式，以下全部由你決定。
 * 可用的 class 與屬性請見 docs/theming.md，例如：
 *   .chatto-root  .chatto-list  .chatto-message[data-roles~="moderator"]
 *   .chatto-header  .chatto-author  .chatto-separator  .chatto-body
 *   .chatto-emote  .chatto-mention  .chatto-badge  .chatto-notice
 */

.chatto-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  font: 16px/1.5 sans-serif;
  color: white;
}

.chatto-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.chatto-header,
.chatto-body {
  display: inline;
}

/* 平台上的名稱顏色 */
.chatto-author {
  color: var(--chatto-user-color, inherit);
  font-weight: bold;
}

.chatto-separator::after {
  content: ': ';
}

.chatto-emote {
  height: 1.5em;
  vertical-align: middle;
}

.chatto-badge {
  height: 1.1em;
  margin-right: 0.2em;
  vertical-align: -0.15em;
}

.chatto-notice-system,
.chatto-event-title {
  display: block;
  font-weight: bold;
}
`;

/** Built-in presets: every one is the same base with different parameters. */
export const PRESET_THEMES: ChatTheme[] = [
  preset('matcha-glass', '抹茶玻璃', {
    text: { color: '#EAF3DE', mutedColor: '#9FE1CB', accentColor: '#C0DD97' },
    message: {
      box: {
        background: 'rgba(30, 70, 50, 0.72)',
        border: { width: 1, style: 'solid', color: 'rgba(159, 225, 203, 0.35)' },
        radius: [12, 12, 12, 12],
        padding: [6, 12, 6, 12],
      },
    },
    author: { color: '#9FE1CB' },
    mention: { color: '#C0DD97' },
    notice: {
      box: {
        background: 'rgba(30, 70, 50, 0.72)',
        border: { width: 1, style: 'solid', color: 'rgba(159, 225, 203, 0.35)' },
        radius: [12, 12, 12, 12],
        padding: [6, 12, 6, 12],
      },
    },
  }),
  preset('washi', '和紙', {
    font: { family: "'Noto Serif TC', 'Noto Serif JP', serif" },
    text: { color: '#2C2C2A', mutedColor: '#5F5E5A', accentColor: '#A32D2D' },
    message: { box: { background: '#F6F0E2', radius: [2, 2, 2, 2], padding: [6, 12, 6, 12] } },
    author: { color: '#712B13', useUserColor: false },
    mention: { color: '#A32D2D' },
    reply: { color: '#5F5E5A' },
    timestamp: { color: '#5F5E5A' },
    notice: {
      box: { background: '#F6F0E2', radius: [2, 2, 2, 2], padding: [6, 12, 6, 12] },
      accentColor: '#A32D2D',
      titleColor: '#A32D2D',
    },
    animation: { enter: 'fade', duration: 240 },
  }),
  preset('bubble', '泡泡', {
    text: { color: '#712B13', mutedColor: '#F5C4B3', accentColor: '#D85A30' },
    list: { gap: 8 },
    message: { arrangement: 'stacked', align: 'end' },
    author: { color: '#F5C4B3', weight: 600, size: 0.75, separator: '', box: { padding: [0, 0, 2, 8] } },
    body: { box: { background: '#FAECE7', radius: [16, 16, 16, 4], padding: [6, 12, 6, 12] } },
    avatar: { show: true, size: 28 },
    mention: { color: '#D85A30' },
    reply: { color: '#F5C4B3' },
    notice: {
      box: { background: '#FAECE7', radius: [16, 16, 16, 16], padding: [6, 12, 6, 12] },
      accentWidth: 0,
      titleColor: '#D85A30',
    },
    animation: { enter: 'pop', duration: 320 },
  }),
  preset('outline', '極簡描邊', {
    font: { size: 18 },
    text: { color: '#FFFFFF', mutedColor: '#D3D1C7', accentColor: '#FAC775', strokeWidth: 4, strokeColor: '#000000' },
    list: { gap: 4 },
    message: { box: { padding: [2, 0, 2, 0] } },
    author: { color: '#9FE1CB', weight: 800 },
    mention: { color: '#FAC775' },
    notice: { accentColor: '#FAC775', titleColor: '#FAC775' },
  }),
  preset('noren', '暖簾', {
    text: { color: '#E6F1FB', mutedColor: '#B5D4F4', accentColor: '#FAC775' },
    message: { arrangement: 'columns', gap: 0, box: { radius: [6, 6, 6, 6] } },
    author: {
      color: '#E6F1FB',
      useUserColor: false,
      separator: '',
      box: { background: '#0C447C', padding: [6, 10, 6, 10] },
    },
    body: { box: { background: 'rgba(4, 44, 83, 0.8)', padding: [6, 10, 6, 10] } },
    reply: { show: false },
    mention: { color: '#FAC775' },
    notice: {
      box: { background: 'rgba(4, 44, 83, 0.8)', radius: [6, 6, 6, 6], padding: [6, 10, 6, 10] },
      accentColor: '#FAC775',
      titleColor: '#FAC775',
    },
    animation: { enter: 'slide-left', duration: 260 },
  }),
  preset('terminal', '終端機', {
    font: { family: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace", size: 14 },
    text: { color: '#D3D1C7', mutedColor: '#888780', accentColor: '#5DCAA5' },
    list: {
      gap: 0,
      box: { background: 'rgba(10, 14, 20, 0.78)', radius: [6, 6, 6, 6], padding: [8, 0, 8, 0] },
    },
    message: { box: { padding: [2, 10, 2, 10] } },
    author: { color: '#5DCAA5', weight: 600, prefix: '@', separator: ' ' },
    badges: { show: false },
    timestamp: { show: true, color: '#888780', size: 1 },
    mention: { color: '#5DCAA5' },
    notice: { box: { padding: [2, 10, 2, 10] }, accentColor: '#5DCAA5', titleColor: '#5DCAA5' },
    animation: { enter: 'none' },
  }),
  preset('blank', 'Blank（自訂 CSS）', {
    base: 'blank',
    customCss: BLANK_STARTER_CSS,
  }),
];

export const DEFAULT_THEME_ID = 'matcha-glass';

export function getPresetTheme(id: string): ChatTheme | undefined {
  return PRESET_THEMES.find((theme) => theme.id === id);
}

/** Creates an editable copy of a theme with a new id. */
export function duplicateTheme(theme: ChatTheme, name: string): ChatTheme {
  return {
    ...structuredClone(theme),
    id: `custom-${Date.now().toString(36)}`,
    name,
    builtIn: false,
  };
}

// ---------- migration ----------

interface ThemeV1 {
  schemaVersion: 1;
  id: string;
  name: string;
  layout: string;
  palette: Record<string, string>;
  typography: { fontFamily: string; fontSize: number; nameWeight: number; textStrokeWidth: number };
  shape: { radius: number; borderWidth: number; padding: [number, number]; gap: number };
  options: {
    showBadges: boolean;
    showAvatars: boolean;
    showTimestamps: boolean;
    useUserColors: boolean;
    direction: 'bottom-up' | 'top-down';
    messageLifetime: number;
    maxMessages: number;
    enterAnimation: ChatTheme['animation']['enter'];
    hiddenUsers: string[];
    hiddenPrefixes: string[];
  };
  customCss: string;
}

function migrateV1(v1: ThemeV1): ChatTheme {
  const { palette: p, typography: t, shape: s, options: o } = v1;
  const pad: [number, number, number, number] = [s.padding[0], s.padding[1], s.padding[0], s.padding[1]];
  const r: [number, number, number, number] = [s.radius, s.radius, s.radius, s.radius];
  const surface = emptyBox({
    background: p.surface,
    border: { width: s.borderWidth, style: 'solid', color: p.border },
    radius: r,
    padding: pad,
  });
  const layout = v1.layout;
  return createTheme(v1.id, v1.name, {
    font: { family: t.fontFamily, size: t.fontSize },
    text: {
      color: p.text,
      mutedColor: p.mutedText,
      accentColor: p.accent,
      strokeWidth: t.textStrokeWidth,
      strokeColor: p.textStroke,
    },
    list: {
      gap: s.gap,
      direction: o.direction,
      box: layout === 'terminal' ? emptyBox({ background: p.surface, radius: r, padding: [8, 0, 8, 0] }) : emptyBox(),
    },
    message: {
      arrangement: layout === 'bubble' ? 'stacked' : layout === 'tag' ? 'columns' : 'inline',
      box: layout === 'card' ? surface : layout === 'tag' ? emptyBox({ radius: r }) : emptyBox({ padding: pad }),
      gap: layout === 'tag' ? 0 : 8,
    },
    author: {
      color: p.name,
      useUserColor: o.useUserColors,
      weight: t.nameWeight,
      prefix: layout === 'terminal' ? '@' : '',
      separator: layout === 'bubble' || layout === 'tag' ? '' : layout === 'terminal' ? ' ' : ': ',
      box: layout === 'tag' ? emptyBox({ background: p.nameSurface, padding: pad }) : emptyBox(),
    },
    body: {
      box:
        layout === 'bubble'
          ? { ...surface, radius: [s.radius, s.radius, s.radius, 4] }
          : layout === 'tag'
            ? emptyBox({ background: p.surface, padding: pad })
            : emptyBox(),
    },
    avatar: { show: o.showAvatars },
    badges: { show: o.showBadges },
    timestamp: { show: o.showTimestamps, color: p.mutedText },
    mention: { color: p.accent },
    notice: { accentColor: p.accent, titleColor: p.accent },
    animation: { enter: o.enterAnimation },
    options: {
      messageLifetime: o.messageLifetime,
      maxMessages: o.maxMessages,
      hiddenUsers: o.hiddenUsers,
      hiddenPrefixes: o.hiddenPrefixes,
    },
    customCss: v1.customCss,
  });
}

/**
 * Brings a stored or imported theme up to the current schema and fills any
 * missing fields from the base, so older files keep working.
 */
export function normalizeTheme(raw: unknown): ChatTheme {
  const version = (raw as { schemaVersion?: number } | null)?.schemaVersion;
  if (version === 1) return migrateV1(raw as ThemeV1);
  if (version !== THEME_SCHEMA_VERSION) throw new Error(`Unsupported theme schema ${version}`);
  const data = raw as Partial<ChatTheme>;
  const theme = mergeDeep(BASE_THEME, data);
  // Roles once had a 'highlighted' entry; that is now the twitch:highlighted event.
  const { highlighted: _legacy, ...roles } = theme.roles as ChatTheme['roles'] & { highlighted?: unknown };
  const events: ChatTheme['events'] = {};
  for (const [key, override] of Object.entries(theme.events ?? {})) {
    if (!isPlainObject(override)) continue;
    events[key] = {
      linked: (override as Partial<EventOverride>).linked !== false,
      style: mergeDeep(theme.notice, (override as Partial<EventOverride>).style),
    };
  }
  return {
    ...theme,
    roles,
    events,
    id: data.id ?? `custom-${Date.now().toString(36)}`,
    name: data.name ?? '未命名主題',
  };
}

// ---------- events ----------

/**
 * The style an event renders with: its own style when unlinked, otherwise
 * the generic event style (`theme.notice`), which linked events follow.
 */
export function resolveEventStyle(theme: ChatTheme, key: string): EventStyle {
  const override = theme.events[key];
  return override && !override.linked ? override.style : theme.notice;
}

/** Links an event back to the generic event style (keeps its last own style). */
export function linkEvent(theme: ChatTheme, key: string): ChatTheme {
  const current = theme.events[key];
  return {
    ...theme,
    events: { ...theme.events, [key]: { linked: true, style: structuredClone(current?.style ?? theme.notice) } },
  };
}

/**
 * Applies an edit to one event's style. A linked event first copies the
 * generic style, so editing it unlinks it without losing the current look.
 */
export function editEventStyle(theme: ChatTheme, key: string, update: (style: EventStyle) => EventStyle): ChatTheme {
  const start = structuredClone(resolveEventStyle(theme, key));
  return { ...theme, events: { ...theme.events, [key]: { linked: false, style: update(start) } } };
}
