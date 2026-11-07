import { createTheme, DEFAULT_BOX_IMAGE } from '@chatto/chat-ui';
import { describe, expect, it, vi } from 'vitest';
import themeMessages from '../i18n/messages/themes';
import { exportTheme, parseThemeFile } from './themeIO';

const exportThemePackage = vi.hoisted(() => vi.fn(async () => true));
vi.mock('../api', () => ({ api: { exportThemePackage }, isMockApi: false }));

const ASSET = `asset:${'a'.repeat(64)}.png`;
const DATA = 'data:image/png;base64,AAAA';

describe('theme files', () => {
  it('exports every theme as a package, with or without images', async () => {
    const plain = createTheme('t', 't');
    await exportTheme(plain);
    expect(exportThemePackage).toHaveBeenCalledWith(plain);
  });

  it('imports JSON with a fresh id, keeping data URL frames and dropping ones whose image it cannot carry', () => {
    const theme = createTheme('mine', '我的', {
      message: { box: { image: { ...DEFAULT_BOX_IMAGE, src: ASSET } } },
      body: { box: { image: { ...DEFAULT_BOX_IMAGE, src: DATA } } },
    });
    const imported = parseThemeFile(JSON.stringify(theme), themeMessages['zh-TW'].io);
    expect(imported.id).not.toBe('mine');
    expect(imported.name).toBe('我的（匯入）');
    expect(imported.message.box.image).toBeNull();
    expect(imported.body.box.image?.src).toBe(DATA);
  });
});
