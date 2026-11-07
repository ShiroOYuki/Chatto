import { assetFileOf, THEME_SCHEMA_VERSION, type ChatTheme } from '@chatto/core';
import { createTheme, getPresetTheme, PRESET_THEMES, themeImageSources } from '@chatto/chat-ui/themes';
import { isModifiedInstall, SHARE_TERMS_VERSION, type ShareBackend } from '@chatto/share';
import { createFakeShareBackend } from '@chatto/share/fake';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareClient, type ShareClientOptions } from './client';
import { createMemoryAssets } from './memoryAssets';

function setup(
  options: { terms?: number; token?: string | null; backend?: ShareBackend; client?: Partial<ShareClientOptions> } = {},
) {
  const backend = options.backend ?? createFakeShareBackend({ signInDelay: 0 });
  const assets = createMemoryAssets();
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
    assets,
    onChange,
    newThemeId: () => `local-${++ids}`,
    ...options.client,
  });
  return { client, backend, assets, onChange, themes: () => themes, token: () => token };
}

async function signIn(client: ShareClient) {
  expect(await client.signIn('twitch')).toEqual({ ok: true, value: undefined });
  expect(client.state().session.status).toBe('pending');
  // PKCE hashing finishes outside the fake timers.
  await vi.waitFor(() => expect(client.state().session.status).toBe('signed-in'));
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
    const { client } = setup({ backend: createFakeShareBackend({ signInDelay: 1000 }) });
    await client.signIn('discord');
    client.cancelSignIn();
    await vi.advanceTimersByTimeAsync(2000);
    expect(client.state().session.status).toBe('signed-out');
  });

  it('finishes a browser sign-in with the code its loopback receives', async () => {
    const fake = createFakeShareBackend({ signInDelay: 0 });
    const opened: string[] = [];
    let started: { challenge: string; port: number } | null = null;
    let codeForBrowser = '';
    let deliver: (params: URLSearchParams) => void = () => undefined;
    const closed = vi.fn();
    // A service with a browser step: the fake's code arrives through the loopback instead.
    const backend: ShareBackend = {
      ...fake,
      async beginSignIn(provider, start, token) {
        started = start;
        const result = await fake.beginSignIn(provider, start, token);
        if (!result.ok) return result;
        codeForBrowser = result.value.code!;
        return { ok: true, value: { url: 'https://share.test/v1/auth/start/s' } };
      },
    };
    const { client: loopbackClient } = setup({
      backend,
      client: {
        openExternal: (url) => void opened.push(url),
        loopback: async () => ({
          port: 51234,
          result: new Promise((resolve) => (deliver = resolve)),
          close: closed,
        }),
      },
    });
    expect(await loopbackClient.signIn('twitch')).toEqual({ ok: true, value: undefined });
    expect(started).toMatchObject({ port: 51234, challenge: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) });
    expect(opened).toEqual(['https://share.test/v1/auth/start/s']);
    expect(loopbackClient.state().session.status).toBe('pending');
    deliver(new URLSearchParams({ code: codeForBrowser }));
    await vi.waitFor(() => expect(loopbackClient.state().session.status).toBe('signed-in'));
    expect(closed).toHaveBeenCalled();
  });

  it('reports what the service sent back to the loopback', async () => {
    const backend: ShareBackend = {
      ...createFakeShareBackend({ signInDelay: 0 }),
      beginSignIn: async () => ({ ok: true, value: { url: 'https://share.test/start' } }),
    };
    const { client: failing } = setup({
      backend,
      client: {
        loopback: async () => ({
          port: 51235,
          result: Promise.resolve(new URLSearchParams({ error: 'identity-taken' })),
          close: () => undefined,
        }),
      },
    });
    await failing.signIn('google');
    await vi.waitFor(() => expect(failing.state().session).toEqual({ status: 'signed-out', error: 'identity-taken' }));
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

  it('uploads frame images as asset files, and installs them back', async () => {
    const backend = createFakeShareBackend({ signInDelay: 0 });
    const author = setup({ backend });
    await signIn(author.client);
    const framed = { ...getPresetTheme('tea-leaf')!, id: 'framed', builtIn: false };
    expect(themeImageSources(framed)[0]).toMatch(/^data:/);
    author.themes().push(framed);
    const meta = { name: 'Framed', description: '', category: 'nature' as const, tags: [] };
    const published = await author.client.publish('framed', meta);
    if (!published.ok) throw new Error(`publish failed: ${published.error}`);
    // The local theme keeps its data URL; the shared one points at the uploaded file.
    expect(themeImageSources(author.themes().find((theme) => theme.id === 'framed')!)[0]).toMatch(/^data:/);
    const detail = await backend.get(published.value.id);
    const file = detail.ok ? assetFileOf(themeImageSources(detail.value.theme)[0]!) : null;
    expect(file).toMatch(/^[0-9a-f]{64}\.png$/);

    const viewer = setup({ backend });
    // Previews load the image from the service before it is installed.
    const preview = await viewer.client.get(published.value.id);
    expect(preview.ok && themeImageSources(preview.value.theme)[0]).toMatch(/^data:image\/png;base64,/);
    const installed = await viewer.client.install(published.value.id);
    expect(installed.ok && themeImageSources(installed.value)[0]).toBe(`asset:${file}`);
    expect(viewer.assets.files.has(file!)).toBe(true);

    // Downloading as a file fetches the images too, but saves no theme.
    const downloader = setup({ backend });
    const downloaded = await downloader.client.download(published.value.id);
    if (!downloaded.ok) throw new Error(`download failed: ${downloaded.error}`);
    expect(downloaded.value).toMatchObject({ name: 'Framed', builtIn: false });
    expect(downloaded.value.origin).toBeUndefined();
    expect(themeImageSources(downloaded.value)[0]).toBe(`asset:${file}`);
    expect(downloader.assets.files.has(file!)).toBe(true);
    expect(downloader.themes()).toEqual([...PRESET_THEMES]);
  });

  it('refuses themes made for a newer Chatto', async () => {
    const backend = createFakeShareBackend({ signInDelay: 0 });
    const page = await backend.list({ sort: 'newest' });
    const id = page.ok ? page.value.items[0]!.id : '';
    const real = await backend.get(id);
    const newer: ShareBackend = {
      ...backend,
      get: async () =>
        real.ok
          ? {
              ok: true,
              value: {
                ...real.value,
                theme: { ...real.value.theme, schemaVersion: THEME_SCHEMA_VERSION + 1 } as unknown as ChatTheme,
              },
            }
          : real,
    };
    const { client } = setup({ backend: newer });
    expect(await client.install(id)).toEqual({ ok: false, error: 'app-outdated' });
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
