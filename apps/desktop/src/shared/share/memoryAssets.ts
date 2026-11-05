import { sniffImage } from '@chatto/core';
import { sha256Hex } from '@chatto/share';
import type { ShareAssets } from './client';

/** Frame images kept in memory, named like `ThemeAssets` names them; for the browser preview and tests. */
export function createMemoryAssets(): ShareAssets & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  return {
    files,
    async add(bytes) {
      const ext = sniffImage(bytes);
      if (!ext) throw new Error('Unsupported image');
      const file = `${await sha256Hex(bytes)}.${ext}`;
      files.set(file, bytes.slice());
      return file;
    },
    has: (file) => files.has(file),
    read: (file) => files.get(file) ?? null,
  };
}
