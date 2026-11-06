/**
 * Pure rules of theme sharing: theme codes, tags, the content hash and the checks a theme
 * must pass before it is published. The sharing service runs the same checks.
 */
import { ASSET_FILE, ROLE_KEYS, sniffImage, type ChatTheme } from '@chatto/core';
import { EVENT_CATALOG } from '@chatto/chat-ui/events';
import { mapThemeImages, themeImageSources } from '@chatto/chat-ui/themes';
import { isShareCategory, SHARE_LIMITS, type PublishMeta, type ShareIssue } from './model';

// ---------- theme codes ----------

/** Crockford Base32: no I, L, O or U, so codes survive being read aloud or typed by hand. */
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 8;

/** A new random code; `random` returns numbers in [0, 1). */
export function createShareCode(random: () => number = Math.random): string {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index++) code += CODE_ALPHABET[Math.floor(random() * 32)];
  return code;
}

/**
 * Reads what someone typed as a theme code: case, spaces and the dash do not matter, and
 * letters that look like digits are read as the digits. Null when it is not a whole code.
 */
export function parseShareCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  if (code.length !== CODE_LENGTH) return null;
  return [...code].every((char) => CODE_ALPHABET.includes(char)) ? code : null;
}

/** `7K3P9QXM` → `7K3P-9QXM`. */
export const formatShareCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

// ---------- tags ----------

/** Lowercase, spaces to dashes, only letters, digits and dashes (any script). */
export function normalizeTag(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Tags the service adds from the theme itself; they do not count towards the author's limit. */
export function autoTags(theme: ChatTheme): string[] {
  const tags: string[] = [];
  if (themeImageSources(theme).length) tags.push('frame');
  if (theme.customCss.trim()) tags.push('custom-css');
  if (theme.animation.enter !== 'none' && theme.animation.duration > 0) tags.push('animated');
  return tags;
}

// ---------- content hash ----------

/** SHA-256 of some bytes as lowercase hex (Web Crypto, so it runs in the app and the Worker). */
export async function sha256Hex(bytes: Uint8Array | string): Promise<string> {
  const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  const digest = await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Unpadded base64url. */
export function base64Url(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A PKCE verifier: 32 random bytes as base64url (43 characters). */
export const createPkceVerifier = () => base64Url(crypto.getRandomValues(new Uint8Array(32)));

/** The PKCE `S256` challenge of a verifier. */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

/** The bytes are a PNG, WebP or GIF named `<sha256>.<ext>` after their content. */
export async function isAssetFile(file: string, bytes: Uint8Array): Promise<boolean> {
  if (!ASSET_FILE.test(file)) return false;
  const ext = sniffImage(bytes);
  return ext !== null && file === `${await sha256Hex(bytes)}.${ext}`;
}

/** JSON with object keys sorted, so the same content always gives the same text. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * A short hash of what a theme looks and behaves like, ignoring its local id and origin.
 * It tells whether an installed theme was changed since it was installed. Not cryptographic.
 */
export function themeContentHash(theme: ChatTheme): string {
  const { id: _id, builtIn: _builtIn, origin: _origin, ...content } = theme;
  const text = stableJson(content);
  // Two FNV-1a passes with different seeds, for 64 bits without BigInt.
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let index = 0; index < text.length; index++) {
    const char = text.charCodeAt(index);
    a = Math.imul(a ^ char, 0x01000193);
    b = Math.imul(b ^ char, 0x01000193 + 2);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return hex(a) + hex(b);
}

/** The installed theme no longer matches what was installed. */
export const isModifiedInstall = (theme: ChatTheme) =>
  theme.origin ? themeContentHash(theme) !== theme.origin.contentHash : false;

/**
 * Installed from someone else's shared theme and not changed since, which the service refuses to
 * publish (`unchanged-copy`). `ownShareIds` are the account's own shared themes; their unchanged
 * local copies are not copies of someone else's.
 */
export const isUnchangedCopy = (theme: ChatTheme, ownShareIds: ReadonlySet<string>) =>
  Boolean(theme.origin) && !isModifiedInstall(theme) && !ownShareIds.has(theme.origin!.shareId);

// ---------- checks ----------

/**
 * How many frame images a theme can hold: the panel, message, name and body boxes, the generic
 * event box, one box per platform event and one frame per role. A theme may use that many images.
 */
export function imageSlotCount(): number {
  const events = EVENT_CATALOG.reduce((count, group) => count + group.events.length, 0);
  return 4 + 1 + events + ROLE_KEYS.length;
}

const byteLength = (text: string) => new TextEncoder().encode(text).byteLength;

/** Decoded size of a `data:` URL's payload; 0 for anything else. */
export function dataUrlBytes(src: string): number {
  const match = /^data:[^,]*;base64,(.*)$/s.exec(src);
  if (!match) return 0;
  const payload = match[1]!.replace(/\s/g, '');
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

/** Resolves CSS escapes (`\75 rl(` is `url(`) and drops comments, so checks see what the browser sees. */
function plainCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_match, hex: string) => String.fromCodePoint(parseInt(hex, 16) || 0xfffd))
    .replace(/\\(.)/g, '$1');
}

/**
 * Places where custom CSS would load something from outside the theme: any `@import`, and
 * `url()` / `image-set()` targets other than `data:` and `asset:`. Loading from elsewhere
 * would let a theme see who installed it, so the service rejects these.
 */
export function externalCssReferences(css: string): string[] {
  const text = plainCss(css);
  const found: string[] = [];
  for (const match of text.matchAll(/@import\b[^;]*/gi)) found.push(match[0].trim().slice(0, 80));
  for (const match of text.matchAll(/\b(?:url|image-set|image|src)\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) {
    const target = match[2]!.trim().toLowerCase();
    if (target.startsWith('data:') || target.startsWith('asset:')) continue;
    if (match[0].toLowerCase().startsWith('image-set(') && !target) continue;
    found.push(match[0].slice(0, 80));
  }
  // Bare strings in image-set('a.png' 1x) also load files.
  for (const match of text.matchAll(/image-set\(([^)]*)\)/gi)) {
    for (const string of match[1]!.matchAll(/(['"])([^'"]*)\1/g)) {
      const target = string[2]!.trim().toLowerCase();
      if (!target.startsWith('data:') && !target.startsWith('asset:')) found.push(match[0].slice(0, 80));
    }
  }
  return [...new Set(found)];
}

export interface PublishCheckContext {
  /** Byte sizes of the theme's images; data URLs are measured here, asset files by the caller. */
  assetBytes?: (src: string) => number;
  /** The theme is an unchanged install of someone else's shared theme. */
  unchangedCopy?: boolean;
}

/** Everything that keeps a theme from being published as it is; empty when it can go. */
export function checkPublish(theme: ChatTheme, meta: PublishMeta, context: PublishCheckContext = {}): ShareIssue[] {
  const issues: ShareIssue[] = [];
  const name = meta.name.trim();
  if (!name) issues.push({ code: 'name-missing' });
  else if ([...name].length > SHARE_LIMITS.nameLength)
    issues.push({ code: 'name-too-long', max: SHARE_LIMITS.nameLength });
  if ([...meta.description].length > SHARE_LIMITS.descriptionLength)
    issues.push({ code: 'description-too-long', max: SHARE_LIMITS.descriptionLength });
  if (!isShareCategory(meta.category)) issues.push({ code: 'category-missing' });
  if (meta.tags.length > SHARE_LIMITS.tags) issues.push({ code: 'too-many-tags', max: SHARE_LIMITS.tags });
  for (const tag of meta.tags)
    if ([...tag].length > SHARE_LIMITS.tagLength)
      issues.push({ code: 'tag-too-long', tag, max: SHARE_LIMITS.tagLength });

  // Images upload as separate files, so they do not count towards the theme's own size.
  const themeBytes = byteLength(JSON.stringify(mapThemeImages(theme, (image) => ({ ...image, src: '' }))));
  if (themeBytes > SHARE_LIMITS.themeJsonBytes)
    issues.push({ code: 'theme-too-large', bytes: themeBytes, max: SHARE_LIMITS.themeJsonBytes });
  const cssBytes = byteLength(theme.customCss);
  if (cssBytes > SHARE_LIMITS.customCssBytes)
    issues.push({ code: 'css-too-large', bytes: cssBytes, max: SHARE_LIMITS.customCssBytes });
  for (const excerpt of externalCssReferences(theme.customCss)) issues.push({ code: 'css-external', excerpt });

  const images = themeImageSources(theme);
  const slots = imageSlotCount();
  if (images.length > slots) issues.push({ code: 'too-many-images', count: images.length, max: slots });
  for (const src of images) {
    const bytes = src.startsWith('data:') ? dataUrlBytes(src) : (context.assetBytes?.(src) ?? 0);
    if (bytes > SHARE_LIMITS.imageBytes) issues.push({ code: 'image-too-large', bytes, max: SHARE_LIMITS.imageBytes });
  }

  if (context.unchangedCopy) issues.push({ code: 'unchanged-copy' });
  return issues;
}
