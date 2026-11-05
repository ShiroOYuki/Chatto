import { ASSET_FILE, sniffImage } from '@chatto/core';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mainMessages, type MainMessages } from './messages';

/** Largest frame image Chatto accepts. */
export const MAX_ASSET_BYTES = 2 * 1024 * 1024;

export { sniffImage };

/**
 * Frame images used by themes, stored once each as `<sha256>.<ext>` in one
 * folder that the local server exposes at `/assets/`.
 */
export class ThemeAssets {
  /** `messages` gives the error texts in the current interface language. */
  constructor(
    readonly dir: string,
    private readonly messages: () => MainMessages = () => mainMessages(),
  ) {}

  /** Stores image bytes and returns the file name; the same image is stored only once. */
  add(bytes: Uint8Array): string {
    if (bytes.byteLength > MAX_ASSET_BYTES) throw new Error(this.messages().errors.imageTooLarge);
    const ext = sniffImage(bytes);
    if (!ext) throw new Error(this.messages().errors.unsupportedImage);
    const file = `${createHash('sha256').update(bytes).digest('hex')}.${ext}`;
    const path = join(this.dir, file);
    if (!existsSync(path)) {
      mkdirSync(this.dir, { recursive: true });
      writeFileSync(path, bytes);
    }
    return file;
  }

  /** Path of a stored file, or null when the name is not an asset or it is missing. */
  path(file: string): string | null {
    if (!ASSET_FILE.test(file)) return null;
    const path = join(this.dir, file);
    return existsSync(path) && statSync(path).isFile() ? path : null;
  }

  has(file: string): boolean {
    return this.path(file) !== null;
  }

  read(file: string): Uint8Array | null {
    const path = this.path(file);
    return path ? readFileSync(path) : null;
  }

  /** Deletes every stored file not in `keep`; returns the deleted names. */
  collect(keep: Set<string>): string[] {
    if (!existsSync(this.dir)) return [];
    const removed: string[] = [];
    for (const file of readdirSync(this.dir)) {
      if (!ASSET_FILE.test(file) || keep.has(file)) continue;
      rmSync(join(this.dir, file), { force: true });
      removed.push(file);
    }
    return removed;
  }
}
