import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  /**
   * Capped rather than left at Playwright's default of half the cores.
   *
   * xp.spec's "tap -> XP feedback rendered in under 300ms" is a product
   * requirement (final/06 §4.3), and a performance assertion is only
   * meaningful on a machine that is not saturated. At the default 8
   * workers on a 16-core box this suite drove that measurement to
   * 310-332ms while the same interaction measured 106-127ms on an idle
   * machine — the failures were reporting CPU contention between
   * browsers, not the app. The threshold stays at 300ms; only the noise
   * around it is reduced.
   */
  workers: 4,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-pixel-7',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
