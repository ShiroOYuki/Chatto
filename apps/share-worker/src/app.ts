import { sharePaths } from '@chatto/share';
import {
  cleanDisplayName,
  deleteAccount,
  isShareProvider,
  publicAccount,
  requireAccount,
  sessionAccount,
  signOut,
} from './accounts';
import { defaultRandom } from './crypto';
import type { Context, Env } from './env';
import { fail, ok, readJson, Router, ShareError } from './http';
import { rateLimit } from './limits';
import { listReports, setBanned, setHidden } from './moderation';
import { beginSignIn, finishCallback, finishSignIn, startSignIn } from './signin';
import {
  findByCode,
  getAsset,
  getTheme,
  getThumbnail,
  listThemes,
  mine,
  publish,
  recordDownload,
  report,
  setLiked,
  unpublish,
  update,
  uploadAsset,
  versions,
} from './themes';

/** `/v1/...` patterns from `sharePaths`, with `:name` in place of each parameter. */
const param = (path: string) => path.replace(/%3A/g, ':');
const p = {
  theme: param(sharePaths.theme(':id')),
  like: param(sharePaths.like(':id')),
  reports: param(sharePaths.reports(':id')),
  downloads: param(sharePaths.downloads(':id')),
  code: param(sharePaths.code(':code')),
  asset: param(sharePaths.asset(':file')),
  thumbnail: param(sharePaths.thumbnail(':file')),
  authStart: param(sharePaths.authStart(':state')),
  authCallback: param(sharePaths.authCallback(':provider')),
  identity: param(sharePaths.identity(':provider')),
  moderationTheme: param(sharePaths.moderationTheme(':id')),
  moderationAccount: param(sharePaths.moderationAccount(':id')),
};

const router = new Router<Context>()
  .on('GET', sharePaths.themes, (c) => listThemes(c))
  .on('POST', sharePaths.themes, (c) => publish(c))
  .on('GET', p.theme, (c, { id }) => getTheme(c, id!))
  .on('PUT', p.theme, (c, { id }) => update(c, id!))
  .on('DELETE', p.theme, (c, { id }) => unpublish(c, id!))
  .on('PUT', p.like, (c, { id }) => setLiked(c, id!, true))
  .on('DELETE', p.like, (c, { id }) => setLiked(c, id!, false))
  .on('POST', p.reports, (c, { id }) => report(c, id!))
  .on('POST', p.downloads, (c, { id }) => recordDownload(c, id!))
  .on('GET', p.code, (c, { code }) => findByCode(c, code!))
  .on('POST', sharePaths.versions, (c) => versions(c))
  .on('GET', p.asset, (c, { file }) => getAsset(c, file!))
  .on('PUT', p.asset, (c, { file }) => uploadAsset(c, file!))
  .on('GET', p.thumbnail, (c, { file }) => getThumbnail(c, file!))

  .on('POST', sharePaths.signIn, (c) => beginSignIn(c))
  .on('POST', sharePaths.token, (c) => finishSignIn(c))
  .on('GET', p.authStart, (c, { state }) => startSignIn(c, state!))
  .on('GET', p.authCallback, (c, { provider }) => finishCallback(c, provider!))
  .on('POST', sharePaths.signOut, async (c) => {
    await signOut(c);
    return ok(undefined);
  })

  .on('GET', sharePaths.account, async (c) => {
    const account = await sessionAccount(c);
    if (!account) throw new ShareError('unauthorized');
    return ok(await publicAccount(c, account));
  })
  .on('PATCH', sharePaths.account, async (c) => {
    const account = await requireAccount(c);
    await rateLimit(c, 'write', account.id);
    const { displayName } = await readJson<{ displayName?: unknown }>(c.request, 1024);
    const name = cleanDisplayName(displayName);
    await c.env.DB.prepare('UPDATE accounts SET display_name = ? WHERE id = ?').bind(name, account.id).run();
    return ok(await publicAccount(c, { ...account, display_name: name }));
  })
  .on('DELETE', sharePaths.account, async (c) => {
    const account = await sessionAccount(c);
    if (!account) throw new ShareError('unauthorized');
    await deleteAccount(c, account);
    return ok(undefined);
  })
  .on('DELETE', p.identity, async (c, { provider }) => {
    // Suspended accounts keep their identities, so they cannot sign in again as a new account.
    const account = await requireAccount(c);
    if (!isShareProvider(provider)) throw new ShareError('invalid');
    const { results } = await c.env.DB.prepare('SELECT provider FROM identities WHERE account_id = ?')
      .bind(account.id)
      .all<{ provider: string }>();
    if (results.some((row) => row.provider === provider)) {
      if (results.length === 1) throw new ShareError('last-identity');
      await c.env.DB.prepare('DELETE FROM identities WHERE account_id = ? AND provider = ?')
        .bind(account.id, provider)
        .run();
    }
    return ok(await publicAccount(c, account));
  })
  .on('GET', sharePaths.mine, (c) => mine(c))

  .on('GET', sharePaths.moderationReports, (c) => listReports(c))
  .on('PUT', p.moderationTheme, (c, { id }) => setHidden(c, id!))
  .on('PUT', p.moderationAccount, (c, { id }) => setBanned(c, id!));

export interface HandleOptions {
  now?: number;
  fetch?: typeof fetch;
  random?: (length: number) => Uint8Array;
}

/** Answers one request; errors become `ShareResult` failures, unexpected ones `unknown`. */
export async function handle(request: Request, env: Env, options: HandleOptions = {}): Promise<Response> {
  const url = new URL(request.url);
  const context: Context = {
    env,
    request,
    url,
    now: options.now ?? Date.now(),
    fetch: options.fetch ?? ((input, init) => fetch(input, init)),
    random: options.random ?? defaultRandom,
  };
  try {
    const route = router.match(request.method, url.pathname);
    if (typeof route === 'string') return fail(route);
    return await route.handler(context, route.params);
  } catch (error) {
    if (error instanceof ShareError) return fail(error.code, error.issues);
    console.error(error);
    return fail('unknown');
  }
}
