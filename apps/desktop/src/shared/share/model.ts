/**
 * Theme sharing: the data the app and the sharing service exchange (GitHub #4).
 * Shared by the main process, the control panel and the fake service used until the real one exists.
 */
import type { ChatTheme } from '@chatto/core';

/** Sign-in methods of a Chatto account; independent of the chat platforms Chatto connects to. */
export const SHARE_PROVIDERS = ['twitch', 'google', 'discord'] as const;
export type ShareProvider = (typeof SHARE_PROVIDERS)[number];

/** One category per theme; the browse page filters by these. */
export const SHARE_CATEGORIES = [
  'minimal',
  'cute',
  'japanese',
  'nature',
  'gaming',
  'retro',
  'tech',
  'dark',
  'seasonal',
  'other',
] as const;
export type ShareCategory = (typeof SHARE_CATEGORIES)[number];

export const isShareCategory = (value: unknown): value is ShareCategory =>
  (SHARE_CATEGORIES as readonly unknown[]).includes(value);

/** Tags offered when publishing, grouped as the form shows them. Authors may also type their own. */
export const SUGGESTED_TAGS = {
  palette: ['dark', 'light', 'pastel', 'monochrome', 'neon', 'colorful'],
  frame: ['bubble', 'card', 'outline', 'frame', 'borderless'],
  texture: ['glass', 'paper', 'pixel', 'handdrawn', 'gradient'],
  use: ['vtuber', 'gaming', 'chatting', 'music', 'vertical'],
  other: ['animated', 'compact', 'large-text', 'custom-css'],
} as const satisfies Record<string, readonly string[]>;
export type SuggestedTagGroup = keyof typeof SUGGESTED_TAGS;

export const SHARE_LIMITS = {
  themeJsonBytes: 512 * 1024,
  customCssBytes: 128 * 1024,
  imageBytes: 2 * 1024 * 1024,
  /** New themes and updates together, per account per day. */
  dailyPublishes: 10,
  nameLength: 60,
  descriptionLength: 1000,
  displayNameLength: 40,
  tags: 12,
  tagLength: 32,
} as const;

/** Bumped whenever the terms or privacy notice change; signing in asks again after a bump. */
export const SHARE_TERMS_VERSION = 1;

export type ShareSort = 'popular' | 'newest' | 'likes';

export interface ShareQuery {
  /** Undefined lists every category. */
  category?: ShareCategory;
  /** Matches names and tags; a complete theme code opens that theme instead (see `parseShareCode`). */
  search?: string;
  sort: ShareSort;
  page?: number;
}

export interface ShareAuthor {
  id: string;
  name: string;
}

/** A published theme as lists show it. */
export interface ShareThemeSummary {
  id: string;
  /** 8-character Crockford Base32 code, shown as `XXXX-XXXX`. */
  code: string;
  name: string;
  description: string;
  category: ShareCategory;
  /** Tags the author chose. */
  tags: string[];
  /** Tags the service derived from the theme itself (`frame`, `custom-css`, `animated`). */
  autoTags: string[];
  /** Null once the author deleted their account. */
  author: ShareAuthor | null;
  likes: number;
  downloads: number;
  /** Starts at 1 and goes up with every update. */
  version: number;
  publishedAt: number;
  updatedAt: number;
  /** URL of the thumbnail the app rendered when publishing; missing ones are rendered from the theme. */
  thumbnail?: string;
  remixOf?: { id: string; name: string; authorName: string | null } | null;
  /** The signed-in account liked it. */
  liked?: boolean;
  /** Hidden by reports or a moderator; only its author and moderators still see it. */
  hidden?: boolean;
}

export interface ShareThemeDetail extends ShareThemeSummary {
  /** The theme itself; frame images are `asset:` files to fetch, or data URLs. */
  theme: ChatTheme;
}

export interface SharePage {
  items: ShareThemeSummary[];
  total: number;
  nextPage: number | null;
}

export interface ShareIdentity {
  provider: ShareProvider;
  /** The name on that platform, for recognising which account is linked. */
  name: string;
}

export interface ShareAccount {
  id: string;
  displayName: string;
  identities: ShareIdentity[];
  role: 'member' | 'moderator';
  /** Publishes left today. */
  publishesLeft: number;
}

/** The control panel's view of the sharing account; the session token stays in the main process. */
export type ShareSession =
  | { status: 'signed-out'; error?: ShareErrorCode }
  | { status: 'pending'; provider: ShareProvider; linking: boolean }
  | { status: 'signed-in'; account: ShareAccount; error?: ShareErrorCode };

export interface ShareState {
  session: ShareSession;
  /** The terms version the user agreed to (0 for none); signing in needs `SHARE_TERMS_VERSION`. */
  termsAccepted: number;
}

export const SHARE_REPORT_REASONS = ['inappropriate', 'copyright', 'tracking', 'broken', 'spam', 'other'] as const;
export type ShareReportReason = (typeof SHARE_REPORT_REASONS)[number];

export interface ShareReport {
  theme: ShareThemeSummary;
  /** Distinct accounts that reported it. */
  count: number;
  reasons: Partial<Record<ShareReportReason, number>>;
  /** Free text from the reports, newest first. */
  notes: string[];
  authorBanned: boolean;
}

/** What the author fills in when publishing; the theme comes from the app. */
export interface PublishMeta {
  name: string;
  description: string;
  category: ShareCategory | '';
  tags: string[];
}

export interface PublishInput extends PublishMeta {
  theme: ChatTheme;
  /** PNG thumbnail as a data URL; optional because the browser preview cannot capture one. */
  thumbnail?: string;
}

/** Why a theme cannot be published as it is. */
export type ShareIssue =
  | { code: 'name-missing' }
  | { code: 'name-too-long'; max: number }
  | { code: 'description-too-long'; max: number }
  | { code: 'category-missing' }
  | { code: 'too-many-tags'; max: number }
  | { code: 'tag-too-long'; tag: string; max: number }
  | { code: 'theme-too-large'; bytes: number; max: number }
  | { code: 'css-too-large'; bytes: number; max: number }
  | { code: 'css-external'; excerpt: string }
  | { code: 'too-many-images'; count: number; max: number }
  | { code: 'image-too-large'; bytes: number; max: number }
  | { code: 'unchanged-copy' };

export type ShareErrorCode =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'banned'
  | 'not-found'
  | 'rate-limited'
  | 'invalid'
  | 'identity-taken'
  | 'last-identity'
  | 'terms'
  | 'cancelled'
  | 'unknown';

/** Results cross IPC as plain data, so errors keep their code (an Error keeps only its message). */
export type ShareResult<T> = { ok: true; value: T } | { ok: false; error: ShareErrorCode; issues?: ShareIssue[] };

export const shareOk = <T>(value: T): ShareResult<T> => ({ ok: true, value });
export const shareFail = <T = never>(error: ShareErrorCode, issues?: ShareIssue[]): ShareResult<T> =>
  issues ? { ok: false, error, issues } : { ok: false, error };
