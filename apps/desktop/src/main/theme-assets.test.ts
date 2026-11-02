import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mainMessages } from './messages';
import { MAX_ASSET_BYTES, sniffImage, ThemeAssets } from './theme-assets';

const bytes = (text: string, prefix: number[] = []) => new Uint8Array([...prefix, ...Buffer.from(text)]);
const PNG = bytes('PNG\r\n\x1a\nframe-a', [0x89]);
const GIF = bytes('GIF89a-frame');
const WEBP = bytes('RIFF\0\0\0\0WEBPVP8 ');

const store = () => new ThemeAssets(mkdtempSync(join(tmpdir(), 'chatto-assets-')));

describe('ThemeAssets', () => {
  it('recognises images by their bytes, not their names', () => {
    expect(sniffImage(PNG)).toBe('png');
    expect(sniffImage(GIF)).toBe('gif');
    expect(sniffImage(WEBP)).toBe('webp');
    expect(sniffImage(bytes('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
  });

  it('stores each image once under its hash', () => {
    const assets = store();
    const file = assets.add(PNG);
    expect(file).toMatch(/^[0-9a-f]{64}\.png$/);
    expect(assets.add(PNG)).toBe(file);
    expect(readdirSync(assets.dir)).toEqual([file]);
    expect(assets.read(file)).toEqual(Buffer.from(PNG));
  });

  it('rejects files that are not supported images or are too large', () => {
    const assets = store();
    expect(() => assets.add(bytes('<svg/>'))).toThrow('PNG');
    expect(() => assets.add(new Uint8Array(MAX_ASSET_BYTES + 1))).toThrow('2 MB');
  });

  it('reports errors in the interface language', () => {
    expect(() => store().add(bytes('<svg/>'))).toThrow('只支援');
    const english = new ThemeAssets(mkdtempSync(join(tmpdir(), 'chatto-assets-')), () => mainMessages('en'));
    expect(() => english.add(bytes('<svg/>'))).toThrow('Only PNG, WebP and GIF images are supported');
  });

  it('only resolves asset names inside its folder', () => {
    const assets = store();
    const file = assets.add(GIF);
    expect(assets.path(file)).toBe(join(assets.dir, file));
    expect(assets.path(`../${file}`)).toBeNull();
    expect(assets.path('settings.json')).toBeNull();
    expect(assets.has(`${'b'.repeat(64)}.png`)).toBe(false);
  });

  it('deletes images nothing uses and leaves other files alone', () => {
    const assets = store();
    const kept = assets.add(PNG);
    const unused = assets.add(GIF);
    writeFileSync(join(assets.dir, 'notes.txt'), 'keep me');
    expect(assets.collect(new Set([kept]))).toEqual([unused]);
    expect(readdirSync(assets.dir).sort()).toEqual([kept, 'notes.txt'].sort());
  });
});
