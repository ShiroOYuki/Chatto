/**
 * Small helpers that connect the custom CSS editor with the preview:
 * which selector the cursor is in, and how to query it against the DOM.
 */

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, (comment) => ' '.repeat(comment.length));

/**
 * Returns the selector of the rule the cursor is in (either inside its
 * selector text or its declaration block), or null for at-rules / nothing.
 */
export function selectorAtCursor(css: string, cursor: number): string | null {
  const text = stripComments(css);
  // Walk back to the nearest brace to see whether the cursor sits inside a block.
  let depthStart = -1;
  for (let i = Math.min(cursor, text.length) - 1; i >= 0; i -= 1) {
    const char = text[i];
    if (char === '}') break;
    if (char === '{') {
      depthStart = i;
      break;
    }
  }
  let open: number;
  if (depthStart >= 0) {
    open = depthStart;
  } else {
    open = text.indexOf('{', cursor);
    if (open < 0) return null;
    // The selector must not span a closing brace or a declaration end.
    const between = text.slice(cursor, open);
    if (/[};]/.test(between)) return null;
  }
  let start = open - 1;
  while (start >= 0 && !'{};'.includes(text[start]!)) start -= 1;
  const selector = text.slice(start + 1, open).trim();
  if (!selector || selector.startsWith('@')) return null;
  return selector;
}

/**
 * Makes a selector usable with `querySelectorAll`: pseudo-elements and
 * state pseudo-classes cannot match DOM nodes, so they are removed.
 */
export function toQueryable(selector: string): string {
  return selector
    .replace(/::?(before|after|first-line|first-letter|marker|placeholder|selection|backdrop)\b/g, '')
    .replace(/:(hover|focus|focus-visible|focus-within|active|visited)\b/g, '')
    .replace(/:scope\b/g, '.chatto-root')
    .trim();
}

/** Finds the elements a selector matches inside one chat root (root included). */
export function queryInRoot(root: Element, selector: string): Element[] {
  const query = toQueryable(selector);
  if (!query) return [];
  try {
    const found = [...root.querySelectorAll(query)];
    if (root.matches(query)) found.unshift(root);
    return found;
  } catch {
    return [];
  }
}

/** Describes an element of the chat markup for the inspector label. */
export interface InspectedElement {
  /** The `chatto-*` class of the picked part, e.g. `chatto-author`. */
  part: string;
  /** Kind of row the part is in. */
  row: 'message' | 'notice' | null;
  roles: string[];
  highlights: string[];
  user?: string;
  event?: string;
  platform?: string;
  badge?: string;
}

export function inspectElement(element: Element, root: Element): { target: Element; info: InspectedElement } | null {
  let target: Element | null = element;
  while (target && target !== root && !chattoClass(target)) target = target.parentElement;
  if (!target || !root.contains(target)) return null;
  const part = target === root ? 'chatto-root' : chattoClass(target)!;
  const row = target.closest('.chatto-message, .chatto-notice');
  const attr = (name: string) => row?.getAttribute(name) ?? undefined;
  const split = (value?: string) => (value ? value.split(/\s+/).filter(Boolean) : []);
  return {
    target,
    info: {
      part,
      row: row ? (row.classList.contains('chatto-message') ? 'message' : 'notice') : null,
      roles: split(attr('data-roles')),
      highlights: split(attr('data-highlight')),
      user: attr('data-user'),
      event: attr('data-event'),
      platform: attr('data-platform'),
      badge: target.getAttribute('data-badge') ?? undefined,
    },
  };
}

const chattoClass = (element: Element) => [...element.classList].find((name) => name.startsWith('chatto-'));

export type SelectorScope =
  | { kind: 'all' }
  | { kind: 'role'; role: string }
  | { kind: 'highlight'; highlight: string }
  | { kind: 'user'; user: string }
  | { kind: 'event'; event: string }
  | { kind: 'platform'; platform: string }
  | { kind: 'badge'; badge: string };

const quote = (value: string) => `"${value.replace(/["\\]/g, '\\$&')}"`;

/** Builds a selector for a picked part limited to a scope. */
export function buildSelector(info: InspectedElement, scope: SelectorScope): string {
  const part = `.${info.part}`;
  const rowClass = info.row === 'notice' ? '.chatto-notice' : '.chatto-message';
  const isRow = info.part === 'chatto-message' || info.part === 'chatto-notice';
  const within = (rowSelector: string) => (isRow ? rowSelector : `${rowSelector} ${part}`);
  switch (scope.kind) {
    case 'all':
      return part;
    case 'role':
      return within(`.chatto-message[data-roles~=${quote(scope.role)}]`);
    case 'highlight':
      return within(`.chatto-message[data-highlight~=${quote(scope.highlight)}]`);
    case 'user':
      return within(`${rowClass}[data-user=${quote(scope.user)}]`);
    case 'event':
      return within(`${rowClass}[data-event=${quote(scope.event)}]`);
    case 'platform':
      return within(`${rowClass}[data-platform=${quote(scope.platform)}]`);
    case 'badge':
      return `${part}[data-badge=${quote(scope.badge)}]`;
  }
}

/** Every scope that applies to an inspected element, most general first. */
export function scopesFor(info: InspectedElement): SelectorScope[] {
  const scopes: SelectorScope[] = [{ kind: 'all' }];
  if (info.badge) scopes.push({ kind: 'badge', badge: info.badge });
  if (info.event) scopes.push({ kind: 'event', event: info.event });
  if (info.row === 'message') {
    for (const role of info.roles) scopes.push({ kind: 'role', role });
    for (const highlight of info.highlights) scopes.push({ kind: 'highlight', highlight });
    if (info.user) scopes.push({ kind: 'user', user: info.user });
  }
  if (info.platform && info.part !== 'chatto-root' && info.part !== 'chatto-list') {
    scopes.push({ kind: 'platform', platform: info.platform });
  }
  return scopes;
}

/** Appends an empty rule for a selector and returns the new CSS plus the cursor inside the rule. */
export function appendRule(css: string, selector: string): { css: string; cursor: number } {
  const head = css.trimEnd();
  const prefix = head ? `${head}\n\n` : '';
  const next = `${prefix}${selector} {\n  \n}\n`;
  return { css: next, cursor: prefix.length + selector.length + 5 };
}
