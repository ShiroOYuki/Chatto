import { decodeServerFrame, encodeFrame, PROTOCOL_VERSION, type ServerFrame } from '@chatto/core';
import { PRESET_THEMES, createMockMessage } from '@chatto/chat-ui';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { ChatHub } from './chat-hub';
import { LocalServer } from './server';

let server: LocalServer | null = null;
afterEach(async () => {
  await server?.stop();
  server = null;
});

async function startServer() {
  const viewerDir = mkdtempSync(join(tmpdir(), 'chatto-viewer-'));
  writeFileSync(join(viewerDir, 'index.html'), '<!doctype html><title>viewer</title>');
  mkdirSync(join(viewerDir, 'assets'));
  writeFileSync(join(viewerDir, 'assets', 'app.js'), 'console.log(1)');
  const hub = new ChatHub();
  const port = 40000 + Math.floor(Math.random() * 20000);
  const themes = { overlay: PRESET_THEMES[0]!, embed: PRESET_THEMES[1]! };
  server = new LocalServer({ port, viewerDir, hub, themeFor: (target) => themes[target] });
  await server.start();
  return { hub, port, server };
}

/** Opens a viewer socket, subscribes to a target and collects decoded frames. */
async function subscribe(port: number, target: 'overlay' | 'embed') {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const frames: ServerFrame[] = [];
  socket.on('message', (data) => {
    const frame = decodeServerFrame(String(data));
    if (frame) frames.push(frame);
  });
  await new Promise<void>((resolve) => socket.on('open', () => resolve()));
  socket.send(encodeFrame({ v: PROTOCOL_VERSION, type: 'subscribe', target }));
  await vi.waitFor(() => expect(frames[0]?.type).toBe('hello'));
  return { socket, frames };
}

describe('LocalServer', () => {
  it('serves the viewer for /overlay and refuses path traversal', async () => {
    const { port } = await startServer();
    const page = await fetch(`http://127.0.0.1:${port}/overlay`);
    expect(await page.text()).toContain('viewer');
    const traversal = await fetch(`http://127.0.0.1:${port}/..%2f..%2fetc%2fpasswd`);
    expect(await traversal.text()).not.toContain('root:');
  });

  it('sends hello with backlog, then live events', async () => {
    const { hub, port } = await startServer();
    hub.publish(createMockMessage());

    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const frames: ServerFrame[] = [];
    await new Promise<void>((resolve) => socket.on('open', () => resolve()));
    socket.on('message', (data) => {
      const frame = decodeServerFrame(String(data));
      if (frame) frames.push(frame);
    });
    socket.send(encodeFrame({ v: PROTOCOL_VERSION, type: 'subscribe', target: 'embed' }));

    await new Promise((resolve) => setTimeout(resolve, 100));
    hub.publish(createMockMessage());
    await new Promise((resolve) => setTimeout(resolve, 100));
    socket.close();

    expect(frames[0]?.type).toBe('hello');
    expect(frames[0]?.type === 'hello' && frames[0].backlog).toHaveLength(1);
    expect(frames[1]?.type).toBe('event');
  });

  it('serves assets with their content type and falls back to the SPA index', async () => {
    const { port } = await startServer();
    const script = await fetch(`http://127.0.0.1:${port}/assets/app.js`);
    expect(script.headers.get('content-type')).toContain('text/javascript');
    const embed = await fetch(`http://127.0.0.1:${port}/embed`);
    expect(embed.status).toBe(200);
    expect(await embed.text()).toContain('viewer');
  });

  it('builds viewer urls on loopback', async () => {
    const { server } = await startServer();
    expect(server.url('embed')).toBe(`http://127.0.0.1:${server.port}/embed`);
  });

  it('greets each target with its own theme', async () => {
    const { port } = await startServer();
    const overlay = await subscribe(port, 'overlay');
    const embed = await subscribe(port, 'embed');
    expect(overlay.frames[0]?.type === 'hello' && overlay.frames[0].theme.id).toBe(PRESET_THEMES[0]!.id);
    expect(embed.frames[0]?.type === 'hello' && embed.frames[0].theme.id).toBe(PRESET_THEMES[1]!.id);
    overlay.socket.close();
    embed.socket.close();
  });

  it('pushes theme changes only to viewers of that target', async () => {
    const { port, server } = await startServer();
    const overlay = await subscribe(port, 'overlay');
    const embed = await subscribe(port, 'embed');

    server.broadcastTheme('embed', PRESET_THEMES[2]!);

    await vi.waitFor(() => expect(embed.frames.at(-1)?.type).toBe('theme'));
    expect(overlay.frames.some((frame) => frame.type === 'theme')).toBe(false);
    overlay.socket.close();
    embed.socket.close();
  });

  it('forwards moderation events so viewers can remove messages', async () => {
    const { hub, port } = await startServer();
    const viewer = await subscribe(port, 'embed');
    hub.publish({ type: 'message-deleted', platform: 'twitch', channelId: '1', messageId: 'm1' });
    await vi.waitFor(() =>
      expect(viewer.frames.at(-1)).toMatchObject({
        type: 'event',
        event: { type: 'message-deleted', messageId: 'm1' },
      }),
    );
    viewer.socket.close();
  });

  it('ignores malformed client frames', async () => {
    const { port } = await startServer();
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const frames: string[] = [];
    socket.on('message', (data) => frames.push(String(data)));
    await new Promise<void>((resolve) => socket.on('open', () => resolve()));
    socket.send('not json');
    socket.send(JSON.stringify({ v: PROTOCOL_VERSION, type: 'subscribe', target: 'desktop' }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(frames).toEqual([]);
    socket.close();
  });
});
