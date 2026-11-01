import {
  decodeClientFrame,
  encodeFrame,
  PROTOCOL_VERSION,
  type AlertCue,
  type ChatEvent,
  type ChatTheme,
  type ViewerTarget,
} from '@chatto/core';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ChatHub } from './chat-hub';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

/** What one output receives for an event: the event (possibly adjusted) and an alert cue, or nothing. */
export type Routed = { event: ChatEvent; alert?: AlertCue } | null;

/** Names of user sound files in the sounds folder. */
export const SOUND_FILE = /^[\w-]+\.(mp3|ogg|wav)$/;

export interface LocalServerOptions {
  /** 0 picks a free port; read it from `port` after `start()`. */
  port: number;
  /** Folder with the built viewer (apps/viewer/dist). */
  viewerDir: string;
  hub: ChatHub;
  themeFor(target: ViewerTarget): ChatTheme;
  /** Adjusts or drops events per output; every output gets every event when omitted. */
  route?(target: ViewerTarget, event: ChatEvent): Routed;
  /** Folder with the user's alert sounds, served at `/sounds/<file>`. */
  soundsDir?: string;
}

/**
 * Localhost-only HTTP + WebSocket server. Serves the viewer pages and streams
 * normalized chat events to the overlay window and OBS browser sources.
 */
export class LocalServer {
  #http: Server | null = null;
  #wss: WebSocketServer | null = null;
  #clients = new Map<WebSocket, ViewerTarget>();
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
        this.#clients.set(socket, frame.target);
        socket.send(
          encodeFrame({
            v: PROTOCOL_VERSION,
            type: 'hello',
            target: frame.target,
            theme: this.options.themeFor(frame.target),
            backlog: this.#backlogFor(frame.target),
          }),
        );
      });
      socket.on('close', () => this.#clients.delete(socket));
    });

    this.#unsubscribe = this.options.hub.subscribe((event) => {
      // Encode once per target: outputs may receive different versions of the same event.
      const payloads = new Map<ViewerTarget, string | null>();
      for (const [socket, target] of this.#clients) {
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

  /** Pushes a changed theme to every viewer of that target. */
  broadcastTheme(target: ViewerTarget, theme: ChatTheme): void {
    const payload = encodeFrame({ v: PROTOCOL_VERSION, type: 'theme', theme });
    for (const [socket, clientTarget] of this.#clients) {
      if (clientTarget === target) socket.send(payload);
    }
  }

  async stop(): Promise<void> {
    this.#unsubscribe?.();
    for (const socket of this.#clients.keys()) socket.close();
    this.#wss?.close();
    await new Promise<void>((resolve) => (this.#http ? this.#http.close(() => resolve()) : resolve()));
  }

  /** Maps a URL path to a file inside viewerDir; unknown routes get the SPA index. */
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
