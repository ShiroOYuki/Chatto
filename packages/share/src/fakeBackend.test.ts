import { createTheme } from '@chatto/chat-ui/themes';
import { describe, expect, it } from 'vitest';
import type { ShareBackend } from './backend';
import { createFakeShareBackend } from './fakeBackend';
import { SHARE_LIMITS, type ShareProvider, type ShareResult } from './model';
import { createPkceVerifier, pkceChallenge, themeContentHash } from './rules';

function value<T>(result: ShareResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

async function begin(backend: ShareBackend, provider: ShareProvider, token?: string) {
  const verifier = createPkceVerifier();
  const { code } = value(
    await backend.beginSignIn(provider, { port: 0, challenge: await pkceChallenge(verifier) }, token),
  );
  return backend.finishSignIn(code!, verifier);
}

async function signIn(backend: ShareBackend, provider: ShareProvider = 'twitch', token?: string) {
  return value(await begin(backend, provider, token));
}

const fresh = () => createFakeShareBackend({ signInDelay: 0, random: Math.random });
const meta = { name: 'Mine', description: '', category: 'minimal' as const, tags: ['Dark', 'dark', ' '] };

describe('fake share backend', () => {
  it('lists, searches and pages the visible seed themes', async () => {
    const backend = fresh();
    const page = value(await backend.list({ sort: 'popular' }));
    expect(page.total).toBeGreaterThan(5);
    expect(page.items.every((item) => !item.hidden)).toBe(true);
    const cute = value(await backend.list({ sort: 'newest', category: 'cute' }));
    expect(cute.items.every((item) => item.category === 'cute')).toBe(true);
    const found = value(await backend.list({ sort: 'popular', search: 'neon' }));
    expect(found.items.map((item) => item.name)).toEqual(['Neon Arcade']);
    const byCode = value(await backend.findByCode(found.items[0]!.code));
    expect(byCode.id).toBe(found.items[0]!.id);
  });

  it('keeps one account across sign-in methods once they are linked', async () => {
    const backend = fresh();
    const first = await signIn(backend, 'twitch');
    await signIn(backend, 'google', first.token);
    const account = value(await backend.account(first.token));
    expect(account.identities.map((identity) => identity.provider)).toEqual(['twitch', 'google']);
    const again = await signIn(backend, 'google');
    expect(again.account.id).toBe(account.id);
    expect(await backend.unlink(first.token, 'google')).toMatchObject({ ok: true });
    expect(await backend.unlink(first.token, 'twitch')).toEqual({ ok: false, error: 'last-identity' });
  });

  it('refuses to link a method that belongs to another account', async () => {
    const backend = fresh();
    const twitch = await signIn(backend, 'twitch');
    const google = await signIn(backend, 'google');
    expect(google.account.id).not.toBe(twitch.account.id);
    expect(await begin(backend, 'google', twitch.token)).toEqual({ ok: false, error: 'identity-taken' });
  });

  it('finishes a sign-in only with the verifier that started it', async () => {
    const backend = fresh();
    const { code } = value(await backend.beginSignIn('twitch', { port: 0, challenge: await pkceChallenge('right') }));
    expect(await backend.finishSignIn(code!, 'wrong')).toEqual({ ok: false, error: 'invalid' });
    // A code works once, even after a wrong attempt.
    expect(await backend.finishSignIn(code!, 'right')).toEqual({ ok: false, error: 'cancelled' });
  });

  it('publishes, updates and unpublishes a theme', async () => {
    const backend = fresh();
    const { token } = await signIn(backend);
    const published = value(await backend.publish(token, { ...meta, theme: createTheme('local', 'Mine') }));
    expect(published).toMatchObject({ version: 1, tags: ['dark'], likes: 0 });
    expect(value(await backend.mine(token)).map((item) => item.id)).toEqual([published.id]);
    const updated = value(
      await backend.update(token, published.id, { ...meta, name: 'Mine 2', theme: createTheme('x', 'x') }),
    );
    expect(updated).toMatchObject({ version: 2, name: 'Mine 2', code: published.code });
    value(await backend.unpublish(token, published.id));
    expect(await backend.get(published.id)).toEqual({ ok: false, error: 'not-found' });
  });

  it('marks official authors and gives moderators no daily publish limit', async () => {
    const backend = createFakeShareBackend({ signInDelay: 0, moderator: true });
    const found = value(await backend.list({ sort: 'popular', search: 'tea garden' }));
    expect(found.items[0]?.author).toMatchObject({ name: 'Chatto', official: true });
    const neon = value(await backend.list({ sort: 'popular', search: 'neon' }));
    expect(neon.items[0]?.author?.official).toBeUndefined();

    const { token } = await signIn(backend);
    for (let index = 0; index <= SHARE_LIMITS.dailyPublishes; index++)
      value(await backend.publish(token, { ...meta, theme: createTheme(`local-${index}`, 'Mine') }));
    expect(value(await backend.account(token)).publishesLeft).toBe(SHARE_LIMITS.dailyPublishes);
  });

  it('rejects invalid themes with their issues', async () => {
    const backend = fresh();
    const { token } = await signIn(backend);
    const result = await backend.publish(token, {
      ...meta,
      category: '',
      theme: { ...createTheme('t', 't'), customCss: '@import "https://x.test/a.css";' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues?.map((issue) => issue.code)).toEqual(['category-missing', 'css-external']);
  });

  it('refuses an unchanged copy of someone else’s theme and records remixes', async () => {
    const backend = fresh();
    const { token } = await signIn(backend);
    const seed = value(await backend.list({ sort: 'popular' })).items[0]!;
    const detail = value(await backend.get(seed.id));
    const installed = {
      ...detail.theme,
      id: 'local',
      origin: { shareId: seed.id, version: 1, contentHash: themeContentHash(detail.theme) },
    };
    const copy = await backend.publish(token, { ...meta, theme: installed });
    expect(copy).toMatchObject({ ok: false, error: 'invalid' });
    const remix = value(await backend.publish(token, { ...meta, theme: { ...installed, customCss: '.a{}' } }));
    expect(remix.remixOf).toMatchObject({ id: seed.id, name: seed.name });
  });

  it('counts likes per account and downloads once a day per client', async () => {
    const backend = fresh();
    const { token } = await signIn(backend);
    const seed = value(await backend.list({ sort: 'popular' })).items[0]!;
    expect(value(await backend.setLiked(token, seed.id, true))).toMatchObject({ liked: true, likes: seed.likes + 1 });
    expect(value(await backend.setLiked(token, seed.id, true)).likes).toBe(seed.likes + 1);
    await backend.recordDownload(seed.id, 'client');
    await backend.recordDownload(seed.id, 'client');
    expect(value(await backend.get(seed.id)).downloads).toBe(seed.downloads + 1);
  });

  it('hides reported themes and lets moderators restore them or ban the author', async () => {
    const backend = createFakeShareBackend({ signInDelay: 0, moderator: true });
    const { token } = await signIn(backend);
    const reports = value(await backend.reports(token));
    const hidden = reports.find((report) => report.theme.hidden)!;
    expect(hidden.count).toBeGreaterThanOrEqual(3);
    expect(value(await backend.list({ sort: 'popular' })).items.some((item) => item.id === hidden.theme.id)).toBe(
      false,
    );
    value(await backend.setHidden(token, hidden.theme.id, false));
    expect(value(await backend.list({ sort: 'popular' })).items.some((item) => item.id === hidden.theme.id)).toBe(true);
    value(await backend.setBanned(token, hidden.theme.author!.id, true));
    expect(value(await backend.list({ sort: 'popular' })).items.some((item) => item.id === hidden.theme.id)).toBe(
      false,
    );
  });

  it('keeps an account’s themes as anonymous when it is deleted', async () => {
    const backend = fresh();
    const { token } = await signIn(backend);
    const published = value(await backend.publish(token, { ...meta, theme: createTheme('local', 'Mine') }));
    value(await backend.deleteAccount(token));
    expect(value(await backend.get(published.id)).author).toBeNull();
    expect(await backend.account(token)).toEqual({ ok: false, error: 'unauthorized' });
  });

  it('only lets moderators see reports', async () => {
    const backend = fresh();
    const { token } = await signIn(backend);
    expect(await backend.reports(token)).toEqual({ ok: false, error: 'forbidden' });
  });
});
