import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ dir: '', encryption: true }));
vi.mock('electron', () => ({
  app: { getPath: () => env.dir },
  // Reversible stand-in for DPAPI: base64 so the file is not plain JSON.
  safeStorage: {
    isEncryptionAvailable: () => env.encryption,
    encryptString: (text: string) => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`),
    decryptString: (data: Buffer) => {
      const text = data.toString();
      if (!text.startsWith('enc:')) throw new Error('bad ciphertext');
      return Buffer.from(text.slice(4), 'base64').toString();
    },
  },
}));

const { SafeTokenStore } = await import('./token-store');

const tokens = {
  accessToken: 'access-secret',
  refreshToken: 'refresh-secret',
  expiresAt: 1,
  scopes: ['user:read:chat'],
};

beforeEach(() => {
  env.dir = mkdtempSync(join(tmpdir(), 'chatto-token-'));
  env.encryption = true;
});
afterEach(() => rmSync(env.dir, { recursive: true, force: true }));

describe('SafeTokenStore', () => {
  it('round-trips tokens through OS encryption', async () => {
    const store = new SafeTokenStore('twitch');
    await store.save(tokens);
    expect(await store.load()).toEqual(tokens);
  });

  it('never writes tokens in plain text', async () => {
    await new SafeTokenStore('twitch').save(tokens);
    const raw = readFileSync(join(env.dir, 'twitch.token'), 'utf8');
    expect(raw).not.toContain('access-secret');
    expect(raw).not.toContain('refresh-secret');
  });

  it('refuses to save when encryption is unavailable', async () => {
    env.encryption = false;
    await expect(new SafeTokenStore('twitch').save(tokens)).rejects.toThrow(/encryption/i);
    expect(existsSync(join(env.dir, 'twitch.token'))).toBe(false);
  });

  it('returns null for a missing, unreadable or undecryptable file', async () => {
    const store = new SafeTokenStore('twitch');
    expect(await store.load()).toBeNull();

    await store.save(tokens);
    env.encryption = false;
    expect(await store.load()).toBeNull();

    env.encryption = true;
    const { writeFileSync } = await import('node:fs');
    writeFileSync(join(env.dir, 'twitch.token'), 'garbage');
    expect(await store.load()).toBeNull();
  });

  it('clears the stored tokens', async () => {
    const store = new SafeTokenStore('twitch');
    await store.save(tokens);
    await store.clear();
    expect(await store.load()).toBeNull();
    await expect(store.clear()).resolves.toBeUndefined();
  });

  it('keeps providers in separate files', async () => {
    await new SafeTokenStore('twitch').save(tokens);
    expect(await new SafeTokenStore('youtube').load()).toBeNull();
  });
});
