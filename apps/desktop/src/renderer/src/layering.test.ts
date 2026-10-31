import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Pages and components reach the main process only through `services/` (actions) and
 * `store.tsx` (state subscription). This keeps IPC calls, and their error handling, in one place.
 */
const ROOT = import.meta.dirname;
const ALLOWED = new Set(['api.ts', 'store.tsx']);
const IMPORTS_API = /from\s+['"](\.\.?\/)+api['"]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('renderer layering', () => {
  it('only services and the store import the IPC api', () => {
    const offenders = sourceFiles(ROOT)
      .map((path) => relative(ROOT, path).replaceAll('\\', '/'))
      .filter((path) => !ALLOWED.has(path) && !path.startsWith('services/'))
      .filter((path) => IMPORTS_API.test(readFileSync(join(ROOT, path), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
