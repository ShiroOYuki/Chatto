import { describe, expect, it } from 'vitest';
import { applyEmoteTable, fragmentsToText, linkifyFragments } from './fragments';
import type { Emote, MessageFragment } from './message';

const kappa: Emote = { id: '25', name: 'Kappa', source: 'platform', image: { x1: 'k.png' } };

describe('fragments', () => {
  it('linkifies urls and keeps text intact', () => {
    const input: MessageFragment[] = [{ type: 'text', text: 'see https://chatto.dev now' }];
    const out = linkifyFragments(input);
    expect(out.map((f) => f.type)).toEqual(['text', 'link', 'text']);
    expect(fragmentsToText(out)).toBe('see https://chatto.dev now');
  });

  it('replaces whole-word emotes only', () => {
    const input: MessageFragment[] = [{ type: 'text', text: 'hi Kappa notKappa' }];
    const out = applyEmoteTable(input, (word) => (word === 'Kappa' ? kappa : undefined));
    expect(out.filter((f) => f.type === 'emote')).toHaveLength(1);
    expect(fragmentsToText(out)).toBe('hi Kappa notKappa');
  });
});
