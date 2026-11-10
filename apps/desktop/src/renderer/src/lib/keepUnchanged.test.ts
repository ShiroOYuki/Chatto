import { describe, expect, it } from 'vitest';
import { keepUnchanged } from './keepUnchanged';

const a = { id: 'a', name: 'A' };
const b = { id: 'b', name: 'B' };

describe('keepUnchanged', () => {
  it('keeps the previous array when every item is the same', () => {
    const previous = [a, b];
    expect(keepUnchanged(previous, [{ ...a }, { ...b }])).toBe(previous);
  });

  it('keeps unchanged items and takes changed or new ones', () => {
    const changed = { id: 'b', name: 'B2' };
    const added = { id: 'c', name: 'C' };
    const result = keepUnchanged([a, b], [{ ...a }, changed, added]);
    expect(result[0]).toBe(a);
    expect(result[1]).toBe(changed);
    expect(result[2]).toBe(added);
  });

  it('notices a new order', () => {
    const previous = [a, b];
    const result = keepUnchanged(previous, [{ ...b }, { ...a }]);
    expect(result).not.toBe(previous);
    expect(result[0]).toBe(b);
    expect(result[1]).toBe(a);
  });

  it('takes the next list when there is no previous one', () => {
    const next = [a];
    expect(keepUnchanged(undefined, next)).toBe(next);
  });
});
