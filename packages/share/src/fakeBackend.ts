import type { ChatTheme } from '@chatto/core';
import type { ShareBackend, SignInResult } from './backend';
import { FAKE_SEED, type SeedTheme } from './fakeSeed';
import {
  hasDailyPublishLimit,
  SHARE_LIMITS,
  shareFail,
  shareOk,
  type PublishInput,
  type ShareAccount,
  type ShareCategory,
  type ShareIdentity,
  type ShareProvider,
  type ShareReport,
  type ShareReportReason,
  type ShareThemeDetail,
  type ShareThemeSummary,
} from './model';
import {
  autoTags,
  checkPublish,
  createShareCode,
  isAssetFile,
  normalizeTag,
  pkceChallenge,
  themeContentHash,
} from './rules';

const DAY = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 24;

interface StoredAccount {
  id: string;
  displayName: string;
  identities: ShareIdentity[];
  role: ShareAccount['role'];
  banned: boolean;
  official: boolean;
  publishes: { day: number; count: number };
}

interface StoredReport {
  reason: ShareReportReason;
  note: string;
  at: number;
}

interface StoredTheme {
  id: string;
  code: string;
  name: string;
  description: string;
  category: ShareCategory;
  tags: string[];
  authorId: string | null;
  version: number;
  publishedAt: number;
  updatedAt: number;
  theme: ChatTheme;
  thumbnail?: string;
  remixOf: string | null;
  /** Likes from seed data, on top of the accounts in `likedBy`. */
  baseLikes: number;
  likedBy: Set<string>;
  baseDownloads: number;
  /** `<client>:<day>` pairs already counted. */
  downloadedBy: Set<string>;
  reports: Map<string, StoredReport>;
  /** Hidden by a moderator; reports can hide a theme on their own too. */
  hiddenByModerator: boolean;
  /** A moderator restored it, so earlier reports no longer hide it. */
  clearedReports: number;
}

export interface FakeShareOptions {
  /** How long a sign-in "takes", ms. */
  signInDelay?: number;
  /** The account the fake sign-in creates moderates the service, so its tools can be tried. */
  moderator?: boolean;
  now?: () => number;
  random?: () => number;
  seed?: SeedTheme[];
}

/** The name each sign-in method reports for the person using the app. */
const OWN_IDENTITIES: Record<ShareProvider, string> = {
  twitch: 'shiraine_ciel',
  google: 'Ciel',
  discord: 'ciel.chatto',
};

/**
 * An in-memory sharing service with sample data, standing in for the Worker until it exists.
 * Every sign-in is the same person (one identity per method), so linking and switching
 * methods behave like the real service. Nothing is kept across restarts.
 */
export function createFakeShareBackend(options: FakeShareOptions = {}): ShareBackend {
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const signInDelay = options.signInDelay ?? 1200;
  const accounts = new Map<string, StoredAccount>();
  /** `<provider>:<name>` → account id. */
  const identityOwners = new Map<string, string>();
  const sessions = new Map<string, string>();
  const themes = new Map<string, StoredTheme>();
  /** Sign-ins by the code the browser step would deliver. */
  const signIns = new Map<string, { provider: ShareProvider; linkTo: string | null; challenge: string }>();
  /** Uploaded frame images by file name. */
  const assets = new Map<string, Uint8Array>();
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}-${(++counter).toString(36)}${Math.floor(random() * 1e6).toString(36)}`;

  const uniqueCode = () => {
    const taken = new Set([...themes.values()].map((theme) => theme.code));
    let code = createShareCode(random);
    while (taken.has(code)) code = createShareCode(random);
    return code;
  };

  const addAccount = (displayName: string, role: ShareAccount['role'] = 'member'): StoredAccount => {
    const account: StoredAccount = {
      id: nextId('acc'),
      displayName,
      identities: [],
      role,
      banned: false,
      official: false,
      publishes: { day: 0, count: 0 },
    };
    accounts.set(account.id, account);
    return account;
  };

  // ---------- seed ----------
  const seedAuthors = new Map<string, StoredAccount>();
  for (const seed of options.seed ?? FAKE_SEED) {
    let author = seedAuthors.get(seed.author);
    if (!author) {
      author = addAccount(seed.author);
      seedAuthors.set(seed.author, author);
    }
    if (seed.official) author.official = true;
    const at = now() - seed.daysAgo * DAY;
    const stored: StoredTheme = {
      id: nextId('thm'),
      code: uniqueCode(),
      name: seed.name,
      description: seed.description,
      category: seed.category,
      tags: seed.tags,
      authorId: author.id,
      version: 1,
      publishedAt: at,
      updatedAt: at,
      theme: seed.theme,
      remixOf: null,
      baseLikes: seed.likes,
      likedBy: new Set(),
      baseDownloads: seed.downloads,
      downloadedBy: new Set(),
      reports: new Map(),
      hiddenByModerator: false,
      clearedReports: 0,
    };
    for (let index = 0; index < (seed.reports ?? 0); index++)
      stored.reports.set(`seed-reporter-${index}`, { reason: 'copyright', note: '', at });
    stored.theme = { ...stored.theme, id: stored.id };
    themes.set(stored.id, stored);
  }

  // ---------- views ----------
  const viewerOf = (token?: string) => (token ? accounts.get(sessions.get(token) ?? '') : undefined);
  const downloads = (theme: StoredTheme) => theme.baseDownloads + theme.downloadedBy.size;
  const reportsHide = (theme: StoredTheme) => {
    const count = theme.reports.size - theme.clearedReports;
    return count >= 3 && count > downloads(theme) * 0.05;
  };
  const isHidden = (theme: StoredTheme) => {
    const author = theme.authorId ? accounts.get(theme.authorId) : undefined;
    return theme.hiddenByModerator || reportsHide(theme) || Boolean(author?.banned);
  };

  const summary = (theme: StoredTheme, viewer?: StoredAccount): ShareThemeSummary => {
    const author = theme.authorId ? accounts.get(theme.authorId) : undefined;
    const remix = theme.remixOf ? themes.get(theme.remixOf) : undefined;
    const remixAuthor = remix?.authorId ? accounts.get(remix.authorId) : undefined;
    return {
      id: theme.id,
      code: theme.code,
      name: theme.name,
      description: theme.description,
      category: theme.category,
      tags: [...theme.tags],
      autoTags: autoTags(theme.theme),
      author: author
        ? { id: author.id, name: author.displayName, ...(author.official ? { official: true } : {}) }
        : null,
      likes: theme.baseLikes + theme.likedBy.size,
      downloads: downloads(theme),
      version: theme.version,
      publishedAt: theme.publishedAt,
      updatedAt: theme.updatedAt,
      ...(theme.thumbnail ? { thumbnail: theme.thumbnail } : {}),
      remixOf: remix ? { id: remix.id, name: remix.name, authorName: remixAuthor?.displayName ?? null } : null,
      liked: viewer ? theme.likedBy.has(viewer.id) : false,
      hidden: isHidden(theme),
    };
  };

  /** Hidden themes are visible only to their author and to moderators. */
  const canSee = (theme: StoredTheme, viewer?: StoredAccount) =>
    !isHidden(theme) || (viewer && (viewer.id === theme.authorId || viewer.role === 'moderator'));

  const publicAccount = (account: StoredAccount): ShareAccount => {
    const today = Math.floor(now() / DAY);
    const counted = hasDailyPublishLimit(account.role) && account.publishes.day === today;
    const used = counted ? account.publishes.count : 0;
    return {
      id: account.id,
      displayName: account.displayName,
      identities: account.identities.map((identity) => ({ ...identity })),
      role: account.role,
      publishesLeft: Math.max(0, SHARE_LIMITS.dailyPublishes - used),
    };
  };

  const requireAccount = (token: string) => {
    const account = viewerOf(token);
    if (!account) return shareFail<StoredAccount>('unauthorized');
    if (account.banned) return shareFail<StoredAccount>('banned');
    return shareOk(account);
  };

  /** Validates a publish or update and returns the cleaned-up fields. */
  const preparePublish = (account: StoredAccount, input: PublishInput, updating?: StoredTheme) => {
    const today = Math.floor(now() / DAY);
    if (account.publishes.day !== today) account.publishes = { day: today, count: 0 };
    const limited = hasDailyPublishLimit(account.role);
    if (limited && account.publishes.count >= SHARE_LIMITS.dailyPublishes) return shareFail('rate-limited');
    const tags = [...new Set(input.tags.map(normalizeTag).filter(Boolean))];
    const origin = input.theme.origin ? themes.get(input.theme.origin.shareId) : undefined;
    const unchangedCopy = Boolean(
      origin &&
      origin.authorId !== account.id &&
      input.theme.origin &&
      themeContentHash(input.theme) === input.theme.origin.contentHash,
    );
    const issues = checkPublish(input.theme, { ...input, tags }, { unchangedCopy });
    if (issues.length) return shareFail('invalid', issues);
    if (limited) account.publishes.count += 1;
    const remixOf = origin && origin.authorId !== account.id && origin.id !== updating?.id ? origin.id : null;
    return shareOk({ tags, remixOf });
  };

  const cleanTheme = (theme: ChatTheme, id: string): ChatTheme => {
    const { origin: _origin, builtIn: _builtIn, ...rest } = structuredClone(theme);
    return { ...rest, id };
  };

  // ---------- service ----------
  return {
    async list(query, token) {
      const viewer = viewerOf(token);
      const words = (query.search ?? '').toLowerCase().split(/\s+/).filter(Boolean);
      const matches = [...themes.values()].filter((theme) => {
        if (isHidden(theme)) return false;
        if (query.category && theme.category !== query.category) return false;
        const author = theme.authorId ? (accounts.get(theme.authorId)?.displayName ?? '') : '';
        const text = [theme.name, theme.description, author, ...theme.tags, ...autoTags(theme.theme)]
          .join(' ')
          .toLowerCase();
        return words.every((word) => text.includes(word));
      });
      const likes = (theme: StoredTheme) => theme.baseLikes + theme.likedBy.size;
      const sorted = matches.sort((a, b) =>
        query.sort === 'newest'
          ? b.publishedAt - a.publishedAt
          : query.sort === 'likes'
            ? likes(b) - likes(a)
            : downloads(b) + likes(b) * 3 - (downloads(a) + likes(a) * 3),
      );
      const page = query.page ?? 0;
      const items = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((theme) => summary(theme, viewer));
      return shareOk({
        items,
        total: sorted.length,
        nextPage: (page + 1) * PAGE_SIZE < sorted.length ? page + 1 : null,
      });
    },

    async findByCode(code, token) {
      const viewer = viewerOf(token);
      const theme = [...themes.values()].find((item) => item.code === code);
      return theme && canSee(theme, viewer) ? shareOk(summary(theme, viewer)) : shareFail('not-found');
    },

    async get(id, token) {
      const viewer = viewerOf(token);
      const theme = themes.get(id);
      if (!theme || !canSee(theme, viewer)) return shareFail('not-found');
      const detail: ShareThemeDetail = { ...summary(theme, viewer), theme: structuredClone(theme.theme) };
      return shareOk(detail);
    },

    async versions(ids) {
      const result: Record<string, number> = {};
      for (const id of ids) {
        const theme = themes.get(id);
        if (theme && !isHidden(theme)) result[id] = theme.version;
      }
      return shareOk(result);
    },

    async asset(file) {
      const bytes = assets.get(file);
      return bytes ? shareOk(bytes.slice()) : shareFail('not-found');
    },

    assetUrl(file) {
      const bytes = assets.get(file);
      if (!bytes) return null;
      let text = '';
      for (const byte of bytes) text += String.fromCharCode(byte);
      return `data:image/${file.slice(file.lastIndexOf('.') + 1)};base64,${btoa(text)}`;
    },

    async uploadAsset(token, file, bytes) {
      const result = requireAccount(token);
      if (!result.ok) return result;
      if (!(await isAssetFile(file, bytes))) return shareFail('invalid');
      if (bytes.byteLength > SHARE_LIMITS.imageBytes) return shareFail('invalid');
      assets.set(file, bytes.slice());
      return shareOk(undefined);
    },

    async recordDownload(id, clientId) {
      const theme = themes.get(id);
      if (!theme) return shareFail('not-found');
      theme.downloadedBy.add(`${clientId}:${Math.floor(now() / DAY)}`);
      return shareOk(undefined);
    },

    async beginSignIn(provider, start, token) {
      let linkTo: string | null = null;
      if (token) {
        const account = viewerOf(token);
        if (!account) return shareFail('unauthorized');
        linkTo = account.id;
      }
      const code = nextId('code');
      signIns.set(code, { provider, linkTo, challenge: start.challenge });
      return shareOk({ url: null, code });
    },

    async finishSignIn(code, verifier) {
      // Stands in for the time the browser step takes.
      if (signInDelay > 0) await new Promise((resolve) => setTimeout(resolve, signInDelay));
      const request = signIns.get(code);
      signIns.delete(code);
      if (!request) return shareFail('cancelled');
      if ((await pkceChallenge(verifier)) !== request.challenge) return shareFail('invalid');
      const name = OWN_IDENTITIES[request.provider];
      const key = `${request.provider}:${name}`;
      const owner = identityOwners.get(key);
      let account: StoredAccount;
      if (request.linkTo) {
        if (owner && owner !== request.linkTo) return shareFail('identity-taken');
        account = accounts.get(request.linkTo)!;
        if (!owner) {
          account.identities = account.identities.filter((identity) => identity.provider !== request.provider);
          account.identities.push({ provider: request.provider, name });
          identityOwners.set(key, account.id);
        }
      } else if (owner) {
        account = accounts.get(owner)!;
      } else {
        account = addAccount(name, options.moderator ? 'moderator' : 'member');
        account.identities.push({ provider: request.provider, name });
        identityOwners.set(key, account.id);
      }
      if (account.banned) return shareFail('banned');
      const token = nextId('tok');
      sessions.set(token, account.id);
      return shareOk<SignInResult>({ token, account: publicAccount(account) });
    },

    async account(token) {
      const account = viewerOf(token);
      return account ? shareOk(publicAccount(account)) : shareFail('unauthorized');
    },

    async setDisplayName(token, name) {
      const result = requireAccount(token);
      if (!result.ok) return result;
      const trimmed = name.trim();
      if (!trimmed || [...trimmed].length > SHARE_LIMITS.displayNameLength) return shareFail('invalid');
      result.value.displayName = trimmed;
      return shareOk(publicAccount(result.value));
    },

    async unlink(token, provider) {
      const account = viewerOf(token);
      if (!account) return shareFail('unauthorized');
      const identity = account.identities.find((item) => item.provider === provider);
      if (!identity) return shareOk(publicAccount(account));
      if (account.identities.length === 1) return shareFail('last-identity');
      account.identities = account.identities.filter((item) => item !== identity);
      identityOwners.delete(`${provider}:${identity.name}`);
      return shareOk(publicAccount(account));
    },

    async signOut(token) {
      sessions.delete(token);
      return shareOk(undefined);
    },

    async deleteAccount(token) {
      const account = viewerOf(token);
      if (!account) return shareFail('unauthorized');
      for (const theme of themes.values()) {
        if (theme.authorId === account.id) theme.authorId = null;
        theme.likedBy.delete(account.id);
      }
      for (const identity of account.identities) identityOwners.delete(`${identity.provider}:${identity.name}`);
      for (const [key, owner] of sessions) if (owner === account.id) sessions.delete(key);
      accounts.delete(account.id);
      return shareOk(undefined);
    },

    async setLiked(token, id, liked) {
      const result = requireAccount(token);
      if (!result.ok) return result;
      const theme = themes.get(id);
      if (!theme || !canSee(theme, result.value)) return shareFail('not-found');
      if (liked) theme.likedBy.add(result.value.id);
      else theme.likedBy.delete(result.value.id);
      return shareOk(summary(theme, result.value));
    },

    async report(token, id, reason, note) {
      const result = requireAccount(token);
      if (!result.ok) return result;
      const theme = themes.get(id);
      if (!theme) return shareFail('not-found');
      theme.reports.set(result.value.id, { reason, note: note.trim().slice(0, 500), at: now() });
      return shareOk(undefined);
    },

    async mine(token) {
      const account = viewerOf(token);
      if (!account) return shareFail('unauthorized');
      return shareOk(
        [...themes.values()]
          .filter((theme) => theme.authorId === account.id)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((theme) => summary(theme, account)),
      );
    },

    async publish(token, input) {
      const result = requireAccount(token);
      if (!result.ok) return result;
      const prepared = preparePublish(result.value, input);
      if (!prepared.ok) return prepared;
      const id = nextId('thm');
      const stored: StoredTheme = {
        id,
        code: uniqueCode(),
        name: input.name.trim(),
        description: input.description.trim(),
        category: input.category as ShareCategory,
        tags: prepared.value.tags,
        authorId: result.value.id,
        version: 1,
        publishedAt: now(),
        updatedAt: now(),
        theme: cleanTheme(input.theme, id),
        ...(input.thumbnail ? { thumbnail: input.thumbnail } : {}),
        remixOf: prepared.value.remixOf,
        baseLikes: 0,
        likedBy: new Set(),
        baseDownloads: 0,
        downloadedBy: new Set(),
        reports: new Map(),
        hiddenByModerator: false,
        clearedReports: 0,
      };
      themes.set(id, stored);
      return shareOk(summary(stored, result.value));
    },

    async update(token, id, input) {
      const result = requireAccount(token);
      if (!result.ok) return result;
      const stored = themes.get(id);
      if (!stored) return shareFail('not-found');
      if (stored.authorId !== result.value.id) return shareFail('forbidden');
      const prepared = preparePublish(result.value, input, stored);
      if (!prepared.ok) return prepared;
      Object.assign(stored, {
        name: input.name.trim(),
        description: input.description.trim(),
        category: input.category as ShareCategory,
        tags: prepared.value.tags,
        version: stored.version + 1,
        updatedAt: now(),
        theme: cleanTheme(input.theme, id),
      });
      if (input.thumbnail) stored.thumbnail = input.thumbnail;
      return shareOk(summary(stored, result.value));
    },

    async unpublish(token, id) {
      const account = viewerOf(token);
      if (!account) return shareFail('unauthorized');
      const stored = themes.get(id);
      if (!stored) return shareFail('not-found');
      if (stored.authorId !== account.id && account.role !== 'moderator') return shareFail('forbidden');
      themes.delete(id);
      return shareOk(undefined);
    },

    async reports(token) {
      const account = viewerOf(token);
      if (!account) return shareFail('unauthorized');
      if (account.role !== 'moderator') return shareFail('forbidden');
      const reports: ShareReport[] = [...themes.values()]
        .filter((theme) => theme.reports.size || theme.hiddenByModerator)
        .map((theme) => {
          const entries = [...theme.reports.values()].sort((a, b) => b.at - a.at);
          const reasons: ShareReport['reasons'] = {};
          for (const entry of entries) reasons[entry.reason] = (reasons[entry.reason] ?? 0) + 1;
          const author = theme.authorId ? accounts.get(theme.authorId) : undefined;
          return {
            theme: summary(theme, account),
            count: entries.length,
            reasons,
            notes: entries.map((entry) => entry.note).filter(Boolean),
            authorBanned: Boolean(author?.banned),
          };
        })
        .sort((a, b) => b.count - a.count);
      return shareOk(reports);
    },

    async setHidden(token, id, hidden) {
      const account = viewerOf(token);
      if (!account) return shareFail('unauthorized');
      if (account.role !== 'moderator') return shareFail('forbidden');
      const stored = themes.get(id);
      if (!stored) return shareFail('not-found');
      stored.hiddenByModerator = hidden;
      // Restoring a theme also clears the reports that hid it.
      if (!hidden) stored.clearedReports = stored.reports.size;
      return shareOk(undefined);
    },

    async setBanned(token, accountId, banned) {
      const account = viewerOf(token);
      if (!account) return shareFail('unauthorized');
      if (account.role !== 'moderator') return shareFail('forbidden');
      const target = accounts.get(accountId);
      if (!target) return shareFail('not-found');
      target.banned = banned;
      return shareOk(undefined);
    },
  };
}
