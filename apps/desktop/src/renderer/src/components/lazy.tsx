import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { LoadingSpinner } from './kit';

/**
 * `React.lazy` for a named export, so pages keep their named exports and only
 * load (with their dependencies, e.g. CodeMirror) the first time they are shown.
 */
export function lazyNamed<M extends Record<string, unknown>, K extends keyof M & string>(
  load: () => Promise<M>,
  name: K,
): M[K] {
  return lazy(async () => ({ default: (await load())[name] as ComponentType<unknown> })) as unknown as M[K];
}

/** Shown while a lazily loaded page or panel arrives (usually a few frames). */
export function LazyBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid h-full min-h-40 place-items-center text-ink-soft" data-testid="lazy-loading">
          <LoadingSpinner size={24} />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
