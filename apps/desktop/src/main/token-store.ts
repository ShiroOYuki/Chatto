import type { TokenStore, TwitchTokens } from '@chatto/provider-twitch';
import { app, safeStorage } from 'electron';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Stores OAuth tokens encrypted with the OS keychain (DPAPI on Windows).
 * Tokens never leave the main process.
 */
export class SafeTokenStore implements TokenStore {
  constructor(private readonly name: string) {}

  get #path(): string {
    return join(app.getPath('userData'), `${this.name}.token`);
  }

  async load(): Promise<TwitchTokens | null> {
    if (!existsSync(this.#path) || !safeStorage.isEncryptionAvailable()) return null;
    try {
      return JSON.parse(safeStorage.decryptString(readFileSync(this.#path))) as TwitchTokens;
    } catch {
      return null;
    }
  }

  async save(tokens: TwitchTokens): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('OS encryption is unavailable');
    writeFileSync(this.#path, safeStorage.encryptString(JSON.stringify(tokens)));
  }

  async clear(): Promise<void> {
    rmSync(this.#path, { force: true });
  }
}
