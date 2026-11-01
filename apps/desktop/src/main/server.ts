import { decodeClientFrame, encodeFrame, PROTOCOL_VERSION, type ChatTheme, type ViewerTarget } from '@chatto/core';
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
};

export interface LocalServerOptions {
  /** 0 picks a free port; read it from `port` after `start()`. */
  port: number;
  /** Folder with the built viewer (apps/viewer/dist). */
  viewerDir: string;
  hub: ChatHub;
  themeFor(target: ViewerTarget): ChatTheme;
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
            backlog: this.options.hub.backlog(),
          }),
        );
      });
      socket.on('close', () => this.#clients.delete(socket));
    });

    this.#unsubscribe = this.options.hub.subscribe((event) => {
      const payload = encodeFrame({ v: PROTOCOL_VERSION, type: 'event', event });
      for (const socket of this.#clients.keys()) socket.send(payload);
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
  #resolve(pathname: string): string | null {
    const root = normalize(this.options.viewerDir);
    const candidate = normalize(join(root, pathname));
    if (!candidate.startsWith(root + sep) && candidate !== root) return null;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    const index = join(root, 'index.html');
    return existsSync(index) ? index : null;
  }
}
