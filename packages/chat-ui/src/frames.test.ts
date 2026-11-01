import { assetFileOf, assetSrc, isValidImageSrc, type BoxImage, type ChatTheme } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import { imageDeclarations, themeToCss } from './themeCss';
import {
  BASE_THEME,
  createTheme,
  DEFAULT_BOX_IMAGE,
  mapThemeImages,
  normalizeTheme,
  sanitizeBoxImage,
  themeImageSources,
} from './themes';

const FILE = `${'a'.repeat(64)}.png`;
const DATA = 'data:image/png;base64,iVBORw0KGgo=';
const frame = (overrides: Partial<BoxImage> = {}): BoxImage => ({
  ...DEFAULT_BOX_IMAGE,
  src: assetSrc(FILE),
  ...overrides,
});

describe('frame sources', () => {
  it('accepts stored assets and image data URLs only', () => {
    expect(assetFileOf(assetSrc(FILE))).toBe(FILE);
    expect(isValidImageSrc(assetSrc(FILE))).toBe(true);
    expect(isValidImageSrc(DATA)).toBe(true);
    for (const bad of [
      'asset:../secrets.png',
      `asset:${'a'.repeat(64)}.svg`,
      'data:image/svg+xml;base64,PHN2Zz4=',
      'https://example.com/frame.png',
      '',
    ]) {
      expect(isValidImageSrc(bad), bad).toBe(false);
    }
  });
});

describe('frame CSS', () => {
  it('draws the image in a transparent border as wide as the scaled slices', () => {
    const css = imageDeclarations({
      ...frame({ slice: [10, 20, 30, 40], scale: 0.5, repeat: 'round', outset: [1, 2, 3, 4] }),
      src: '/x.png',
    });
    expect(css).toEqual([
      'border-style: solid',
      'border-color: transparent',
      'border-width: 5px 10px 15px 20px',
      'border-image-source: url("/x.png")',
      'border-image-slice: 10 20 30 40 fill',
      'border-image-width: 5px 10px 15px 20px',
      'border-image-outset: 1px 2px 3px 4px',
      'border-image-repeat: round',
    ]);
    expect(imageDeclarations({ ...frame({ fill: false }), src: '/x.png' })).toContain(
      'border-image-slice: 16 16 16 16',
    );
  });

  it('resolves stored assets through the given URL and passes data URLs through', () => {
    const theme = createTheme('t', 't', {
      message: { box: { image: frame() } },
      body: { box: { image: frame({ src: DATA }) } },
    });
    const css = themeToCss(theme, '.s', { assetUrl: (file) => `http://localhost:4820/theme-assets/${file}` });
    expect(css).toContain(`url("http://localhost:4820/theme-assets/${FILE}")`);
    expect(css).toContain(`url("${DATA}")`);
    expect(themeToCss(theme, '.s')).toContain(`url("/theme-assets/${FILE}")`);
  });

  it('replaces the border and turns the shadow into a drop shadow that follows the image', () => {
    const shadow = { x: 1, y: 2, blur: 3, spread: 4, color: 'red' };
    const theme = createTheme('t', 't', {
      message: { box: { image: frame(), shadow, border: { width: 2, style: 'solid', color: 'blue' } } },
    });
    const message = themeToCss(theme, '.s').split('.s .chatto-message {')[1]!.split('}')[0]!;
    expect(message).toContain('filter: drop-shadow(1px 2px 3px red)');
    expect(message).toContain('box-shadow: none');
    expect(message).not.toContain('2px solid blue');
  });

  it('boxes without a frame clear one a role may have set', () => {
    expect(themeToCss(BASE_THEME, '.s')).toContain('border-image: none');
  });

  it('puts a role frame on the message surface', () => {
    const theme = createTheme('t', 't', { roles: { moderator: { frame: frame() } } });
    expect(themeToCss(theme, '.s')).toMatch(/\[data-roles~="moderator"\] \{[^}]*border-image-source/);
    const onBody = createTheme('t', 't', { body: { box: { background: '#000' } }, roles: { vip: { frame: frame() } } });
    expect(themeToCss(onBody, '.s')).toMatch(/\[data-roles~="vip"\] \.chatto-body \{[^}]*border-image-source/);
  });
});

describe('frame data', () => {
  it('fills missing fields and clamps values', () => {
    expect(sanitizeBoxImage({ src: DATA })).toEqual({ ...DEFAULT_BOX_IMAGE, src: DATA });
    expect(sanitizeBoxImage({ src: DATA, slice: [-5, 1, 2], scale: 100, repeat: 'wobble' })).toEqual({
      ...DEFAULT_BOX_IMAGE,
      src: DATA,
      scale: 8,
    });
    expect(sanitizeBoxImage({ src: 'https://example.com/a.png' })).toBeNull();
  });

  it('normalizing a theme drops frames Chatto will not load and keeps the rest', () => {
    const raw = {
      ...structuredClone(BASE_THEME),
      message: { ...BASE_THEME.message, box: { ...BASE_THEME.message.box, image: { src: 'https://evil/x.png' } } },
      body: { ...BASE_THEME.body, box: { ...BASE_THEME.body.box, image: { src: DATA, slice: [4, 4, 4, 4] } } },
      roles: { vip: { frame: { src: 'nope' } }, moderator: { nameColor: 'red', frame: { src: assetSrc(FILE) } } },
    };
    const theme = normalizeTheme(raw);
    expect(theme.message.box.image).toBeNull();
    expect(theme.body.box.image).toEqual({ ...DEFAULT_BOX_IMAGE, src: DATA, slice: [4, 4, 4, 4] });
    expect(theme.roles.vip).toEqual({});
    expect(theme.roles.moderator).toEqual({ nameColor: 'red', frame: frame() });
  });

  it('older themes without frames get none', () => {
    const { image: _image, ...oldBox } = BASE_THEME.message.box;
    const old = { ...structuredClone(BASE_THEME), message: { ...BASE_THEME.message, box: oldBox } };
    expect(normalizeTheme(old).message.box.image).toBeNull();
  });

  it('lists and rewrites every frame in a theme', () => {
    const theme: ChatTheme = createTheme('t', 't', {
      list: { box: { image: frame() } },
      notice: { box: { image: frame({ src: DATA }) } },
      roles: { vip: { frame: frame() } },
    });
    expect(themeImageSources(theme).sort()).toEqual([DATA, assetSrc(FILE)].sort());
    const stripped = mapThemeImages(theme, () => null);
    expect(themeImageSources(stripped)).toEqual([]);
    expect(stripped.list.box.image).toBeNull();
    expect(stripped.roles.vip).toEqual({});
  });
});
