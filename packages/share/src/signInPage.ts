/**
 * The small page the browser shows at the end of a sign-in: from the app's loopback server when
 * it worked or failed, from the service when the link expired. Bilingual, no scripts, no external
 * resources.
 */

export type SignInPageKind = 'done' | 'failed' | 'expired';

const TEXT: Record<SignInPageKind, { zh: [string, string]; en: [string, string] }> = {
  done: {
    zh: ['登入完成', '可以關閉這個分頁，回到 Chatto'],
    en: ['Signed in', 'You can close this tab and return to Chatto'],
  },
  failed: {
    zh: ['登入沒有完成', '回到 Chatto 查看原因，再試一次'],
    en: ['Sign-in didn’t finish', 'Go back to Chatto to see why and try again'],
  },
  expired: {
    zh: ['這個登入連結已失效', '回到 Chatto 重新登入'],
    en: ['This sign-in link has expired', 'Go back to Chatto and sign in again'],
  },
};

/** Headers to send the page with. */
export const SIGN_IN_PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
} as const;

export function signInPageHtml(kind: SignInPageKind): string {
  const { zh, en } = TEXT[kind];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Chatto</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #27500a; color: #f4f9ee;
    font-family: system-ui, -apple-system, "Segoe UI", "Microsoft JhengHei", sans-serif; }
  main { max-width: 28rem; padding: 2rem; text-align: center; }
  .mark { font-weight: 800; letter-spacing: .12em; font-size: .85rem; opacity: .7; }
  h1 { font-size: 1.5rem; margin: 1rem 0 .25rem; }
  p { margin: 0 0 1.25rem; opacity: .85; }
  hr { border: 0; border-top: 1px solid rgba(244, 249, 238, .25); margin: 1.5rem 0; }
</style>
</head>
<body>
<main>
  <div class="mark">CHATTO</div>
  <h1 lang="zh-TW">${zh[0]}</h1>
  <p lang="zh-TW">${zh[1]}</p>
  <hr>
  <h1>${en[0]}</h1>
  <p>${en[1]}</p>
</main>
</body>
</html>`;
}
