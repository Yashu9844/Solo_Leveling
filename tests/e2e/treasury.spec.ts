import { test, expect, type Page } from '@playwright/test';
import { completeOnboarding } from './helpers';

/**
 * Treasury spending can be entered or changed at any hour, for any day.
 *
 * The clock is frozen at 15:30 IST on 5 Sep 2026 — mid-afternoon, a time
 * the old 22:00-03:00 window refused outright — and the treasury is set up
 * for 1-30 Sep with ₹3,800, so days 1-4 are genuinely in the past.
 *
 * Every expected figure is worked out by hand:
 *   allowance = floor(spendable / days left), days left counted inclusive.
 */
const SAFE_TIME = '2026-09-05T10:00:00Z'; // 15:30 IST

async function setUpTreasury(page: Page) {
  await page.getByText('Set up ›').click();
  const sheet = page.getByTestId('treasury-setup-sheet');
  await sheet.locator('input[type="date"]').nth(0).fill('2026-09-01');
  await sheet.locator('input[type="date"]').nth(1).fill('2026-09-30');
  await page.getByPlaceholder('Source name (e.g. Bank, Cash)').fill('Bank');
  await page.getByPlaceholder('Amount ₹').fill('3800');
  await page.getByTestId('treasury-setup-submit').click();
  await expect(page.getByTestId('treasury-spendable')).toBeVisible();
}

async function enter(page: Page, rupees: string) {
  const input = page.getByTestId('treasury-spend-input');
  await input.fill(rupees);
  await page.getByTestId('treasury-register-button').click();
}

test.describe('treasury entry — no time window, any day', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date(SAFE_TIME) });
    await completeOnboarding(page);
    await page.getByTestId('treasury-card').scrollIntoViewIfNeeded();
    await setUpTreasury(page);
  });

  test('the field is open and usable in the middle of the afternoon', async ({ page }) => {
    await expect(page.getByTestId('treasury-spend-input')).toBeEnabled();
    await expect(page.getByTestId('treasury-card')).not.toContainText(/opens at 22:00/i);
    await expect(page.getByTestId('treasury-day-label')).toContainText('Today');
  });

  test('typing keeps the number, and registering today moves the figures at once', async ({ page }) => {
    const input = page.getByTestId('treasury-spend-input');
    await input.click();
    await input.pressSequentially('30');
    // Give the card's polling a chance to wipe it — it must not.
    await page.waitForTimeout(600);
    await expect(input).toHaveValue('30');

    await page.getByTestId('treasury-register-button').click();
    // Today is the 5th: 26 days left, minus today now accounted = 25.
    // Only entered money is deducted, so 3,800 - 30 = 3,770.
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,770');
    await expect(page.getByTestId('treasury-days-left')).toHaveText('25');
    await expect(page.getByTestId('treasury-allowance')).toContainText('₹150.80'); // floor(377000/25)
    await expect(page.getByTestId('treasury-register-button')).toContainText('Update');
  });

  test("today's figure can be raised and then lowered", async ({ page }) => {
    await enter(page, '30');
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,770');

    await enter(page, '150'); // raised
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,650');
    await expect(page.getByTestId('treasury-allowance')).toContainText('₹146.00'); // 365000/25

    await enter(page, '50'); // lowered
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,750');
    await expect(page.getByTestId('treasury-allowance')).toContainText('₹150.00'); // 375000/25
  });

  test('forgotten past days are flagged and can be filled in', async ({ page }) => {
    await expect(page.getByTestId('treasury-unaccounted')).toContainText('4 days unaccounted');

    await page.getByTestId('treasury-unaccounted').click();
    await expect(page.getByTestId('treasury-day-label')).toHaveText(/Tue 1 Sep/);
    await enter(page, '100');

    // One day filled in. Spendable now = 3,800 - 100.
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,700');
    // Back on today, three days are left to fill.
    for (let i = 0; i < 4; i++) await page.getByTestId('treasury-next-day').click();
    await expect(page.getByTestId('treasury-unaccounted')).toContainText('3 days unaccounted');
  });

  test('editing an old day up or down re-spreads what is left', async ({ page }) => {
    // Go back to the 1st and enter ₹100: today then has 3,700 over 26 days.
    await page.getByTestId('treasury-prev-day').click();
    await page.getByTestId('treasury-prev-day').click();
    await page.getByTestId('treasury-prev-day').click();
    await page.getByTestId('treasury-prev-day').click();
    await expect(page.getByTestId('treasury-day-label')).toHaveText(/Tue 1 Sep/);
    await enter(page, '100');
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,700');
    await expect(page.getByTestId('treasury-allowance')).toContainText('₹142.30'); // floor(370000/26)

    await enter(page, '400'); // raised: 3,400 / 26
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,400');
    await expect(page.getByTestId('treasury-allowance')).toContainText('₹130.76');

    await enter(page, '0'); // lowered all the way: 3,800 / 26
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,800');
    await expect(page.getByTestId('treasury-allowance')).toContainText('₹146.15');
  });

  test('you cannot step forward past today, or back before the period', async ({ page }) => {
    await expect(page.getByTestId('treasury-next-day')).toBeDisabled();
    for (let i = 0; i < 4; i++) await page.getByTestId('treasury-prev-day').click();
    await expect(page.getByTestId('treasury-prev-day')).toBeDisabled();
    await page.getByTestId('treasury-next-day').click();
    await expect(page.getByTestId('treasury-day-label')).toHaveText(/Wed 2 Sep/);
  });

  test('entries survive a reload', async ({ page }) => {
    await enter(page, '30');
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,770');
    await page.reload();
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,770');
    await expect(page.getByTestId('treasury-spend-input')).toHaveValue('30');
  });

  test('a negative amount cannot be registered', async ({ page }) => {
    await page.getByTestId('treasury-spend-input').fill('-5');
    await expect(page.getByTestId('treasury-register-button')).toBeDisabled();
  });

  test('the card does not overflow a 320px screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.getByTestId('treasury-card').scrollIntoViewIfNeeded();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflows).toBe(false);
  });
});

test('entry still works at 03:30 IST, inside the old day-close window', async ({ page }) => {
  // 22:00Z on the 5th = 03:30 IST on the 6th, which is still local date the 5th.
  await page.clock.install({ time: new Date('2026-09-05T22:00:00Z') });
  await completeOnboarding(page);
  await setUpTreasury(page);
  await expect(page.getByTestId('treasury-spend-input')).toBeEnabled();
  await enter(page, '30');
  await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,770');
});
