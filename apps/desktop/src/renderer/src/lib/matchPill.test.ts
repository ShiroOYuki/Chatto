import { describe, expect, it } from 'vitest';
import { pillAtTop } from './matchPill';

const viewport = { w: 400, h: 300 };
const pill = { w: 120, h: 20 };

describe('pillAtTop', () => {
  it('stays at the bottom when nothing is under it', () => {
    expect(pillAtTop([{ x: 0, y: 0, w: 400, h: 40 }], 0, viewport, pill)).toBe(false);
    expect(pillAtTop([], 0, viewport, pill)).toBe(false);
  });

  it('moves to the top when it would cover the last highlighted message', () => {
    expect(pillAtTop([{ x: 0, y: 260, w: 400, h: 40 }], 0, viewport, pill)).toBe(true);
  });

  it('accounts for scrolling', () => {
    const box = { x: 0, y: 560, w: 400, h: 40 };
    expect(pillAtTop([box], 0, viewport, pill)).toBe(false);
    expect(pillAtTop([box], 300, viewport, pill)).toBe(true);
  });

  it('stays put when the top would cover as much', () => {
    expect(pillAtTop([{ x: 0, y: 0, w: 400, h: 300 }], 0, viewport, pill)).toBe(false);
  });
});
