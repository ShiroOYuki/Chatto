import { vi } from 'vitest';

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

type Reply = { status?: number; body?: unknown } | ((request: RecordedRequest) => { status?: number; body?: unknown });

/**
 * Scripted `fetch`: each route (matched by URL prefix) answers with its queued
 * replies in order; the last reply repeats. Unmatched requests fail loudly.
 */
export function installFakeFetch() {
  const routes = new Map<string, Reply[]>();
  const requests: RecordedRequest[] = [];

  const fetch = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    const headers: Record<string, string> = {};
    new Headers(init.headers).forEach((value, key) => (headers[key] = value));
    const request: RecordedRequest = { url, method: init.method ?? 'GET', headers, body: String(init.body ?? '') };
    requests.push(request);

    const key = [...routes.keys()].filter((prefix) => url.startsWith(prefix)).sort((a, b) => b.length - a.length)[0];
    const queue = key ? routes.get(key)! : undefined;
    if (!queue?.length) throw new Error(`Unexpected fetch ${request.method} ${url}`);
    const next = queue.length > 1 ? queue.shift()! : queue[0]!;
    const reply = typeof next === 'function' ? next(request) : next;
    const status = reply.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(reply.body ?? {}), { status });
  });
  vi.stubGlobal('fetch', fetch);

  return {
    requests,
    /** Queues replies for every URL starting with `prefix`. */
    on(prefix: string, ...replies: Reply[]) {
      routes.set(prefix, [...(routes.get(prefix) ?? []), ...replies]);
    },
    to(prefix: string) {
      return requests.filter((request) => request.url.startsWith(prefix));
    },
  };
}

export const form = (request: RecordedRequest) => Object.fromEntries(new URLSearchParams(request.body));
