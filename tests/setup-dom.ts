import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Component tests are written against Traditional Chinese text. Components
// rendered without app state fall back to DEFAULT_LOCALE (English), so pin it.
vi.mock('@chatto/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@chatto/core')>()),
  DEFAULT_LOCALE: 'zh-TW',
}));

// Browser APIs jsdom does not implement but Radix, Motion and the app touch.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

class NoopObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver;
/** jsdom has no layout: every observed element counts as on screen, so lazily drawn previews render. */
class VisibleObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element): void {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}
globalThis.IntersectionObserver ??= VisibleObserver as unknown as typeof IntersectionObserver;

Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => undefined;
Element.prototype.setPointerCapture ??= () => undefined;

afterEach(() => cleanup());
