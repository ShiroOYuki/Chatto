import { createTheme, DEFAULT_BOX_IMAGE, getPresetTheme, normalizeTheme } from '@chatto/chat-ui/themes';
import { describe, expect, it } from 'vitest';
import { hasDailyPublishLimit, SHARE_LIMITS, type PublishMeta } from './model';
import {
  autoTags,
  checkPublish,
  createShareCode,
  dataUrlBytes,
  externalCssReferences,
  formatShareCode,
  imageSlotCount,
  isModifiedInstall,
  normalizeTag,
  parseShareCode,
  themeContentHash,
} from './rules';

const meta = (patch: Partial<PublishMeta> = {}): PublishMeta => ({
  name: 'Theme',
  description: '',
  category: 'minimal',
  tags: [],
  ...patch,
});

describe('hasDailyPublishLimit', () => {
  it('limits members and not moderators', () => {
    expect(hasDailyPublishLimit('member')).toBe(true);
    expect(hasDailyPublishLimit('moderator')).toBe(false);
  });
});

describe('theme codes', () => {
  it('creates 8-character Crockford codes that parse back', () => {
    const code = createShareCode(() => 0.5);
    expect(code).toHaveLength(8);
    expect(parseShareCode(code)).toBe(code);
  });

  it('reads codes regardless of case, spaces, dashes and look-alike letters', () => {
    expect(parseShareCode('7k3p-9qxm')).toBe('7K3P9QXM');
    expect(parseShareCode(' 7K3P 9QXM ')).toBe('7K3P9QXM');
    expect(parseShareCode('O1IL-ABCD')).toBe('0111ABCD');
    expect(formatShareCode('7K3P9QXM')).toBe('7K3P-9QXM');
  });

  it('rejects text that is not a whole code', () => {
    expect(parseShareCode('bubbles')).toBeNull();
    expect(parseShareCode('7K3P-9QX')).toBeNull();
    expect(parseShareCode('7K3P-9QXU')).toBeNull();
  });
});

describe('tags', () => {
  it('normalizes typed tags', () => {
    expect(normalizeTag('  Large Text ')).toBe('large-text');
    expect(normalizeTag('#Cute!!')).toBe('cute');
    expect(normalizeTag('可愛 風')).toBe('可愛-風');
    expect(normalizeTag('---')).toBe('');
  });

  it('derives tags from the theme', () => {
    const plain = createTheme('t', 't', { animation: { enter: 'none' } });
    expect(autoTags(plain)).toEqual([]);
    const rich = createTheme('t', 't', {
      animation: { enter: 'fade', duration: 200 },
      customCss: '.chatto-message { color: red; }',
      body: { box: { image: { ...DEFAULT_BOX_IMAGE, src: 'data:image/png;base64,AAAA' } } },
    });
    expect(autoTags(rich)).toEqual(['frame', 'custom-css', 'animated']);
  });
});

describe('content hash', () => {
  it('ignores the local id and origin but notices any change', () => {
    const theme = getPresetTheme('bubble')!;
    const hash = themeContentHash(theme);
    expect(themeContentHash({ ...theme, id: 'other', origin: { shareId: 's', version: 1, contentHash: 'x' } })).toBe(
      hash,
    );
    expect(themeContentHash({ ...theme, customCss: 'a {}' })).not.toBe(hash);
  });

  it('survives normalizing only when the origin is complete', () => {
    const theme = getPresetTheme('washi')!;
    const origin = { shareId: 's', version: 2, contentHash: 'abc' };
    expect(normalizeTheme({ ...theme, origin }).origin).toEqual(origin);
    expect(normalizeTheme({ ...theme, origin: { shareId: 's', version: 0, contentHash: 'abc' } })).not.toHaveProperty(
      'origin',
    );
  });

  it('tells whether an install was changed', () => {
    const theme = getPresetTheme('washi')!;
    const installed = { ...theme, origin: { shareId: 's', version: 1, contentHash: themeContentHash(theme) } };
    expect(isModifiedInstall(installed)).toBe(false);
    expect(isModifiedInstall({ ...installed, name: 'Renamed' })).toBe(true);
    expect(isModifiedInstall(theme)).toBe(false);
  });
});

describe('external CSS', () => {
  it('finds imports and remote urls', () => {
    const css = `@import url("https://x.test/a.css");
      .a { background: url(https://x.test/p.png); }
      .b { background: url('data:image/png;base64,AAAA'); }
      .c { background-image: image-set('https://x.test/i.png' 1x); }`;
    const found = externalCssReferences(css);
    expect(found.some((item) => item.startsWith('@import'))).toBe(true);
    expect(found.some((item) => item.includes('p.png'))).toBe(true);
    expect(found.some((item) => item.includes('i.png'))).toBe(true);
    expect(found.some((item) => item.includes('data:'))).toBe(false);
  });

  it('sees through escapes and comments', () => {
    expect(externalCssReferences('.a { background: \\75 rl(//x.test/p.png) }')).toHaveLength(1);
    expect(externalCssReferences('.a { background: u/**/rl(//x.test/p.png) }')).toHaveLength(1);
    expect(externalCssReferences('/* url(https://x.test) */ .a { color: red }')).toEqual([]);
  });
});

describe('checkPublish', () => {
  const theme = createTheme('t', 'Theme');

  it('passes a plain theme', () => {
    expect(checkPublish(theme, meta())).toEqual([]);
  });

  it('checks the form fields', () => {
    const codes = checkPublish(
      theme,
      meta({
        name: ' ',
        description: 'x'.repeat(SHARE_LIMITS.descriptionLength + 1),
        category: '',
        tags: [...Array(SHARE_LIMITS.tags + 1).keys()].map(String),
      }),
    ).map((issue) => issue.code);
    expect(codes).toEqual(['name-missing', 'description-too-long', 'category-missing', 'too-many-tags']);
  });

  it('rejects remote CSS, oversized images and unchanged copies', () => {
    const big = `data:image/png;base64,${'A'.repeat(Math.ceil((SHARE_LIMITS.imageBytes * 4) / 3) + 8)}`;
    const issues = checkPublish(
      {
        ...theme,
        customCss: '.a { background: url(https://x.test/p.png) }',
        body: { ...theme.body, box: { ...theme.body.box, image: { ...DEFAULT_BOX_IMAGE, src: big } } },
      },
      meta(),
      { unchangedCopy: true },
    );
    expect(issues.map((issue) => issue.code)).toEqual(['css-external', 'image-too-large', 'unchanged-copy']);
  });

  it('measures asset images through the caller', () => {
    const withAsset = {
      ...theme,
      body: {
        ...theme.body,
        box: { ...theme.body.box, image: { ...DEFAULT_BOX_IMAGE, src: `asset:${'a'.repeat(64)}.png` } },
      },
    };
    expect(checkPublish(withAsset, meta(), { assetBytes: () => SHARE_LIMITS.imageBytes + 1 })).toHaveLength(1);
  });

  it('allows as many images as the theme has frame slots', () => {
    expect(imageSlotCount()).toBeGreaterThan(20);
    expect(dataUrlBytes('data:image/png;base64,AAAA')).toBe(3);
  });
});
