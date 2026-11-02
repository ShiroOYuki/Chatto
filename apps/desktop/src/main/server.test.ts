import { decodeServerFrame, encodeFrame, PROTOCOL_VERSION, type ServerFrame, type ViewerTarget } from '@chatto/core';
import { PRESET_THEMES, createMockMessage, sampleEvent } from '@chatto/chat-ui';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { ChatHub } from './chat-hub';
import { LocalServer, type LocalServerOptions } from './server';
import { ThemeAssets } from './theme-assets';

let server: LocalServer | null = null;
afterEach(async () => {
  await server?.stop();
  server = null;
});

async function startServer(extra: Partial<LocalServerOptions> = {}) {
  const viewerDir = mkdtempSync(join(tmpdir(), 'chatto-viewer-'));
  writeFileSync(join(viewerDir, 'index.html'), '<!doctype html><title>viewer</title>');
  mkdirSync(join(viewerDir, 'assets'));
  writeFileSync(join(viewerDir, 'assets', 'app.js'), 'console.log(1)');
  const hub = new ChatHub();
  const themes = { overlay: PRESET_THEMES[0]!, embed: PRESET_THEMES[1]!, alerts: PRESET_THEMES[2]! };
  // Port 0 lets the OS pick a free port; random fixed ports can land in Windows' reserved ranges (EACCES).
  server = new LocalServer({ port: 0, viewerDir, hub, themeFor: (target) => themes[target], ...extra });
  await server.start();
  return { hub, port: server.port, server };
}

/** Opens a viewer socket, subscribes to a target and collects decoded frames. */
async function subscribe(port: number, target: ViewerTarget) {
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
    expect(server.port).toBeGreaterThan(0);
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

  it('tells viewers the chat language on hello and when it changes', async () => {
    const { port, server } = await startServer({ locale: () => 'en' });
    const overlay = await subscribe(port, 'overlay');
    const alerts = await subscribe(port, 'alerts');
    expect(overlay.frames[0]).toMatchObject({ type: 'hello', locale: 'en' });

    server.broadcastLocale('zh-TW');
    for (const viewer of [overlay, alerts]) {
      await vi.waitFor(() => expect(viewer.frames.at(-1)).toMatchObject({ type: 'locale', locale: 'zh-TW' }));
    }
    overlay.socket.close();
    alerts.socket.close();
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

  it('routes each event per output and starts alert viewers without a backlog', async () => {
    const { hub, port } = await startServer({
      route: (target, event) =>
        target === 'alerts'
          ? event.type === 'notice'
            ? { event, alert: { durationMs: 1000 } }
            : null
          : target === 'embed' && event.type === 'notice'
            ? null
            : { event },
    });
    hub.publish(createMockMessage());
    const alerts = await subscribe(port, 'alerts');
    const embed = await subscribe(port, 'embed');
    expect(alerts.frames[0]?.type === 'hello' && alerts.frames[0].backlog).toEqual([]);
    expect(embed.frames[0]?.type === 'hello' && embed.frames[0].backlog).toHaveLength(1);

    hub.publish(sampleEvent('twitch:sub'));
    await vi.waitFor(() => expect(alerts.frames.at(-1)).toMatchObject({ type: 'event', alert: { durationMs: 1000 } }));
    hub.publish(createMockMessage());
    await vi.waitFor(() => expect(embed.frames).toHaveLength(2));
    expect(embed.frames.some((frame) => frame.type === 'event' && frame.event.type === 'notice')).toBe(false);
    expect(alerts.frames).toHaveLength(2);
    alerts.socket.close();
    embed.socket.close();
  });

  it('serves user sounds by safe name only', async () => {
    const soundsDir = mkdtempSync(join(tmpdir(), 'chatto-sounds-'));
    writeFileSync(join(soundsDir, 'ding-1.mp3'), 'ID3');
    const { port } = await startServer({ soundsDir });
    const ok = await fetch(`http://127.0.0.1:${port}/sounds/ding-1.mp3`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('audio/mpeg');
    expect((await fetch(`http://127.0.0.1:${port}/sounds/missing.mp3`)).status).toBe(404);
    expect((await fetch(`http://127.0.0.1:${port}/sounds/..%2fsettings.json`)).status).toBe(404);
    expect((await fetch(`http://127.0.0.1:${port}/sounds/notes.txt`)).status).toBe(404);
  });

  it('serves theme frame images by asset name only, next to the viewer build', async () => {
    const assets = new ThemeAssets(mkdtempSync(join(tmpdir(), 'chatto-assets-')));
    const file = assets.add(new Uint8Array([...Buffer.from('GIF89a-frame')]));
    const { port } = await startServer({ assets });
    const ok = await fetch(`http://127.0.0.1:${port}/theme-assets/${file}`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('image/gif');
    expect((await fetch(`http://127.0.0.1:${port}/theme-assets/${'f'.repeat(64)}.png`)).status).toBe(404);
    expect((await fetch(`http://127.0.0.1:${port}/theme-assets/..%2fsettings.json`)).status).toBe(404);
    // The viewer's own bundle keeps its /assets/ path.
    expect(await (await fetch(`http://127.0.0.1:${port}/assets/app.js`)).text()).toBe('console.log(1)');
  });
});
