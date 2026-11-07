import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Tracks whether a scrolling list has more content below its visible part, so
 * the list can fade its bottom edge (`mask-b-from-[calc(100%-2rem)]`) only then.
 * Pass the list's content as `deps` so new rows are measured too.
 */
export function useMoreBelow<T extends HTMLElement>(deps: readonly unknown[] = []) {
  const ref = useRef<T>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  useLayoutEffect(measure, [measure, ...deps]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);
  return { ref, moreBelow, onScroll: measure };
}
