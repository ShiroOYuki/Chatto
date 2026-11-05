import { app, safeStorage } from 'electron';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SessionStore } from '../shared/share/client';

/** The theme sharing session token, encrypted with the OS keychain like the Twitch tokens. */
export class SafeSessionStore implements SessionStore {
  readonly #path = join(app.getPath('userData'), 'share.token');

  async load(): Promise<string | null> {
    if (!existsSync(this.#path) || !safeStorage.isEncryptionAvailable()) return null;
    try {
      return safeStorage.decryptString(readFileSync(this.#path)) || null;
    } catch {
      return null;
    }
  }

  async save(token: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('OS encryption is unavailable');
    writeFileSync(this.#path, safeStorage.encryptString(token));
  }

  async clear(): Promise<void> {
    rmSync(this.#path, { force: true });
  }
}
