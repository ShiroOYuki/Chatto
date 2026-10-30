import { decodeServerFrame, encodeFrame, PROTOCOL_VERSION, type ServerFrame } from '@chatto/core';
import { PRESET_THEMES, createMockMessage } from '@chatto/chat-ui';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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
  const hub = new ChatHub();
  const port = 40000 + Math.floor(Math.random() * 20000);
  server = new LocalServer({ port, viewerDir, hub, themeFor: () => PRESET_THEMES[0]! });
  await server.start();
  return { hub, port };
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
});
