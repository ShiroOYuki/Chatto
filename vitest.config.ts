import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const renderer = resolve(import.meta.dirname, 'apps/desktop/src/renderer/src');

/**
 * Unit and component tests. Two projects share one run:
 * - `unit`: pure logic, providers and the Electron main process (node).
 * - `dom`: React components and hooks (`*.test.tsx`, jsdom).
 * Playwright suites live in tests/e2e and are excluded here.
 */
export default defineConfig({
  resolve: { alias: { '@': renderer } },
  test: {
    exclude: ['**/node_modules/**', '**/out/**', '**/dist/**', 'tests/e2e/**'],
    restoreMocks: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['packages/*/src/**/*.test.tsx', 'apps/*/src/**/*.test.tsx'],
          setupFiles: ['tests/setup-dom.ts'],
        },
      },
    ],
  },
});
