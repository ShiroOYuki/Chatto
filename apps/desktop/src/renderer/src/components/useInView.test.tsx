import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useInView } from './useInView';

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref);
  return <div ref={ref}>{seen ? 'drawn' : 'waiting'}</div>;
}

describe('useInView', () => {
  it('waits until the element nears the viewport, then stays true', () => {
    let report: IntersectionObserverCallback = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          report = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    render(<Probe />);
    expect(screen.getByText('waiting')).toBeTruthy();

    const entry = (isIntersecting: boolean) => [{ isIntersecting } as IntersectionObserverEntry];
    act(() => report(entry(false), {} as IntersectionObserver));
    expect(screen.getByText('waiting')).toBeTruthy();
    act(() => report(entry(true), {} as IntersectionObserver));
    expect(screen.getByText('drawn')).toBeTruthy();
    expect(disconnect).toHaveBeenCalled();
  });
});
