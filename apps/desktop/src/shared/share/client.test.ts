import type { ChatTheme } from '@chatto/core';
import { createTheme, PRESET_THEMES } from '@chatto/chat-ui/themes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareClient } from './client';
import { createFakeShareBackend } from './fakeBackend';
import { SHARE_TERMS_VERSION } from './model';
import { isModifiedInstall } from './rules';

function setup(options: { terms?: number; token?: string | null } = {}) {
  const backend = createFakeShareBackend({ signInDelay: 0 });
  let themes: ChatTheme[] = [...PRESET_THEMES];
  let terms = options.terms ?? SHARE_TERMS_VERSION;
  let token = options.token ?? null;
  const onChange = vi.fn();
  let ids = 0;
  const client = new ShareClient({
    backend,
    session: {
      load: async () => token,
      save: async (next) => void (token = next),
      clear: async () => void (token = null),
    },
    clientId: () => 'client',
    termsAccepted: () => terms,
    setTermsAccepted: (version) => void (terms = version),
    openExternal: vi.fn(),
    themes: () => themes,
    saveTheme: (theme) => {
      themes = themes.some((item) => item.id === theme.id)
        ? themes.map((item) => (item.id === theme.id ? theme : item))
        : [...themes, theme];
    },
    assets: { add: () => '', has: () => false, read: () => null },
    onChange,
    pollInterval: 10,
    newThemeId: () => `local-${++ids}`,
  });
  return { client, backend, onChange, themes: () => themes, token: () => token };
}

async function signIn(client: ShareClient) {
  expect(await client.signIn('twitch')).toEqual({ ok: true, value: undefined });
  expect(client.state().session.status).toBe('pending');
  await vi.advanceTimersByTimeAsync(20);
  expect(client.state().session.status).toBe('signed-in');
}

describe('ShareClient', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('needs the current terms before signing in', async () => {
    const { client } = setup({ terms: 0 });
    expect(await client.signIn('google')).toEqual({ ok: false, error: 'terms' });
    client.acceptTerms();
    expect(client.state().termsAccepted).toBe(SHARE_TERMS_VERSION);
  });

  it('signs in through the browser flow and keeps the token', async () => {
    const { client, token } = setup();
    await signIn(client);
    expect(token()).toBeTruthy();
    await client.signOut();
    expect(client.state().session.status).toBe('signed-out');
    expect(token()).toBeNull();
  });

  it('cancels a sign-in that is still waiting', async () => {
    const { client } = setup();
    await client.signIn('discord');
    client.cancelSignIn();
    await vi.advanceTimersByTimeAsync(50);
    expect(client.state().session.status).toBe('signed-out');
  });

  it('forgets a saved session the service no longer accepts', async () => {
    const { client, token } = setup({ token: 'stale' });
    await client.init();
    expect(client.state().session.status).toBe('signed-out');
    expect(token()).toBeNull();
  });

  it('installs a shared theme with its origin, and updates it in place', async () => {
    const { client, themes } = setup();
    const seed = await client.list({ sort: 'popular' });
    if (!seed.ok) throw new Error('list failed');
    const first = seed.value.items[0]!;
    const installed = await client.install(first.id);
    if (!installed.ok) throw new Error('install failed');
    expect(installed.value).toMatchObject({
      id: 'local-1',
      name: first.name,
      origin: { shareId: first.id, version: 1 },
    });
    expect(isModifiedInstall(installed.value)).toBe(false);
    expect(themes().filter((theme) => theme.origin?.shareId === first.id)).toHaveLength(1);
    const again = await client.install(first.id, 'local-1');
    expect(again.ok && again.value.id).toBe('local-1');
    expect(themes().filter((theme) => theme.origin?.shareId === first.id)).toHaveLength(1);
  });

  it('publishes a local theme and links it to what was published', async () => {
    const { client, themes } = setup();
    await signIn(client);
    const mine = { ...createTheme('mine', 'Mine'), builtIn: false };
    themes().push(mine);
    const meta = { name: 'Mine', description: '', category: 'minimal' as const, tags: [] };
    const result = await client.publish('mine', meta);
    if (!result.ok) throw new Error(`publish failed: ${result.error}`);
    expect(themes().find((theme) => theme.id === 'mine')?.origin).toMatchObject({
      shareId: result.value.id,
      version: 1,
    });
    const update = await client.publish('mine', { ...meta, name: 'Mine 2' }, undefined, result.value.id);
    expect(update.ok && update.value.version).toBe(2);
  });

  it('checks a theme before sending it', async () => {
    const { client, themes } = setup();
    await signIn(client);
    themes().push({ ...createTheme('bad', 'Bad'), builtIn: false, customCss: '@import "https://x.test/a.css";' });
    const result = await client.publish('bad', { name: 'Bad', description: '', category: 'other', tags: [] });
    expect(result).toMatchObject({ ok: false, error: 'invalid', issues: [{ code: 'css-external' }] });
  });

  it('needs an account for account calls', async () => {
    const { client } = setup();
    expect(await client.mine()).toEqual({ ok: false, error: 'unauthorized' });
  });
});
