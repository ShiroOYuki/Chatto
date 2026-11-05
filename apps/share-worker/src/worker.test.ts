import { sniffImage, assetSrc, type ChatTheme } from '@chatto/core';
import { createTheme, getPresetTheme, mapThemeImages, themeImageSources } from '@chatto/chat-ui/themes';
import {
  formatShareCode,
  sha256Hex,
  SHARE_LIMITS,
  themeContentHash,
  type PublishInput,
  type ShareBackend,
  type ShareProvider,
} from '@chatto/share';
import { createHttpShareBackend } from '@chatto/share/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestEnv } from '../test/fakes';
import { handle } from './app';
import { cleanup } from './cleanup';

const START = Date.UTC(2026, 10, 5, 12);
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Who each fake platform says signed in, by the code in the callback. */
const USERS: Record<string, { id: string; name: string }> = {
  ciel: { id: '1001', name: 'Ciel' },
  ciel2: { id: '1002', name: 'Ciel Alt' },
  mika: { id: '2001', name: 'Mika' },
  sora: { id: '3001', name: 'Sora' },
  rin: { id: '4001', name: 'Rin' },
};

/** The sign-in platforms: the token is the code, and the user endpoint reads it back. */
const platformFetch: typeof fetch = async (input, init) => {
  const url = String(input);
  if (/oauth2\/token$|\/token$/.test(url) && !url.includes('revoke')) {
    const code = new URLSearchParams(String(init?.body)).get('code')!;
    return Response.json({ access_token: code });
  }
  if (url.includes('revoke')) return new Response(null, { status: 200 });
  const token = new Headers(init?.headers).get('Authorization')!.slice('Bearer '.length);
  const user = USERS[token];
  if (!user) return new Response('nope', { status: 401 });
  if (url.includes('twitch'))
    return Response.json({ data: [{ id: user.id, login: user.name.toLowerCase(), display_name: user.name }] });
  if (url.includes('google')) return Response.json({ sub: user.id, name: user.name });
  return Response.json({ id: user.id, username: user.name.toLowerCase(), global_name: user.name });
};

function setup() {
  let now = START;
  const env = createTestEnv(() => now);
  const serve = (request: Request) => handle(request, env, { now, fetch: platformFetch });
  const backend = createHttpShareBackend({
    baseUrl: env.PUBLIC_URL,
    fallbackUrl: null,
    fetch: async (input, init) => serve(new Request(input, init)),
  });
  const get = (path: string) => serve(new Request(`${env.PUBLIC_URL}${path}`));

  /** The browser part of a sign-in: open the start page, then come back from the platform. */
  async function browse(url: string, code: string | null) {
    const start = await serve(new Request(url));
    expect(start.status).toBe(302);
    const location = new URL(start.headers.get('Location')!);
    const state = location.searchParams.get('state')!;
    const provider = new URL(url).pathname.includes('start') ? location.hostname : '';
    const name = provider.includes('twitch') ? 'twitch' : provider.includes('google') ? 'google' : 'discord';
    const params = new URLSearchParams({ state, ...(code ? { code } : { error: 'access_denied' }) });
    return get(`/v1/auth/callback/${name}?${params}`);
  }

  async function signIn(provider: ShareProvider, user: string, token?: string) {
    now += MINUTE; // keep clear of the per-minute sign-in limit
    const begun = await backend.beginSignIn(provider, token);
    if (!begun.ok) throw new Error(`begin: ${begun.error}`);
    expect(await backend.pollSignIn(begun.value.requestId)).toEqual({ ok: true, value: { status: 'pending' } });
    const page = await browse(begun.value.url!, user);
    expect(page.headers.get('Content-Type')).toContain('text/html');
    const poll = await backend.pollSignIn(begun.value.requestId);
    if (!poll.ok) throw new Error(`poll: ${poll.error}`);
    return poll.value;
  }

  async function account(user: string, provider: ShareProvider = 'twitch') {
    const result = await signIn(provider, user);
    if (result.status !== 'done') throw new Error(`sign-in failed: ${JSON.stringify(result)}`);
    return result;
  }

  const makeModerator = (id: string) =>
    env.DB.sqlite.prepare("UPDATE accounts SET role = 'moderator' WHERE id = ?").run(id);

  return {
    env,
    backend,
    get,
    browse,
    signIn,
    account,
    makeModerator,
    advance: (ms: number) => void (now += ms),
    now: () => now,
  };
}

/** Uploads a theme's data URL images, as the app does, and returns the theme pointing at them. */
async function uploadImages(backend: ShareBackend, token: string, theme: ChatTheme): Promise<ChatTheme> {
  const files = new Map<string, string>();
  for (const src of themeImageSources(theme)) {
    const bytes = Uint8Array.from(atob(src.split(',')[1]!), (char) => char.charCodeAt(0));
    const file = `${await sha256Hex(bytes)}.${sniffImage(bytes)}`;
    expect(await backend.uploadAsset(token, file, bytes)).toEqual({ ok: true });
    files.set(src, file);
  }
  return mapThemeImages(theme, (image) => ({ ...image, src: assetSrc(files.get(image.src)!) }));
}

const custom = (name = 'Mine'): ChatTheme => ({ ...createTheme(`local-${name}`, name), builtIn: false });
const input = (theme: ChatTheme, extra: Partial<PublishInput> = {}): PublishInput => ({
  name: 'Matcha Latte',
  description: 'Soft green bubbles',
  category: 'cute',
  tags: ['Pastel', 'bubble', ' pastel '],
  theme,
  ...extra,
});

describe('share worker: accounts', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => void (t = setup()));

  it('signs in through the browser and keeps one account per identity', async () => {
    const first = await t.account('ciel');
    expect(first.account).toMatchObject({
      displayName: 'Ciel',
      identities: [{ provider: 'twitch', name: 'Ciel' }],
      role: 'member',
      publishesLeft: SHARE_LIMITS.dailyPublishes,
    });
    const again = await t.account('ciel');
    expect(again.account.id).toBe(first.account.id);
    expect(again.token).not.toBe(first.token);
    expect(await t.backend.account(first.token)).toMatchObject({ ok: true, value: { id: first.account.id } });
    // A finished sign-in is answered once.
    expect(await t.backend.account('nope')).toEqual({ ok: false, error: 'unauthorized' });
  });

  it('only keeps the session token as a hash', async () => {
    const { token } = await t.account('ciel');
    const rows = t.env.DB.sqlite.prepare('SELECT * FROM sessions').all();
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(t.env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM sign_ins').get()).toEqual({ n: 0 });
  });

  it('reports a declined sign-in and expired links', async () => {
    const begun = await t.backend.beginSignIn('google');
    if (!begun.ok) throw new Error('begin');
    const page = await t.browse(begun.value.url!, null);
    expect(page.status).toBe(200);
    expect(await t.backend.pollSignIn(begun.value.requestId)).toEqual({
      ok: true,
      value: { status: 'failed', error: 'cancelled' },
    });
    const late = await t.backend.beginSignIn('discord');
    if (!late.ok) throw new Error('begin');
    t.advance(11 * MINUTE);
    expect((await t.get(new URL(late.value.url!).pathname)).status).toBe(410);
    expect(await t.backend.pollSignIn(late.value.requestId)).toMatchObject({ value: { status: 'failed' } });
  });

  it('refuses unknown or unconfigured sign-in methods', async () => {
    expect(await t.backend.beginSignIn('myspace' as ShareProvider)).toEqual({ ok: false, error: 'invalid' });
    t.env.GOOGLE_CLIENT_SECRET = undefined;
    expect(await t.backend.beginSignIn('google')).toEqual({ ok: false, error: 'invalid' });
  });

  it('links and unlinks sign-in methods, without taking another account’s', async () => {
    const ciel = await t.account('ciel');
    const linked = await t.signIn('google', 'ciel', ciel.token);
    expect(linked).toMatchObject({ status: 'done', account: { id: ciel.account.id } });
    expect(linked.status === 'done' && linked.account.identities.map((item) => item.provider)).toEqual([
      'google',
      'twitch',
    ]);
    await t.account('mika', 'discord');
    expect(await t.signIn('discord', 'mika', ciel.token)).toEqual({ status: 'failed', error: 'identity-taken' });
    expect(await t.backend.unlink(ciel.token, 'google')).toMatchObject({
      ok: true,
      value: { identities: [{ provider: 'twitch' }] },
    });
    expect(await t.backend.unlink(ciel.token, 'twitch')).toEqual({ ok: false, error: 'last-identity' });
    // Signing in with Google again makes a new account now that it is unlinked.
    const google = await t.account('ciel', 'google');
    expect(google.account.id).not.toBe(ciel.account.id);
  });

  it('renames and deletes accounts, keeping their themes anonymously', async () => {
    const ciel = await t.account('ciel');
    expect(await t.backend.setDisplayName(ciel.token, '  Ciel 🍵  ')).toMatchObject({
      ok: true,
      value: { displayName: 'Ciel 🍵' },
    });
    expect(await t.backend.setDisplayName(ciel.token, '   ')).toEqual({ ok: false, error: 'invalid' });
    const published = await t.backend.publish(ciel.token, input(custom()));
    if (!published.ok) throw new Error('publish');
    const mika = await t.account('mika');
    await t.backend.setLiked(mika.token, published.value.id, true);
    expect(await t.backend.deleteAccount(mika.token)).toEqual({ ok: true });
    expect(await t.backend.deleteAccount(ciel.token)).toEqual({ ok: true });
    expect(await t.backend.get(published.value.id)).toMatchObject({ ok: true, value: { author: null, likes: 0 } });
    expect(await t.backend.account(ciel.token)).toEqual({ ok: false, error: 'unauthorized' });
  });

  it('signs out', async () => {
    const ciel = await t.account('ciel');
    expect(await t.backend.signOut(ciel.token)).toEqual({ ok: true });
    expect(await t.backend.account(ciel.token)).toEqual({ ok: false, error: 'unauthorized' });
  });

  it('limits how fast one address starts sign-ins', async () => {
    const results = [];
    for (let index = 0; index < 11; index++) results.push(await t.backend.beginSignIn('twitch'));
    expect(results.at(-2)?.ok).toBe(true);
    expect(results.at(-1)).toEqual({ ok: false, error: 'busy' });
  });
});

describe('share worker: themes', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => void (t = setup()));

  it('publishes a theme with uploaded images and serves it back', async () => {
    const ciel = await t.account('ciel');
    const framed = { ...getPresetTheme('tea-leaf')!, builtIn: false };
    const theme = await uploadImages(t.backend, ciel.token, framed);
    const thumbnail = `data:image/png;base64,${btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10))}`;
    const published = await t.backend.publish(ciel.token, input(theme, { thumbnail }));
    if (!published.ok) throw new Error(`publish: ${JSON.stringify(published)}`);
    expect(published.value).toMatchObject({
      name: 'Matcha Latte',
      category: 'cute',
      tags: ['pastel', 'bubble'],
      autoTags: expect.arrayContaining(['frame']),
      author: { id: ciel.account.id, name: 'Ciel' },
      version: 1,
      likes: 0,
      downloads: 0,
      hidden: false,
      thumbnail: expect.stringMatching(/^https:\/\/share\.test\/v1\/thumbnails\/thm_.+-1\.png$/),
    });
    expect(published.value.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);

    const detail = await t.backend.get(published.value.id);
    if (!detail.ok) throw new Error('get');
    expect(detail.value.theme.id).toBe(published.value.id);
    const file = themeImageSources(detail.value.theme)[0]!.slice('asset:'.length);
    const asset = await t.backend.asset(file);
    expect(asset.ok && sniffImage(asset.value)).toBe('png');
    expect(t.backend.assetUrl(file)).toBe(`https://share.test/v1/assets/${file}`);
    expect((await t.get(new URL(t.backend.assetUrl(file)!).pathname)).headers.get('Cache-Control')).toContain(
      'immutable',
    );
    const thumb = await t.get(new URL(published.value.thumbnail!).pathname);
    expect(thumb.headers.get('Content-Type')).toBe('image/png');

    const code = formatShareCode(published.value.code).toLowerCase();
    expect(await t.backend.findByCode(code)).toMatchObject({ ok: true, value: { id: published.value.id } });
    const page = await t.backend.list({ sort: 'newest', search: 'matcha pastel' });
    expect(page).toMatchObject({ ok: true, value: { total: 1, nextPage: null, items: [{ id: published.value.id }] } });
    expect(await t.backend.list({ sort: 'popular', category: 'retro' })).toMatchObject({ value: { total: 0 } });
    expect(await t.backend.list({ sort: 'likes', search: 'ciel' })).toMatchObject({ value: { total: 1 } });
    expect(await t.backend.versions([published.value.id, 'thm_gone'])).toEqual({
      ok: true,
      value: { [published.value.id]: 1 },
    });
  });

  it('checks themes the way the app does, and wants images uploaded first', async () => {
    const ciel = await t.account('ciel');
    const inline = { ...getPresetTheme('tea-leaf')!, builtIn: false };
    expect(await t.backend.publish(ciel.token, input(inline))).toMatchObject({
      ok: false,
      error: 'invalid',
      issues: [{ code: 'image-inline' }],
    });
    const missing = mapThemeImages(inline, (image) => ({ ...image, src: assetSrc(`${'a'.repeat(64)}.png`) }));
    expect(await t.backend.publish(ciel.token, input(missing))).toMatchObject({
      issues: [{ code: 'image-missing', file: `${'a'.repeat(64)}.png` }],
    });
    const css = { ...custom(), customCss: '.x { background: url(https://tracker.test/p.gif) }' };
    expect(await t.backend.publish(ciel.token, input(css, { name: '', category: '' }))).toMatchObject({
      issues: [{ code: 'name-missing' }, { code: 'category-missing' }, { code: 'css-external' }],
    });
    expect(
      await t.backend.publish(ciel.token, input({ ...custom(), schemaVersion: 99 } as unknown as ChatTheme)),
    ).toEqual({
      ok: false,
      error: 'app-outdated',
    });
    // Images must be what their name says.
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]);
    expect(await t.backend.uploadAsset(ciel.token, `${'b'.repeat(64)}.png`, png)).toEqual({
      ok: false,
      error: 'invalid',
    });
    expect(await t.backend.uploadAsset('nope', `${await sha256Hex(png)}.png`, png)).toEqual({
      ok: false,
      error: 'unauthorized',
    });
  });

  it('allows ten publishes a day per account', async () => {
    const ciel = await t.account('ciel');
    for (let index = 0; index < SHARE_LIMITS.dailyPublishes; index++)
      expect((await t.backend.publish(ciel.token, input(custom(`t${index}`)))).ok).toBe(true);
    expect(await t.backend.publish(ciel.token, input(custom('extra')))).toEqual({ ok: false, error: 'rate-limited' });
    expect(await t.backend.account(ciel.token)).toMatchObject({ value: { publishesLeft: 0 } });
    t.advance(DAY);
    expect((await t.backend.publish(ciel.token, input(custom('tomorrow')))).ok).toBe(true);
  });

  it('updates and unpublishes only the author’s own themes', async () => {
    const ciel = await t.account('ciel');
    const mika = await t.account('mika');
    const published = await t.backend.publish(ciel.token, input(custom()));
    if (!published.ok) throw new Error('publish');
    const id = published.value.id;
    expect(await t.backend.update(mika.token, id, input(custom()))).toEqual({ ok: false, error: 'forbidden' });
    const updated = await t.backend.update(ciel.token, id, input(custom(), { name: 'Matcha 2' }));
    expect(updated).toMatchObject({
      ok: true,
      value: { id, code: published.value.code, version: 2, name: 'Matcha 2' },
    });
    expect(await t.backend.mine(ciel.token)).toMatchObject({ ok: true, value: [{ id, version: 2 }] });
    expect(await t.backend.unpublish(mika.token, id)).toEqual({ ok: false, error: 'forbidden' });
    expect(await t.backend.unpublish(ciel.token, id)).toEqual({ ok: true });
    expect(await t.backend.get(id)).toEqual({ ok: false, error: 'not-found' });
    expect(t.env.BUCKET.objects.has(`themes/${id}.json`)).toBe(false);
  });

  it('records remixes and refuses unchanged copies of someone else’s theme', async () => {
    const ciel = await t.account('ciel');
    const mika = await t.account('mika');
    const original = await t.backend.publish(ciel.token, input(custom()));
    if (!original.ok) throw new Error('publish');
    const detail = await t.backend.get(original.value.id);
    if (!detail.ok) throw new Error('get');
    const installed = { ...detail.value.theme, id: 'local-1' };
    const copy = {
      ...installed,
      origin: { shareId: original.value.id, version: 1, contentHash: themeContentHash(installed) },
    };
    expect(await t.backend.publish(mika.token, input(copy))).toMatchObject({ issues: [{ code: 'unchanged-copy' }] });
    const changed = { ...copy, customCss: '.chatto-list { gap: 2px }' };
    const remix = await t.backend.publish(mika.token, input(changed, { name: 'Remix' }));
    expect(remix).toMatchObject({
      ok: true,
      value: { remixOf: { id: original.value.id, name: 'Matcha Latte', authorName: 'Ciel' } },
    });
  });

  it('counts likes once per account and downloads once per client a day', async () => {
    const ciel = await t.account('ciel');
    const mika = await t.account('mika');
    const published = await t.backend.publish(ciel.token, input(custom()));
    if (!published.ok) throw new Error('publish');
    const id = published.value.id;
    await t.backend.setLiked(mika.token, id, true);
    expect(await t.backend.setLiked(mika.token, id, true)).toMatchObject({ value: { likes: 1, liked: true } });
    expect(await t.backend.get(id, ciel.token)).toMatchObject({ value: { likes: 1, liked: false } });
    expect(await t.backend.setLiked(mika.token, id, false)).toMatchObject({ value: { likes: 0, liked: false } });
    expect(await t.backend.setLiked('nope', id, true)).toEqual({ ok: false, error: 'unauthorized' });

    await t.backend.recordDownload(id, 'client-a');
    await t.backend.recordDownload(id, 'client-a');
    await t.backend.recordDownload(id, 'client-b');
    expect(await t.backend.get(id)).toMatchObject({ value: { downloads: 2 } });
    t.advance(DAY);
    await cleanup(t.env, t.now(), { assets: false });
    expect(t.env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM download_marks').get()).toEqual({ n: 0 });
    await t.backend.recordDownload(id, 'client-a');
    expect(await t.backend.get(id)).toMatchObject({ value: { downloads: 3 } });
  });
});

describe('share worker: reports and moderation', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => void (t = setup()));

  it('hides a theme reported by three accounts, until a moderator restores it', async () => {
    const ciel = await t.account('ciel');
    const published = await t.backend.publish(ciel.token, input(custom()));
    if (!published.ok) throw new Error('publish');
    const id = published.value.id;
    const reporters = [await t.account('mika'), await t.account('sora'), await t.account('rin')];
    for (const reporter of reporters) {
      expect(await t.backend.report(reporter.token, id, 'copyright', 'looks copied')).toEqual({ ok: true });
      await t.backend.report(reporter.token, id, 'spam', 'again'); // one report per account
    }
    expect(await t.backend.list({ sort: 'newest' })).toMatchObject({ value: { total: 0 } });
    expect(await t.backend.get(id)).toEqual({ ok: false, error: 'not-found' });
    // The author still sees it, marked hidden.
    expect(await t.backend.get(id, ciel.token)).toMatchObject({ ok: true, value: { hidden: true } });

    const moderator = await t.account('ciel2');
    expect(await t.backend.reports(moderator.token)).toEqual({ ok: false, error: 'forbidden' });
    t.makeModerator(moderator.account.id);
    const reports = await t.backend.reports(moderator.token);
    expect(reports).toMatchObject({
      ok: true,
      value: [{ theme: { id, hidden: true }, count: 3, reasons: { copyright: 3 }, authorBanned: false }],
    });
    expect(await t.backend.setHidden(moderator.token, id, false)).toEqual({ ok: true });
    expect(await t.backend.get(id)).toMatchObject({ ok: true, value: { hidden: false } });
    expect(await t.backend.setHidden(moderator.token, id, true)).toEqual({ ok: true });
    expect(await t.backend.get(id)).toEqual({ ok: false, error: 'not-found' });
  });

  it('keeps a deleted suspended account out, with its themes hidden', async () => {
    const ciel = await t.account('ciel');
    const published = await t.backend.publish(ciel.token, input(custom()));
    if (!published.ok) throw new Error('publish');
    const moderator = await t.account('mika');
    t.makeModerator(moderator.account.id);
    await t.backend.setBanned(moderator.token, ciel.account.id, true);
    expect(await t.backend.deleteAccount(ciel.token)).toEqual({ ok: true });
    expect(await t.backend.get(published.value.id)).toEqual({ ok: false, error: 'not-found' });
    expect(await t.signIn('twitch', 'ciel')).toEqual({ status: 'failed', error: 'banned' });
  });

  it('does not name a hidden theme as the source of a remix', async () => {
    const ciel = await t.account('ciel');
    const mika = await t.account('mika');
    const original = await t.backend.publish(ciel.token, input(custom()));
    if (!original.ok) throw new Error('publish');
    const detail = await t.backend.get(original.value.id);
    if (!detail.ok) throw new Error('get');
    const changed = {
      ...detail.value.theme,
      customCss: '.chatto-list { gap: 2px }',
      origin: { shareId: original.value.id, version: 1, contentHash: 'old' },
    };
    const remix = await t.backend.publish(mika.token, input(changed, { name: 'Remix' }));
    if (!remix.ok) throw new Error('remix');
    const moderator = await t.account('sora');
    t.makeModerator(moderator.account.id);
    await t.backend.setHidden(moderator.token, original.value.id, true);
    expect(await t.backend.get(remix.value.id)).toMatchObject({ ok: true, value: { remixOf: null } });
  });

  it('suspends an account: its themes are hidden and it cannot sign in or publish', async () => {
    const ciel = await t.account('ciel');
    const published = await t.backend.publish(ciel.token, input(custom()));
    if (!published.ok) throw new Error('publish');
    const moderator = await t.account('mika');
    t.makeModerator(moderator.account.id);
    expect(await t.backend.setBanned(moderator.token, moderator.account.id, true)).toEqual({
      ok: false,
      error: 'forbidden',
    });
    expect(await t.backend.setBanned(moderator.token, ciel.account.id, true)).toEqual({ ok: true });
    expect(await t.backend.get(published.value.id)).toEqual({ ok: false, error: 'not-found' });
    expect(await t.backend.publish(ciel.token, input(custom('again')))).toEqual({ ok: false, error: 'banned' });
    expect(await t.signIn('twitch', 'ciel')).toEqual({ status: 'failed', error: 'banned' });
    // Suspended accounts keep their identities, so they cannot come back as a new account.
    expect(await t.backend.unlink(ciel.token, 'twitch')).toEqual({ ok: false, error: 'banned' });
    expect(await t.backend.beginSignIn('google', ciel.token)).toEqual({ ok: false, error: 'banned' });
    // Moderators can remove it outright.
    expect(await t.backend.unpublish(moderator.token, published.value.id)).toEqual({ ok: true });
  });
});

describe('share worker: housekeeping', () => {
  it('removes uploaded images no theme uses after a day', async () => {
    const t = setup();
    const ciel = await t.account('ciel');
    const theme = await uploadImages(t.backend, ciel.token, { ...getPresetTheme('tea-leaf')!, builtIn: false });
    const used = themeImageSources(theme)[0]!.slice('asset:'.length);
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 1]);
    const unused = `${await sha256Hex(png)}.png`;
    await t.backend.uploadAsset(ciel.token, unused, png);
    await t.backend.publish(ciel.token, input(theme));
    await cleanup(t.env, t.now());
    expect(t.env.BUCKET.objects.has(`assets/${unused}`)).toBe(true);
    t.advance(2 * DAY);
    await cleanup(t.env, t.now());
    expect(t.env.BUCKET.objects.has(`assets/${unused}`)).toBe(false);
    expect(t.env.BUCKET.objects.has(`assets/${used}`)).toBe(true);
  });

  it('answers unknown paths and methods with errors', async () => {
    const t = setup();
    expect(await (await t.get('/v1/nothing')).json()).toEqual({ ok: false, error: 'not-found' });
    expect((await t.get('/v1/account/themes')).status).toBe(401);
    expect(await (await t.get('/v1/themes/%E0%A4%A')).json()).toEqual({ ok: false, error: 'not-found' });
  });
});
