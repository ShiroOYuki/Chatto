import { assetSrc, type BoxImage, type ChatTheme } from '@chatto/core';
import { createTheme, DEFAULT_BOX_IMAGE } from '@chatto/chat-ui/themes';
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { MAX_ASSET_BYTES } from './theme-assets';
import { packTheme, themeAssetFiles, unpackTheme } from './theme-package';

const A = `${'a'.repeat(64)}.png`;
const B = `${'b'.repeat(64)}.gif`;
const frame = (file: string): BoxImage => ({ ...DEFAULT_BOX_IMAGE, src: assetSrc(file) });
const theme: ChatTheme = {
  ...createTheme('framed', '有外框', {
    message: { box: { image: frame(A) } },
    roles: { vip: { frame: frame(B) } },
    body: { box: { image: { ...DEFAULT_BOX_IMAGE, src: 'data:image/png;base64,AAAA' } } },
  }),
  builtIn: true,
};

describe('theme packages', () => {
  it('lists the stored assets a theme uses', () => {
    expect(themeAssetFiles(theme).sort()).toEqual([A, B]);
  });

  it('round-trips a theme with its images', () => {
    const files: Record<string, Uint8Array> = { [A]: strToU8('png-bytes'), [B]: strToU8('gif-bytes') };
    const unpacked = unpackTheme(packTheme(theme, (file) => files[file] ?? null));
    const { builtIn: _builtIn, ...expected } = theme;
    expect(unpacked.theme).toEqual(expected);
    expect(Object.fromEntries(unpacked.assets)).toEqual(files);
  });

  it('leaves out images that are missing', () => {
    const unpacked = unpackTheme(packTheme(theme, (file) => (file === A ? strToU8('png') : null)));
    expect([...unpacked.assets.keys()]).toEqual([A]);
  });

  it('ignores entries that are not the theme or a valid asset name', () => {
    const zip = zipSync({
      'theme.json': strToU8('{}'),
      'assets/../../evil.png': strToU8('x'),
      'assets/frame.png': strToU8('x'),
      'readme.txt': strToU8('hi'),
    });
    expect(unpackTheme(zip).assets.size).toBe(0);
  });

  it('rejects files that are not packages', () => {
    expect(() => unpackTheme(strToU8('not a zip'))).toThrow('不是有效的主題包');
    expect(() => unpackTheme(zipSync({ 'other.json': strToU8('{}') }))).toThrow('theme.json');
    expect(() => unpackTheme(zipSync({ 'theme.json': strToU8('{oops') }))).toThrow('JSON');
  });

  it('refuses oversized entries', () => {
    const big = zipSync({ 'theme.json': strToU8('{}'), [`assets/${A}`]: new Uint8Array(MAX_ASSET_BYTES + 1) });
    expect(() => unpackTheme(big)).toThrow('不是有效的主題包');
  });
});
