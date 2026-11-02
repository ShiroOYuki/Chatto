import { BUILTIN_SOUNDS } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import { BUILTIN_SOUND_ASSETS, dataUriBytes } from './sounds';

describe('built-in sounds', () => {
  it('every built-in id has a CC0 sound', async () => {
    for (const id of BUILTIN_SOUNDS) {
      const asset = await BUILTIN_SOUND_ASSETS[id]();
      expect(asset.license).toBe('CC0');
      expect(asset.dataUri).toMatch(/^data:audio\/mpeg;base64,/);
    }
  });

  it('decodes data URIs without fetching', () => {
    const bytes = new Uint8Array(dataUriBytes('data:audio/mpeg;base64,SUQz'));
    expect([...bytes]).toEqual([0x49, 0x44, 0x33]); // "ID3"
  });
});
