/**
 * Global shortcuts (#53): keys that work while a game has focus. None is bound by default, so
 * Chatto never takes a key a game or another app uses; the user sets each one in Settings.
 * Bindings are Electron accelerators (`Ctrl+Alt+C`), checked here and registered in main.
 */

export const SHORTCUT_ACTIONS = [
  'toggleOverlay',
  'toggleAlertsOverlay',
  'toggleClickThrough',
  'togglePause',
  'clearChat',
] as const;
export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

/** The accelerator for each action; empty when it has none. */
export type ShortcutBindings = Record<ShortcutAction, string>;

export const isShortcutAction = (value: unknown): value is ShortcutAction =>
  (SHORTCUT_ACTIONS as readonly unknown[]).includes(value);

export const emptyShortcuts = (): ShortcutBindings =>
  Object.fromEntries(SHORTCUT_ACTIONS.map((action) => [action, ''])) as ShortcutBindings;

const MAX_ACCELERATOR = 64;

/** Saved bindings from older versions or hand edits: strings only, and no key bound twice. */
export function normalizeShortcuts(raw: unknown): ShortcutBindings {
  const bindings = emptyShortcuts();
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  for (const action of SHORTCUT_ACTIONS) {
    const value = source[action];
    if (typeof value !== 'string' || !value.trim() || value.length > MAX_ACCELERATOR) continue;
    if (duplicateOf(bindings, action, value)) continue;
    bindings[action] = value.trim();
  }
  return bindings;
}

/** Another action already using `accelerator`, if any (letter case and modifier order do not matter). */
export function duplicateOf(
  bindings: ShortcutBindings,
  action: ShortcutAction,
  accelerator: string,
): ShortcutAction | null {
  const key = canonical(accelerator);
  if (!key) return null;
  return SHORTCUT_ACTIONS.find((other) => other !== action && canonical(bindings[other]) === key) ?? null;
}

const MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'super'];
const MODIFIER_ALIASES: Record<string, string> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  commandorcontrol: 'ctrl',
  cmdorctrl: 'ctrl',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
  super: 'super',
  meta: 'super',
  cmd: 'super',
  command: 'super',
};

function canonical(accelerator: string): string {
  const parts = accelerator.split('+').map((part) => part.trim().toLowerCase());
  if (!accelerator.trim() || parts.some((part) => !part)) return '';
  const mods = new Set(parts.slice(0, -1).map((part) => MODIFIER_ALIASES[part] ?? part));
  return [...MODIFIER_ORDER.filter((mod) => mods.has(mod)), parts.at(-1)].join('+');
}

/** The part of a keyboard event a shortcut is made from. */
export interface KeyPress {
  key: string;
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export type KeyPressResult =
  | { accelerator: string }
  /** Only modifiers so far: keep listening. */
  | { pending: true }
  /** A key without Ctrl, Alt or Win would fire while typing or playing: F-keys only. */
  | { error: 'needs-modifier' }
  | { error: 'unsupported' };

const PUNCTUATION: Record<string, string> = {
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
};
const NAMED: Record<string, string> = {
  Space: 'Space',
  Enter: 'Return',
  NumpadEnter: 'Return',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
  NumpadDecimal: 'numdec',
  Pause: 'Pause',
  ScrollLock: 'Scrolllock',
  PrintScreen: 'PrintScreen',
};
const MODIFIER_CODES = /^(Control|Alt|Shift|Meta|OS)(Left|Right)?$/;

/** The key in Electron's accelerator words, from the physical key so keyboard layouts agree. */
function keyName(code: string): string | null {
  let match = /^Key([A-Z])$/.exec(code);
  if (match) return match[1]!;
  match = /^Digit(\d)$/.exec(code);
  if (match) return match[1]!;
  match = /^Numpad(\d)$/.exec(code);
  if (match) return `num${match[1]}`;
  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code;
  return PUNCTUATION[code] ?? NAMED[code] ?? null;
}

/** Turns a key press in the shortcut field into an accelerator. */
export function acceleratorFromKeyPress(press: KeyPress): KeyPressResult {
  if (MODIFIER_CODES.test(press.code) || ['Control', 'Alt', 'Shift', 'Meta'].includes(press.key)) {
    return { pending: true };
  }
  const key = keyName(press.code);
  if (!key) return { error: 'unsupported' };
  const modifiers = [
    press.ctrlKey ? 'Ctrl' : '',
    press.altKey ? 'Alt' : '',
    press.shiftKey ? 'Shift' : '',
    press.metaKey ? 'Super' : '',
  ].filter(Boolean);
  const isFunctionKey = /^F\d+$/.test(key);
  // Shift alone still types: it does not make a letter safe to take over.
  if (!isFunctionKey && !press.ctrlKey && !press.altKey && !press.metaKey) return { error: 'needs-modifier' };
  return { accelerator: [...modifiers, key].join('+') };
}

/** How a binding reads on screen: `Ctrl + Alt + C` (Win for the Windows key). */
export function shortcutLabel(accelerator: string): string {
  return accelerator
    .split('+')
    .map((part) => (part === 'Super' ? 'Win' : part === 'Return' ? 'Enter' : part.replace(/^num/, 'Num ')))
    .join(' + ');
}

/** What the main process answers when a shortcut is set. */
export type ShortcutResult =
  | { ok: true }
  /** Another Chatto action has these keys. */
  | { ok: false; reason: 'duplicate'; action: ShortcutAction }
  /** Windows refused it: another app holds these keys (or they cannot be a global shortcut). */
  | { ok: false; reason: 'unavailable' };
