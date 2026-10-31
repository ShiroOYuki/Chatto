import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);

/**
 * Browser and Electron suites (see docs/testing.md):
 * - `web`: control panel (mock API) and viewer pages in Chromium.
 * - `visual`: screenshot comparisons of every preset theme and key pages.
 * - `electron`: the built desktop app; run `npm run build` first.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{testFileName}/{arg}{-projectName}{-platform}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 820 },
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'web', testDir: 'tests/e2e/web' },
    { name: 'visual', testDir: 'tests/e2e/visual' },
    { name: 'electron', testDir: 'tests/e2e/electron', workers: 1 },
  ],
  webServer: [
    {
      command: 'npm run dev:web',
      url: 'http://localhost:5175',
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev:viewer',
      url: 'http://localhost:5174/overlay',
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
  ],
});
