import { LOCALES, type Locale, type Localized } from '@chatto/core';

/**
 * What changed in a version of Chatto, for the update dialog (#39). It comes from the
 * `changelog.json` attached to each GitHub Release (written by `apps/site/src/changelogJson.mjs`
 * from the site's changelog), checked here before the control panel sees it.
 */
export interface UpdateNote {
  /** For example `v0.3.1`. */
  version: string;
  date?: string;
  summary?: Localized;
  sections: UpdateNoteSection[];
}

export type UpdateNoteKind = 'new' | 'improved' | 'fixed';

export interface UpdateNoteSection {
  kind: UpdateNoteKind;
  /** One sentence each; backticks mark code, nothing else is formatted. */
  items: Localized[];
}

const KINDS: readonly UpdateNoteKind[] = ['new', 'improved', 'fixed'];
/** Far beyond any real changelog; a bigger file is not one. */
export const MAX_CHANGELOG_BYTES = 512 * 1024;
const MAX_TEXT = 2000;

/** Where a release keeps its changelog; GitHub serves release files under the version tag. */
export const changelogFileUrl = (version: string) =>
  `https://github.com/ShiroOYuki/Chatto/releases/download/v${version.replace(/^v/, '')}/changelog.json`;

/** The site's changelog page, for when the notes cannot be read. */
export const changelogPageUrl = (locale: Locale) =>
  locale === 'zh-TW' ? 'https://chattolive.com/zh-tw/changelog' : 'https://chattolive.com/changelog';

/** `0.3.1`, `v0.3.1` → [0, 3, 1]; anything else → null. Pre-release suffixes are ignored. */
export function versionParts(version: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Negative when `a` is older than `b`, 0 when equal (or unreadable), positive when newer. */
export function compareVersions(a: string, b: string): number {
  const x = versionParts(a);
  const y = versionParts(b);
  if (!x || !y) return 0;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i]! - y[i]!;
  return 0;
}

function localized(raw: unknown): Localized | null {
  if (!raw || typeof raw !== 'object') return null;
  const text = {} as Localized;
  for (const locale of LOCALES) {
    const value = (raw as Record<string, unknown>)[locale];
    if (typeof value !== 'string' || !value.trim() || value.length > MAX_TEXT) return null;
    text[locale] = value;
  }
  return text;
}

function note(raw: unknown): UpdateNote | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as Record<string, unknown>;
  if (typeof entry.version !== 'string' || !versionParts(entry.version)) return null;
  const sections: UpdateNoteSection[] = [];
  for (const section of Array.isArray(entry.sections) ? entry.sections : []) {
    const { kind, items } = (section ?? {}) as { kind?: unknown; items?: unknown };
    // A kind added later is skipped rather than shown under the wrong heading.
    if (!KINDS.includes(kind as UpdateNoteKind) || !Array.isArray(items)) continue;
    const texts = items.map(localized).filter((item): item is Localized => item !== null);
    if (texts.length) sections.push({ kind: kind as UpdateNoteKind, items: texts });
  }
  const summary = entry.summary === undefined ? undefined : localized(entry.summary);
  const date = typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? entry.date : undefined;
  return {
    version: entry.version,
    ...(date ? { date } : {}),
    ...(summary ? { summary } : {}),
    sections,
  };
}

/** Reads `changelog.json`: every version it lists, or null when it is not one. */
export function parseUpdateNotes(raw: unknown): UpdateNote[] | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { app?: unknown }).app)) return null;
  return ((raw as { app: unknown[] }).app.map(note).filter((entry) => entry !== null) as UpdateNote[]).sort((a, b) =>
    compareVersions(b.version, a.version),
  );
}

/**
 * The versions an update from `current` to `next` goes through: newer than `current`, up to and
 * including `next`, newest first. Null (show the version only) when `next` itself is missing.
 */
export function notesBetween(notes: UpdateNote[], current: string, next: string): UpdateNote[] | null {
  const between = notes.filter(
    (entry) => compareVersions(entry.version, current) > 0 && compareVersions(entry.version, next) <= 0,
  );
  return between.some((entry) => compareVersions(entry.version, next) === 0) ? between : null;
}

/** A changelog sentence split into plain text and `code` parts (backticks). An unpaired backtick stays text. */
export function noteTextParts(text: string): { text: string; code: boolean }[] {
  const parts: { text: string; code: boolean }[] = [];
  const pattern = /`([^`\n]+)`/g;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), code: false });
    parts.push({ text: match[1]!, code: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), code: false });
  return parts;
}

/**
 * Downloads and checks the notes for an update from `current` to `next`. Null when they cannot
 * be read (offline, no file, wrong format); the dialog then shows the version and a link.
 */
export async function fetchUpdateNotes(
  current: string,
  next: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10_000,
): Promise<UpdateNote[] | null> {
  try {
    const response = await fetchImpl(changelogFileUrl(next), { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    const text = await response.text();
    if (text.length > MAX_CHANGELOG_BYTES) return null;
    const notes = parseUpdateNotes(JSON.parse(text));
    return notes ? notesBetween(notes, current, next) : null;
  } catch {
    return null;
  }
}
