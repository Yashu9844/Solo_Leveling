import { test, expect } from '@playwright/test';

test('app loads with the network disabled after a warm-up install', async ({ page, context }) => {
  // Warm-up load: registers the service worker and populates the precache.
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'TODAY' })).toBeVisible();
});
