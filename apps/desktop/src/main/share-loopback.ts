import { SHARE_LOOPBACK_PATH, SIGN_IN_PAGE_HEADERS, signInPageHtml } from '@chatto/share';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { SignInLoopback } from '../shared/share/client';

/**
 * Listens on a free port of 127.0.0.1 for the browser coming back from a sign-in. Only this app
 * knows the port, so the one-time code reaches the app that started the sign-in. The browser is
 * shown a short page; the first visit's query is the result.
 */
export function openSignInLoopback(): Promise<SignInLoopback> {
  return new Promise((resolve, reject) => {
    let settle: (params: URLSearchParams) => void = () => undefined;
    const result = new Promise<URLSearchParams>((done) => (settle = done));
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (request.method !== 'GET' || url.pathname !== SHARE_LOOPBACK_PATH) {
        response.writeHead(404).end();
        return;
      }
      response
        .writeHead(200, SIGN_IN_PAGE_HEADERS)
        .end(signInPageHtml(url.searchParams.has('code') ? 'done' : 'failed'));
      settle(url.searchParams);
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        port,
        result,
        close: () => {
          server.close();
          server.closeAllConnections();
        },
      });
    });
  });
}
