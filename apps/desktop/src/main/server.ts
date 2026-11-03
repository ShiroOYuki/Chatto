import {
  decodeClientFrame,
  encodeFrame,
  PROTOCOL_VERSION,
  type AlertCue,
  type ChatEvent,
  type ChatTheme,
  type Locale,
  type ViewerTarget,
} from '@chatto/core';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ChatHub } from './chat-hub';
import type { ThemeAssets } from './theme-assets';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

/** What one output receives for an event: the event (possibly adjusted) and an alert cue, or nothing. */
export type Routed = { event: ChatEvent; alert?: AlertCue } | null;

/** URL path of theme frame images; matches `defaultAssetUrl` in @chatto/chat-ui. */
export const THEME_ASSET_PATH = '/theme-assets/';

/** Names of user sound files in the sounds folder. */
export const SOUND_FILE = /^[\w-]+\.(mp3|ogg|wav)$/;

/** A theme as `/api/themes` lists it: nothing beyond what a picker shows. */
export interface ThemeSummary {
  id: string;
  name: string;
}

/** `/api/ping` identifies the server, so the OBS plugin does not mistake another app on the port for Chatto. */
export const PING_APP = 'chatto';

/** One connected viewer. */
interface Client {
  target: ViewerTarget;
  /** The theme the viewer asked for, while it exists. */
  themeId?: string;
  /** The theme last sent, as JSON, so unchanged themes are not resent. */
  sentTheme: string;
}

export interface LocalServerOptions {
  /** 0 picks a free port; read it from `port` after `start()`. */
  port: number;
  /** Folder with the built viewer (apps/viewer/dist). */
  viewerDir: string;
  hub: ChatHub;
  /**
   * The theme a viewer renders: `themeId` when the viewer asked for one that
   * exists, otherwise the target's selected theme.
   */
  themeFor(target: ViewerTarget, themeId?: string): ChatTheme;
  /** Themes listed at `/api/themes` for the OBS plugin's theme picker. */
  themeList?(): ThemeSummary[];
  /** Reported at `/api/ping`. */
  appVersion?: string;
  /** Language of event texts on every output. */
  locale?(): Locale;
  /** Adjusts or drops events per output; every output gets every event when omitted. */
  route?(target: ViewerTarget, event: ChatEvent): Routed;
  /** Folder with the user's alert sounds, served at `/sounds/<file>`. */
  soundsDir?: string;
  /** Theme frame images, served at `/theme-assets/<file>` (the viewer's own build uses `/assets/`). */
  assets?: ThemeAssets;
}

/**
 * Localhost-only HTTP + WebSocket server. Serves the viewer pages and streams
 * normalized chat events to the overlay window and OBS browser sources.
 */
export class LocalServer {
  #http: Server | null = null;
  #wss: WebSocketServer | null = null;
  #clients = new Map<WebSocket, Client>();
  #unsubscribe: (() => void) | null = null;

  constructor(private readonly options: LocalServerOptions) {}

  /** The bound port once started (the requested one before that). */
  get port(): number {
    const address = this.#http?.address();
    return address && typeof address === 'object' ? address.port : this.options.port;
  }

  url(target: ViewerTarget): string {
    return `http://127.0.0.1:${this.port}/${target}`;
  }

  async start(): Promise<void> {
    this.#http = createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      if (pathname.startsWith('/api/')) {
        this.#api(pathname, request.method ?? 'GET', response);
        return;
      }
      const file = this.#resolve(pathname);
      if (!file) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, {
        'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      createReadStream(file).pipe(response);
    });

    this.#wss = new WebSocketServer({ server: this.#http, path: '/ws' });
    this.#wss.on('connection', (socket) => {
      socket.on('message', (data) => {
        const frame = decodeClientFrame(String(data));
        if (!frame) return;
        const theme = this.options.themeFor(frame.target, frame.themeId);
        this.#clients.set(socket, {
          target: frame.target,
          // An unknown id is dropped: the viewer follows the target's theme from then on.
          ...(frame.themeId && theme.id === frame.themeId ? { themeId: frame.themeId } : {}),
          sentTheme: JSON.stringify(theme),
        });
        socket.send(
          encodeFrame({
            v: PROTOCOL_VERSION,
            type: 'hello',
            target: frame.target,
            theme,
            ...(this.options.locale ? { locale: this.options.locale() } : {}),
            backlog: this.#backlogFor(frame.target),
          }),
        );
      });
      socket.on('close', () => this.#clients.delete(socket));
    });

    this.#unsubscribe = this.options.hub.subscribe((event) => {
      // Encode once per target: outputs may receive different versions of the same event.
      const payloads = new Map<ViewerTarget, string | null>();
      for (const [socket, { target }] of this.#clients) {
        if (!payloads.has(target)) {
          const routed = this.#route(target, event);
          payloads.set(target, routed && encodeFrame({ v: PROTOCOL_VERSION, type: 'event', ...routed }));
        }
        const payload = payloads.get(target);
        if (payload) socket.send(payload);
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.#http!.once('error', reject);
      // Bound to loopback only: nothing on the LAN can read the chat feed.
      this.#http!.listen(this.options.port, '127.0.0.1', () => resolve());
    });
  }

  /** Tells every viewer the chat language changed. */
  broadcastLocale(locale: Locale): void {
    const payload = encodeFrame({ v: PROTOCOL_VERSION, type: 'locale', locale });
    for (const socket of this.#clients.keys()) socket.send(payload);
  }

  /**
   * Sends every viewer its theme again if it changed: call after a theme is
   * selected, saved or deleted, or the chat language changes. A viewer whose
   * own theme was deleted falls back to its target's theme.
   */
  refreshThemes(): void {
    for (const [socket, client] of this.#clients) {
      const theme = this.options.themeFor(client.target, client.themeId);
      if (client.themeId && theme.id !== client.themeId) delete client.themeId;
      const json = JSON.stringify(theme);
      if (json === client.sentTheme) continue;
      client.sentTheme = json;
      socket.send(encodeFrame({ v: PROTOCOL_VERSION, type: 'theme', theme }));
    }
  }

  async stop(): Promise<void> {
    this.#unsubscribe?.();
    for (const socket of this.#clients.keys()) socket.close();
    this.#wss?.close();
    await new Promise<void>((resolve) => (this.#http ? this.#http.close(() => resolve()) : resolve()));
  }

  /** The small JSON API the OBS plugin reads. Nothing here carries a token or chat content. */
  #api(pathname: string, method: string, response: ServerResponse): void {
    const json = (status: number, body: unknown): void => {
      response
        .writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        .end(JSON.stringify(body));
    };
    if (method !== 'GET') return json(405, { error: 'method not allowed' });
    if (pathname === '/api/ping') return json(200, { app: PING_APP, version: this.options.appVersion ?? '' });
    if (pathname === '/api/themes') return json(200, this.options.themeList?.() ?? []);
    json(404, { error: 'not found' });
  }

  #route(target: ViewerTarget, event: ChatEvent): Routed {
    return this.options.route ? this.options.route(target, event) : { event };
  }

  /** Recent events for a newly opened viewer. Alerts start empty so old alerts never replay. */
  #backlogFor(target: ViewerTarget): ChatEvent[] {
    if (target === 'alerts') return [];
    return this.options.hub.backlog().flatMap((event) => {
      const routed = this.#route(target, event);
      return routed ? [routed.event] : [];
    });
  }

  #resolve(pathname: string): string | null {
    if (pathname.startsWith(THEME_ASSET_PATH)) {
      return this.options.assets?.path(pathname.slice(THEME_ASSET_PATH.length)) ?? null;
    }
    if (pathname.startsWith('/sounds/')) {
      const sound = pathname.slice('/sounds/'.length);
      const { soundsDir } = this.options;
      if (!soundsDir || !SOUND_FILE.test(sound)) return null;
      const file = join(soundsDir, sound);
      return existsSync(file) && statSync(file).isFile() ? file : null;
    }
    const root = normalize(this.options.viewerDir);
    const candidate = normalize(join(root, pathname));
    if (!candidate.startsWith(root + sep) && candidate !== root) return null;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    const index = join(root, 'index.html');
    return existsSync(index) ? index : null;
  }
}
