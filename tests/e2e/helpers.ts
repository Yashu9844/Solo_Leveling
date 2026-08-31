import { expect, type Page } from '@playwright/test';

async function fillStep5(page: Page) {
  await page.getByTestId('career-intention-place').fill('my desk');
  await page.getByTestId('career-intention-action').fill('open the job board before anything');
  await page.getByTestId('dsa-intention-place').fill('my desk');
  await page.getByTestId('dsa-intention-action').fill('open the editor');
  await page.getByTestId('training-intention-place').fill('the gym');
  await page.getByTestId('training-intention-action').fill('change & start');
}

/** Drives a fresh /onboarding load up to (not including) the final submit,
 * leaving the page on step 6. */
export async function reachStep6(page: Page, name = 'Ada') {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByPlaceholder('Your name').fill(name);
  await page.getByRole('button', { name: 'Begin' }).click(); // -> step 2
  await page.getByRole('button', { name: 'Next' }).click(); // -> step 3
  await page.getByRole('button', { name: 'Next' }).click(); // -> step 4
  await page
    .getByPlaceholder('This is the only thing the app judges you against.')
    .fill('Ship a working agent and land an offer.');
  await page.getByRole('button', { name: 'Next' }).click(); // -> step 5
  await fillStep5(page);
  await page.getByRole('button', { name: 'Next' }).click(); // -> step 6
}

/** Full fresh-boot onboarding flow, landing on /today. */
export async function completeOnboarding(page: Page, name = 'Ada') {
  await reachStep6(page, name);
  await page.getByRole('button', { name: 'Initialise system' }).click();
  await expect(page).toHaveURL(/\/today$/);
}
