import {
  AFTER_SILENCE,
  assetFileOf,
  type BoxImage,
  type BoxStyle,
  type ChatTheme,
  type Corners,
  type EventStyle,
  type RoleKey,
  type ShadowSpec,
  type Sides,
} from '@chatto/core';
import { mapThemeImages } from './themes';

/**
 * Turns theme parameters into CSS for the shared chat markup. This is the
 * single "base" every theme renders through; a theme only changes values.
 * `base: 'blank'` returns an empty string so only the theme's custom CSS applies.
 */

const px = (value: number) => `${Math.round(value * 100) / 100}px`;
const em = (value: number) => `${Math.round(value * 1000) / 1000}em`;
const sides = ([top, right, bottom, left]: Sides) => `${px(top)} ${px(right)} ${px(bottom)} ${px(left)}`;
const corners = ([tl, tr, br, bl]: Corners) => `${px(tl)} ${px(tr)} ${px(br)} ${px(bl)}`;

/** Strips characters that could close the CSS string literal. */
const cssString = (text: string) =>
  `"${text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\n\r]/g, ' ')}"`;

export function boxShadowCss(shadow: ShadowSpec | null): string {
  if (!shadow) return 'none';
  return `${shadow.inset ? 'inset ' : ''}${px(shadow.x)} ${px(shadow.y)} ${px(shadow.blur)} ${px(shadow.spread)} ${shadow.color}`;
}

export function textShadowCss(shadow: ShadowSpec | null): string {
  if (!shadow) return 'none';
  return `${px(shadow.x)} ${px(shadow.y)} ${px(shadow.blur)} ${shadow.color}`;
}

const hasFill = (color: string) => color.trim() !== '' && color.trim().toLowerCase() !== 'transparent';

/**
 * A nine-slice frame. The frame is drawn in a transparent border as wide as the
 * scaled slices, so content sits inside it like it would inside a real border.
 * `image.src` must already be a loadable URL (see {@link themeToCss}).
 */
export function imageDeclarations(image: BoxImage): string[] {
  const [top, right, bottom, left] = image.slice;
  const width = sides(image.slice.map((slice) => slice * image.scale) as Sides);
  return [
    'border-style: solid',
    'border-color: transparent',
    `border-width: ${width}`,
    `border-image-source: url(${cssString(image.src)})`,
    `border-image-slice: ${top} ${right} ${bottom} ${left}${image.fill ? ' fill' : ''}`,
    `border-image-width: ${width}`,
    `border-image-outset: ${sides(image.outset)}`,
    `border-image-repeat: ${image.repeat}`,
  ];
}

function boxDeclarations(box: BoxStyle): string[] {
  const { image, shadow } = box;
  // A box-shadow would trace the rectangle, not the frame's outline; a drop shadow follows the image.
  const imageShadow = image && shadow && !shadow.inset;
  const declarations = [
    `background: ${box.background}`,
    `border-radius: ${corners(box.radius)}`,
    `padding: ${sides(box.padding)}`,
    `box-shadow: ${imageShadow ? 'none' : boxShadowCss(shadow)}`,
  ];
  if (image) {
    declarations.push(...imageDeclarations(image));
    if (imageShadow) {
      declarations.push(`filter: drop-shadow(${px(shadow.x)} ${px(shadow.y)} ${px(shadow.blur)} ${shadow.color})`);
    }
  } else {
    declarations.push(
      box.border.style === 'none' || box.border.width <= 0
        ? 'border: 0'
        : `border: ${px(box.border.width)} ${box.border.style} ${box.border.color}`,
      // Undo a frame an earlier rule (a role) put on the same element.
      'border-image: none',
    );
  }
  if (box.backdropBlur > 0) {
    declarations.push(
      `backdrop-filter: blur(${px(box.backdropBlur)})`,
      `-webkit-backdrop-filter: blur(${px(box.backdropBlur)})`,
    );
  }
  return declarations;
}

/** The colours of a box without its shape (radius, padding), for restyling another surface. */
function surfaceDeclarations(box: BoxStyle): string[] {
  return boxDeclarations(box).filter((line) => !line.startsWith('border-radius') && !line.startsWith('padding'));
}

const accentDeclarations = (style: EventStyle) =>
  style.accentWidth > 0 ? [`border-left: ${px(style.accentWidth)} solid ${style.accentColor}`] : [];

/** Roles that make an author more than a regular viewer. */
const RANKED_ROLES = ['broadcaster', 'moderator', 'vip', 'subscriber', 'founder'];

const ROLE_SELECTOR: Record<RoleKey, string> = {
  // :where keeps the specificity of a single class, so every other role or highlight still wins.
  viewer: `.chatto-message:where(${RANKED_ROLES.map((role) => `:not([data-roles~="${role}"])`).join('')})`,
  broadcaster: `.chatto-message[data-roles~="broadcaster"]`,
  moderator: `.chatto-message[data-roles~="moderator"]`,
  vip: `.chatto-message[data-roles~="vip"]`,
  subscriber: `.chatto-message[data-roles~="subscriber"]`,
  'first-message': `.chatto-message[data-highlight~="first-message"]`,
};

/** Generic event targets: system notices and chat messages that are events. */
const EVENT_NOTICE = '.chatto-notice';
const EVENT_MESSAGE = '.chatto-message[data-event]';

type Rule = (selector: string, declarations: string[]) => void;

interface EventContext {
  rule: Rule;
  arrangement: ChatTheme['message']['arrangement'];
  /** Corner radii of the message, header and body boxes; columns round the outer corners per part. */
  radii: { message: Corners; header: Corners; body: Corners };
  /** Whether a chat message's visible surface is its body (it has a fill) rather than the message box. */
  surfaceIsBody: boolean;
  /**
   * Set for per-event overrides: the base message and body boxes, re-applied to undo
   * whatever the generic event style set on the part this event leaves alone.
   */
  restore?: { message: BoxStyle; body: BoxStyle };
}

/** Emits one event style for a notice selector and a message-event selector. */
function eventRules(context: EventContext, style: EventStyle, notice: string, message: string) {
  const { rule, surfaceIsBody, restore } = context;
  const frame = [...boxDeclarations(style.box), ...accentDeclarations(style)];
  if (style.messageFrame === 'surface' && surfaceIsBody) {
    rule(notice, frame);
    rule(`${message} .chatto-body`, [...surfaceDeclarations(style.box), ...accentDeclarations(style)]);
    if (restore) rule(message, boxDeclarations(restore.message));
  } else {
    rule(`${notice}, ${message}`, frame);
    if (restore && surfaceIsBody) rule(`${message} .chatto-body`, surfaceDeclarations(restore.body));
  }
  rule(`${notice} .chatto-notice-system, ${message} .chatto-event-title`, [`color: ${style.titleColor}`]);
  rule(`${notice} .chatto-notice-system::before, ${message} .chatto-event-title::before`, [
    style.icon ? `content: ${cssString(`${style.icon} `)}` : 'content: none',
  ]);
  if (style.bodyColor) rule(`${notice} .chatto-body, ${message} .chatto-body`, [`color: ${style.bodyColor}`]);
  titleRules(context, style, message);
}

/**
 * Columns normally clip their overflow to round the tag, which would cut off anything
 * sticking out of the corner (stickers, labels). Instead the message stops clipping and
 * the header and body round the message's outer corners themselves.
 */
function unclipColumns(rule: Rule, message: string, radii: EventContext['radii']) {
  const [tl, tr, br, bl] = radii.message;
  const [htl, htr, hbr, hbl] = radii.header;
  const [btl, btr, bbr, bbl] = radii.body;
  rule(message, ['overflow: visible']);
  rule(`${message} .chatto-header`, [`border-radius: ${corners([Math.max(htl, tl), htr, hbr, Math.max(hbl, bl)])}`]);
  rule(`${message} .chatto-body`, [`border-radius: ${corners([btl, Math.max(btr, tr), Math.max(bbr, br), bbl])}`]);
}

/** A small pill on an element's top-right corner (event stickers, the attention label). */
const cornerPill = (background: string, color: string) => [
  'display: block',
  `background: ${background}`,
  `color: ${color}`,
  'font-size: 0.7em',
  'font-weight: 700',
  'line-height: 1.3',
  'padding: 2px 8px',
  'border-radius: 999px',
  'white-space: nowrap',
  'box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25)',
  'z-index: 1',
  '-webkit-text-stroke: 0',
  'text-shadow: none',
];

/** Undoes a sticker title (set by the generic event style) for an event that keeps its title on a line. */
const LINE_TITLE = [
  'position: static',
  'display: block',
  'background: transparent',
  'padding: 0',
  'border-radius: 0',
  'box-shadow: none',
  'transform: none',
  'white-space: normal',
  'font-size: 0.85em',
  'line-height: inherit',
];

/**
 * Places the title of an event chat message. A sticker sits on the top-right corner of the
 * message's visible surface: in stacked bubbles the title shares the body's grid cell, otherwise
 * it is positioned on the message box.
 */
function titleRules(
  { rule, arrangement, radii, surfaceIsBody, restore }: EventContext,
  style: EventStyle,
  message: string,
) {
  const title = `${message} .chatto-event-title`;
  const onBody = arrangement === 'stacked' && surfaceIsBody;
  const columns = arrangement === 'columns';
  if (style.titlePlacement !== 'sticker') {
    if (restore) {
      if (onBody) rule(`${message} .chatto-content`, ['display: flex']);
      if (columns) {
        rule(message, ['overflow: hidden']);
        rule(`${message} .chatto-header`, [`border-radius: ${corners(radii.header)}`]);
        rule(`${message} .chatto-body`, [`border-radius: ${corners(radii.body)}`]);
      }
      rule(title, [...LINE_TITLE, `color: ${style.titleColor}`]);
    }
    return;
  }
  const { background, color, rotate } = style.sticker;
  const look = cornerPill(background, color);
  const tilt = `rotate(${Math.round(rotate * 10) / 10}deg)`;
  if (onBody) {
    rule(`${message} .chatto-content`, ['display: grid', 'grid-template-columns: auto', 'justify-items: start']);
    rule(`${message} .chatto-reply`, ['grid-row: 1', 'grid-column: 1']);
    rule(`${message} .chatto-header`, ['grid-row: 2', 'grid-column: 1']);
    rule(`${message} .chatto-body`, ['grid-row: 3', 'grid-column: 1']);
    rule(title, [
      ...look,
      'position: relative',
      'grid-row: 3',
      'grid-column: 1',
      'justify-self: end',
      'align-self: start',
      `transform: translate(10px, -55%) ${tilt}`,
    ]);
    return;
  }
  rule(message, ['position: relative']);
  if (columns) unclipColumns(rule, message, radii);
  rule(title, [...look, 'position: absolute', 'top: 0', 'right: 8px', `transform: translateY(-55%) ${tilt}`]);
}

type Enter = Exclude<ChatTheme['animation']['enter'], 'none'>;
type Exit = Exclude<ChatTheme['animation']['exit'], 'none'>;

const ENTER_KEYFRAMES: Record<Enter, string> = {
  fade: 'from { opacity: 0; }',
  'slide-up': 'from { opacity: 0; transform: translateY(12px); }',
  'slide-left': 'from { opacity: 0; transform: translateX(-16px); }',
  'slide-right': 'from { opacity: 0; transform: translateX(16px); }',
  pop: 'from { opacity: 0; transform: scale(0.85); }',
  bounce:
    '0% { opacity: 0; transform: translateY(-24px) scale(0.9); } 55% { opacity: 1; transform: translateY(6px) scale(1.02); } 75% { transform: translateY(-3px); } 100% { transform: none; }',
  shake:
    '0% { opacity: 0; } 15% { opacity: 1; transform: translateX(-8px) rotate(-2deg); } 35% { transform: translateX(7px) rotate(1.5deg); } 55% { transform: translateX(-5px) rotate(-1deg); } 75% { transform: translateX(3px); } 100% { transform: none; }',
  zoom: 'from { opacity: 0; transform: scale(1.35); filter: blur(4px); }',
};

const ENTER_EASING: Record<Enter, string> = {
  fade: 'ease-out',
  'slide-up': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  'slide-left': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  'slide-right': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  pop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce: 'ease-out',
  shake: 'ease-out',
  zoom: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
};

const EXIT_KEYFRAMES: Record<Exit, string> = {
  fade: 'to { opacity: 0; }',
  'slide-up': 'to { opacity: 0; transform: translateY(-12px); }',
  'slide-left': 'to { opacity: 0; transform: translateX(-16px); }',
  'slide-right': 'to { opacity: 0; transform: translateX(16px); }',
  pop: 'to { opacity: 0; transform: scale(0.85); }',
  zoom: 'to { opacity: 0; transform: scale(1.25); filter: blur(4px); }',
};

/** The colour comes from `--chatto-attention` on the element, so one keyframe set serves every theme. */
const ATTENTION_KEYFRAMES: Record<Exclude<ChatTheme['attention']['effect'], 'none'>, string> = {
  glow: '0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 0 3px var(--chatto-attention), 0 0 18px 4px var(--chatto-attention); }',
  pulse:
    '0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; } 50% { transform: scale(1.04); box-shadow: 0 0 0 2px var(--chatto-attention); }',
  shake:
    '0%, 100% { transform: none; } 20% { transform: translateX(-5px) rotate(-1deg); } 40% { transform: translateX(5px) rotate(1deg); } 60% { transform: translateX(-3px); } 80% { transform: translateX(2px); }',
};

/** How long an alert card's exit animation runs, so the alerts viewer can wait for it, ms. */
export function exitDurationMs(theme: ChatTheme): number {
  return theme.base === 'styled' && theme.animation.exit !== 'none' ? theme.animation.duration : 0;
}

/**
 * @param scope selector of the chat root this CSS applies to,
 *              e.g. `.chatto-root[data-chatto-id="t1"]`.
 */
export function themeToCss(theme: ChatTheme, scope = '.chatto-root', options: ThemeCssOptions = {}): string {
  if (theme.base === 'blank') return '';
  theme = resolveImages(theme, options.assetUrl ?? defaultAssetUrl);

  const {
    font,
    text,
    list,
    message,
    author,
    body,
    avatar,
    badges,
    timestamp,
    emote,
    mention,
    reply,
    notice,
    animation,
  } = theme;
  // The root selector adds no specificity, so custom CSS like `.chatto-author { … }` beats the
  // generated `.chatto-author` without repeating `.chatto-root`. Parts keep their own weight,
  // so a role's style still wins over the plain one.
  const at = `:where(${scope})`;
  const rules: string[] = [];
  const rule = (selector: string, declarations: string[]) => {
    const selectors = selector
      .split(',')
      .map((part) => `${at} ${part.trim()}`.trimEnd())
      .join(',\n');
    rules.push(`${selectors} {\n  ${declarations.join(';\n  ')};\n}`);
  };
  const root = (declarations: string[]) => rules.push(`${at} {\n  ${declarations.join(';\n  ')};\n}`);

  // Root: typography and the stroke/shadow every text inherits.
  root([
    'box-sizing: border-box',
    'height: 100%',
    'overflow: hidden',
    'display: flex',
    'flex-direction: column',
    `justify-content: ${list.direction === 'top-down' ? 'flex-start' : 'flex-end'}`,
    `font-family: ${font.family}`,
    `font-size: ${px(font.size)}`,
    `font-weight: ${font.weight}`,
    `line-height: ${font.lineHeight}`,
    `letter-spacing: ${em(font.letterSpacing)}`,
    `color: ${text.color}`,
    `text-shadow: ${textShadowCss(text.shadow)}`,
    '-webkit-font-smoothing: antialiased',
    ...(text.strokeWidth > 0
      ? [`-webkit-text-stroke: ${px(text.strokeWidth)} ${text.strokeColor}`, 'paint-order: stroke fill']
      : []),
  ]);
  rule('*, *::before, *::after', ['box-sizing: inherit']);

  // List panel.
  rule('.chatto-list', [
    'list-style: none',
    'margin: 0',
    'display: flex',
    'flex-direction: column',
    `gap: ${px(list.gap)}`,
    `align-items: ${list.align === 'start' ? 'flex-start' : list.align === 'end' ? 'flex-end' : 'stretch'}`,
    // The list shrinks to the root when chat overflows; pack rows at the newest end so the
    // oldest ones are clipped instead of the newest.
    `justify-content: ${list.direction === 'top-down' ? 'flex-start' : 'flex-end'}`,
    'min-height: 0',
    ...boxDeclarations(list.box),
  ]);

  // Rows keep their natural height; the root clips the oldest ones instead.
  // Without this, rows with overflow:hidden (columns) get squashed when the list overflows.
  rule('.chatto-list > li', ['flex-shrink: 0']);

  // Message container.
  rule('.chatto-message', [
    'display: flex',
    `gap: ${px(message.gap)}`,
    `align-items: ${message.align === 'center' ? 'center' : message.align === 'end' ? 'flex-end' : 'flex-start'}`,
    'overflow-wrap: anywhere',
    ...(message.maxWidth > 0 ? [`max-width: ${px(message.maxWidth)}`] : []),
    ...(message.arrangement === 'columns' ? ['overflow: hidden'] : []),
    ...boxDeclarations(message.box),
  ]);

  // Arrangement of header and body.
  if (message.arrangement === 'inline') {
    rule('.chatto-content', ['min-width: 0', 'flex: 1']);
    rule('.chatto-header', ['display: inline']);
    rule('.chatto-body', ['display: inline']);
  } else if (message.arrangement === 'stacked') {
    rule('.chatto-content', ['min-width: 0', 'display: flex', 'flex-direction: column', 'align-items: flex-start']);
    rule('.chatto-header', ['display: flex', 'align-items: center', 'flex-wrap: wrap']);
    rule('.chatto-body', ['display: inline-block', 'max-width: 100%']);
  } else {
    rule('.chatto-content', ['min-width: 0', 'flex: 1', 'display: flex', 'flex-wrap: wrap', 'align-items: stretch']);
    rule('.chatto-reply, .chatto-event-title', ['flex-basis: 100%']);
    rule('.chatto-header', ['display: flex', 'align-items: center', 'flex: none']);
    rule('.chatto-body', ['display: block', 'flex: 1', 'min-width: 0']);
  }

  // Header box (time, badges, name).
  rule('.chatto-header', [...boxDeclarations(author.box)]);
  rule('.chatto-author', [
    // The platform name color arrives as --chatto-user-color so custom CSS can still override it.
    `color: ${author.useUserColor ? `var(--chatto-user-color, ${author.color})` : author.color}`,
    `font-weight: ${author.weight}`,
    `font-size: ${em(author.size)}`,
    `text-transform: ${author.transform}`,
  ]);
  if (author.prefix) rule('.chatto-author::before', [`content: ${cssString(author.prefix)}`]);
  if (author.suffix) rule('.chatto-author::after', [`content: ${cssString(author.suffix)}`]);
  rule('.chatto-separator::after', [`content: ${cssString(author.separator)}`, 'white-space: pre']);

  // Body.
  rule('.chatto-body', [
    ...(body.color ? [`color: ${body.color}`] : []),
    `font-size: ${em(body.size)}`,
    `font-weight: ${body.weight}`,
    `font-style: ${body.italic ? 'italic' : 'normal'}`,
    ...boxDeclarations(body.box),
  ]);
  rule('.chatto-message[data-action] .chatto-body', ['font-style: italic']);

  // Avatar.
  rule('.chatto-avatar', [
    'flex: none',
    `width: ${px(avatar.size)}`,
    `height: ${px(avatar.size)}`,
    `border-radius: ${avatar.radius}%`,
    'display: grid',
    'place-items: center',
    'overflow: hidden',
    `font-size: ${px(avatar.size * 0.45)}`,
    'font-weight: 700',
    'color: #fff',
    '-webkit-text-stroke: 0',
  ]);
  rule('.chatto-avatar img', ['width: 100%', 'height: 100%', 'object-fit: cover']);

  // Badges.
  rule('.chatto-badges', [
    'display: inline-flex',
    `gap: ${px(badges.gap)}`,
    'margin-right: 0.3em',
    'vertical-align: -0.15em',
  ]);
  rule('.chatto-badge', [
    'display: inline-block',
    `width: ${em(badges.size)}`,
    `height: ${em(badges.size)}`,
    `border-radius: ${px(badges.radius)}`,
  ]);

  // Timestamp.
  rule('.chatto-time', [
    `color: ${timestamp.color}`,
    `font-size: ${em(timestamp.size)}`,
    'margin-right: 0.4em',
    'font-variant-numeric: tabular-nums',
  ]);

  // Inline content.
  rule('.chatto-emote', [
    'display: inline-block',
    `height: ${em(emote.size)}`,
    'vertical-align: middle',
    `margin: ${em(-(emote.size - 1) / 2.2)} 0.05em`,
  ]);
  rule('.chatto-emote[data-zero-width]', [`margin-left: ${em(-(emote.size + 0.1))}`]);
  rule('.chatto-mention, .chatto-link', [
    `color: ${mention.color}`,
    `font-weight: ${mention.weight}`,
    ...(hasFill(mention.background)
      ? [`background: ${mention.background}`, 'border-radius: 0.3em', 'padding: 0 0.25em']
      : []),
  ]);
  rule('.chatto-cheer', [`color: ${text.accentColor}`, 'font-weight: 700']);
  rule('.chatto-cheer img', ['display: inline-block', 'height: 1.3em', 'vertical-align: middle']);
  rule('.chatto-media', ['display: block', 'max-height: 5em', 'margin-top: 4px', 'border-radius: 6px']);
  rule('.chatto-reply', [
    reply.show ? 'display: block' : 'display: none',
    `color: ${reply.color}`,
    'font-size: 0.8em',
    'white-space: nowrap',
    'overflow: hidden',
    'text-overflow: ellipsis',
  ]);

  // Notices (subs, raids, announcements) share structure; colors come from event rules below.
  rule('.chatto-notice', ['display: flex', 'flex-direction: column', 'gap: 2px', 'overflow-wrap: anywhere']);
  rule('.chatto-notice-system, .chatto-event-title', ['font-weight: 700']);
  rule('.chatto-event-title', ['display: block', 'font-size: 0.85em']);
  rule('.chatto-notice .chatto-body', [
    'display: block',
    'background: transparent',
    'padding: 0',
    'border: 0',
    'box-shadow: none',
  ]);

  // Per-role / highlight overrides.
  const surfaceIsBody = hasFill(body.box.background);
  for (const [key, style] of Object.entries(theme.roles) as [RoleKey, NonNullable<ChatTheme['roles'][RoleKey]>][]) {
    const base = ROLE_SELECTOR[key];
    if (!base || !style) continue;
    if (style.nameColor) rule(`${base} .chatto-author`, [`color: ${style.nameColor}`]);
    if (style.nameBackground) rule(`${base} .chatto-header`, [`background: ${style.nameBackground}`]);
    if (style.surfaceBackground) {
      rule(surfaceIsBody ? `${base} .chatto-body` : base, [`background: ${style.surfaceBackground}`]);
    }
    if (style.borderColor) rule(surfaceIsBody ? `${base} .chatto-body` : base, [`border-color: ${style.borderColor}`]);
    if (style.frame) rule(surfaceIsBody ? `${base} .chatto-body` : base, imageDeclarations(style.frame));
  }

  // Events: the generic style, then each event that has its own style.
  // These come after role rules so an event's look wins over the author's role.
  const radii = { message: message.box.radius, header: author.box.radius, body: body.box.radius };
  eventRules({ rule, arrangement: message.arrangement, radii, surfaceIsBody }, notice, EVENT_NOTICE, EVENT_MESSAGE);
  const restore = { message: message.box, body: body.box };
  for (const [key, override] of Object.entries(theme.events)) {
    if (!override || override.linked) continue;
    const attr = `[data-event=${cssString(key)}]`;
    eventRules(
      { rule, arrangement: message.arrangement, radii, surfaceIsBody, restore },
      override.style,
      `.chatto-notice${attr}`,
      `.chatto-message${attr}`,
    );
  }

  // Motion: row enter animation, alert card exit animation, and the attention effect.
  const motion: string[] = [];
  const enterKind = animation.enter !== 'none' && animation.duration > 0 ? animation.enter : null;
  const enter = enterKind ? `chatto-enter-${enterKind} ${animation.duration}ms ${ENTER_EASING[enterKind]} both` : null;
  if (enterKind) {
    rules.push(`@keyframes chatto-enter-${enterKind} { ${ENTER_KEYFRAMES[enterKind]} }`);
    motion.push(`${at} .chatto-list > li {\n  animation: ${enter};\n}`);
  }
  if (animation.exit !== 'none' && animation.duration > 0) {
    rules.push(`@keyframes chatto-exit-${animation.exit} { ${EXIT_KEYFRAMES[animation.exit]} }`);
    motion.push(
      `${at}[data-leaving] .chatto-list > li {\n  animation: chatto-exit-${animation.exit} ${animation.duration}ms ease-in forwards;\n}`,
    );
  }

  // A message that broke a quiet spell. Only the desktop overlay receives this highlight.
  const { attention } = theme;
  const calm = `.chatto-message[data-highlight~=${cssString(AFTER_SILENCE)}]`;
  const surface = surfaceIsBody ? `${calm} .chatto-body` : calm;
  const labels = attention.labels ?? {};
  // A language without its own text shows the default label, or failing that any translation.
  const label = attention.label || Object.values(labels).find(Boolean) || '';
  if (attention.effect !== 'none' || label) {
    rule(surface, ['position: relative', `--chatto-attention: ${attention.color}`]);
  }
  if (label) {
    if (message.arrangement === 'columns') unclipColumns(rule, calm, radii);
    rule(`${surface}::after`, [
      `content: ${cssString(label)}`,
      ...cornerPill(attention.color, attention.labelColor),
      'font-size: 0.65em',
      'position: absolute',
      'top: 0',
      'right: 8px',
      'transform: translateY(-55%) rotate(-4deg)',
    ]);
    // The chat root carries the chat language (`lang`). Kept inside :where() like the rest.
    for (const [locale, text] of Object.entries(labels)) {
      if (!text || text === label) continue;
      rules.push(`:where(${scope}:lang(${locale})) ${surface}::after {\n  content: ${cssString(text)};\n}`);
    }
  }
  if (attention.effect !== 'none' && attention.repeat > 0) {
    rules.push(`@keyframes chatto-attention-${attention.effect} { ${ATTENTION_KEYFRAMES[attention.effect]} }`);
    const effect = `chatto-attention-${attention.effect} 0.9s ease-in-out ${Math.round(attention.repeat)}`;
    if (surfaceIsBody) motion.push(`${at} ${surface} {\n  animation: ${effect};\n}`);
    // On the row itself, keep the row's enter animation alongside the effect.
    else motion.push(`${at} .chatto-list > li${calm} {\n  animation: ${enter ? `${enter}, ${effect}` : effect};\n}`);
  }
  if (motion.length > 0) {
    rules.push(`@media (prefers-reduced-motion: no-preference) {\n${motion.join('\n')}\n}`);
  }

  return rules.join('\n');
}

export interface ThemeCssOptions {
  /** URL of a file in Chatto's asset folder; defaults to the local server's `/theme-assets/` path. */
  assetUrl?: (file: string) => string;
}

/** Viewer pages are served by the local server, so a relative path reaches its assets. */
export const defaultAssetUrl = (file: string) => `/theme-assets/${file}`;

/** Turns `asset:` frame sources into URLs; data URLs pass through. */
function resolveImages(theme: ChatTheme, assetUrl: (file: string) => string): ChatTheme {
  return mapThemeImages(theme, (image) => {
    const file = assetFileOf(image.src);
    return { ...image, src: file ? assetUrl(file) : image.src };
  });
}

/**
 * Wraps user CSS so it only affects one chat view. Inside `@scope`, selectors
 * only reach descendants, so `.chatto-root` is rewritten to `:scope` to keep
 * rules for the root element itself working.
 */
export function scopeCustomCss(css: string, scope: string): string {
  if (!css.trim()) return '';
  const rooted = css.replace(/\.chatto-root(?![\w-])/g, ':scope');
  return `@scope (${scope}) {\n${rooted}\n}`;
}
