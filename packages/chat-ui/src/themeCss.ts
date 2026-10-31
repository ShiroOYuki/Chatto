import type { BoxStyle, ChatTheme, Corners, EventStyle, RoleKey, ShadowSpec, Sides } from '@chatto/core';

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

function boxDeclarations(box: BoxStyle): string[] {
  const declarations = [
    `background: ${box.background}`,
    `border-radius: ${corners(box.radius)}`,
    `padding: ${sides(box.padding)}`,
    `box-shadow: ${boxShadowCss(box.shadow)}`,
  ];
  declarations.push(
    box.border.style === 'none' || box.border.width <= 0
      ? 'border: 0'
      : `border: ${px(box.border.width)} ${box.border.style} ${box.border.color}`,
  );
  if (box.backdropBlur > 0) {
    declarations.push(
      `backdrop-filter: blur(${px(box.backdropBlur)})`,
      `-webkit-backdrop-filter: blur(${px(box.backdropBlur)})`,
    );
  }
  return declarations;
}

const ROLE_SELECTOR: Record<RoleKey, string> = {
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

/** Emits one event style for a notice selector and a message-event selector. */
function eventRules(rule: Rule, style: EventStyle, notice: string, message: string) {
  rule(`${notice}, ${message}`, [
    ...boxDeclarations(style.box),
    ...(style.accentWidth > 0 ? [`border-left: ${px(style.accentWidth)} solid ${style.accentColor}`] : []),
  ]);
  rule(`${notice} .chatto-notice-system, ${message} .chatto-event-title`, [`color: ${style.titleColor}`]);
  rule(`${notice} .chatto-notice-system::before, ${message} .chatto-event-title::before`, [
    style.icon ? `content: ${cssString(`${style.icon} `)}` : 'content: none',
  ]);
  if (style.bodyColor) rule(`${notice} .chatto-body, ${message} .chatto-body`, [`color: ${style.bodyColor}`]);
}

const ENTER_KEYFRAMES: Record<Exclude<ChatTheme['animation']['enter'], 'none'>, string> = {
  fade: 'from { opacity: 0; }',
  'slide-up': 'from { opacity: 0; transform: translateY(12px); }',
  'slide-left': 'from { opacity: 0; transform: translateX(-16px); }',
  'slide-right': 'from { opacity: 0; transform: translateX(16px); }',
  pop: 'from { opacity: 0; transform: scale(0.85); }',
};

const ENTER_EASING: Record<Exclude<ChatTheme['animation']['enter'], 'none'>, string> = {
  fade: 'ease-out',
  'slide-up': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  'slide-left': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  'slide-right': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  pop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

/**
 * @param scope selector of the chat root this CSS applies to,
 *              e.g. `.chatto-root[data-chatto-id="t1"]`.
 */
export function themeToCss(theme: ChatTheme, scope = '.chatto-root'): string {
  if (theme.base === 'blank') return '';

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
  const rules: string[] = [];
  const rule = (selector: string, declarations: string[]) => {
    const selectors = selector
      .split(',')
      .map((part) => `${scope} ${part.trim()}`.trimEnd())
      .join(',\n');
    rules.push(`${selectors} {\n  ${declarations.join(';\n  ')};\n}`);
  };
  const root = (declarations: string[]) => rules.push(`${scope} {\n  ${declarations.join(';\n  ')};\n}`);

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
  }

  // Events: the generic style, then each event that has its own style.
  // These come after role rules so an event's look wins over the author's role.
  eventRules(rule, notice, EVENT_NOTICE, EVENT_MESSAGE);
  for (const [key, override] of Object.entries(theme.events)) {
    if (!override || override.linked) continue;
    const attr = `[data-event=${cssString(key)}]`;
    eventRules(rule, override.style, `.chatto-notice${attr}`, `.chatto-message${attr}`);
  }

  // Enter animation.
  if (animation.enter !== 'none' && animation.duration > 0) {
    const name = `chatto-enter-${animation.enter}`;
    rules.push(`@keyframes ${name} { ${ENTER_KEYFRAMES[animation.enter]} }`);
    rules.push(
      `@media (prefers-reduced-motion: no-preference) {\n${scope} .chatto-list > li {\n  animation: ${name} ${animation.duration}ms ${ENTER_EASING[animation.enter]} both;\n}\n}`,
    );
  }

  return rules.join('\n');
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
