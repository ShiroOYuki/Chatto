import { ASSET_FILE, type AssetExtension } from '@chatto/core';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Largest frame image Chatto accepts. */
export const MAX_ASSET_BYTES = 2 * 1024 * 1024;

/** The image type of a file, from its first bytes rather than its name. */
export function sniffImage(bytes: Uint8Array): AssetExtension | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'png';
  if (ascii(0, 4) === 'GIF8') return 'gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}

/**
 * Frame images used by themes, stored once each as `<sha256>.<ext>` in one
 * folder that the local server exposes at `/assets/`.
 */
export class ThemeAssets {
  constructor(readonly dir: string) {}

  /** Stores image bytes and returns the file name; the same image is stored only once. */
  add(bytes: Uint8Array): string {
    if (bytes.byteLength > MAX_ASSET_BYTES) throw new Error('圖片超過 2 MB');
    const ext = sniffImage(bytes);
    if (!ext) throw new Error('只支援 PNG、WebP、GIF 圖片');
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
