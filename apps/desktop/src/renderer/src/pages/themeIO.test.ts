import { createTheme, DEFAULT_BOX_IMAGE } from '@chatto/chat-ui';
import { describe, expect, it, vi } from 'vitest';
import { needsPackage, parseThemeFile } from './themeIO';

vi.mock('../api', () => ({ api: {}, isMockApi: false }));

const ASSET = `asset:${'a'.repeat(64)}.png`;
const DATA = 'data:image/png;base64,AAAA';

describe('theme files', () => {
  it('only themes with stored images need a package', () => {
    expect(needsPackage(createTheme('t', 't'))).toBe(false);
    expect(needsPackage(createTheme('t', 't', { body: { box: { image: { ...DEFAULT_BOX_IMAGE, src: DATA } } } }))).toBe(
      false,
    );
    expect(
      needsPackage(createTheme('t', 't', { roles: { vip: { frame: { ...DEFAULT_BOX_IMAGE, src: ASSET } } } })),
    ).toBe(true);
  });

  it('imports JSON with a fresh id, keeping data URL frames and dropping ones whose image it cannot carry', () => {
    const theme = createTheme('mine', '我的', {
      message: { box: { image: { ...DEFAULT_BOX_IMAGE, src: ASSET } } },
      body: { box: { image: { ...DEFAULT_BOX_IMAGE, src: DATA } } },
    });
    const imported = parseThemeFile(JSON.stringify(theme));
    expect(imported.id).not.toBe('mine');
    expect(imported.name).toBe('我的（匯入）');
    expect(imported.message.box.image).toBeNull();
    expect(imported.body.box.image?.src).toBe(DATA);
  });
});
