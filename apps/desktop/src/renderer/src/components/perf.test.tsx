import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatLine, NoticeLine } from './ChatLine';
import { SlidingHighlight } from './motion';
import { TeaCup } from './TeaCup';

// These pieces render on every chat message; see docs/design.md "動畫" for why each one matters.
describe('render cost guards', () => {
  it('memoizes the components that re-render with the chat log', () => {
    const memo = Symbol.for('react.memo');
    for (const component of [ChatLine, NoticeLine, SlidingHighlight]) {
      expect((component as unknown as { $$typeof: symbol }).$$typeof).toBe(memo);
    }
  });

  it('draws each steam wisp as its own <svg> so the compositor can animate it', () => {
    const { container, rerender } = render(<TeaCup mood="happy" />);
    const wisps = container.querySelectorAll('svg.steam');
    expect(wisps).toHaveLength(3);
    for (const wisp of wisps) expect(wisp.parentElement?.tagName).toBe('SPAN');

    rerender(<TeaCup mood="sleepy" />);
    expect(container.querySelectorAll('.steam')).toHaveLength(0);
  });
});
