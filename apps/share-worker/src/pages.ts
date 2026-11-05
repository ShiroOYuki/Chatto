import { SIGN_IN_PAGE_HEADERS, signInPageHtml } from '@chatto/share';

/** The page for a sign-in link that no longer works; the other outcomes are shown by the app. */
export const expiredPage = () =>
  new Response(signInPageHtml('expired'), { status: 410, headers: SIGN_IN_PAGE_HEADERS });
