import { useEffect, useState, type RefObject } from 'react';

/**
 * True once the element has come within `margin` of the viewport, and stays true.
 * Theme previews render only then: each one lays out a chat with its own fonts,
 * and Chromium keeps the memory a page once used, so drawing cards nobody
 * scrolled to raises memory for the rest of the session (#57).
 */
export function useInView(ref: RefObject<Element | null>, margin = '300px'): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (seen || !element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, margin, seen]);
  return seen;
}
