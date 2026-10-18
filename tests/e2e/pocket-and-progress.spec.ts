import { test, expect, type Page } from '@playwright/test';
import { completeOnboarding } from './helpers';

/**
 * Three things fixed together, each reproduced here as the Player hit it:
 *
 *  1. The pocket is re-counted on the 5th of every month.
 *  2. Practising a DSA topic on Skills moves the skill and the weekly count.
 *  3. A weekly "ship one" quest can be marked done.
 */

test.describe('monthly pocket check-in', () => {
  // 19 Oct 2026, 15:30 IST. The treasury being set up ran 5 Sep - 4 Oct,
  // so a new cycle (5 Oct - 4 Nov) has begun and not been answered.
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-19T10:00:00Z') });
    await completeOnboarding(page);
    await page.getByText('Set up ›').click();
    const sheet = page.getByTestId('treasury-setup-sheet');
    await sheet.locator('input[type="date"]').nth(0).fill('2026-09-05');
    await sheet.locator('input[type="date"]').nth(1).fill('2026-10-04');
    await page.getByPlaceholder('Source name (e.g. Bank, Cash)').fill('Pocket');
    await page.getByPlaceholder('Amount ₹').fill('3000');
    await page.getByTestId('treasury-setup-submit').click();
    // The ended period concludes as SURVIVED and the ceremony plays once;
    // dismiss it to reach the question underneath.
    await expect(page.getByTestId('treasury-survived-moment')).toBeVisible();
    await page.getByRole('button', { name: 'ACKNOWLEDGE' }).click();
    await expect(page.getByTestId('treasury-survived-moment')).toHaveCount(0);
  });

  test('asks how much is in the pocket and counts down from the answer', async ({ page }) => {
    await expect(page.getByTestId('cycle-checkin')).toBeVisible();
    await expect(page.getByTestId('cycle-checkin')).toContainText('5 Oct');
    await expect(page.getByTestId('cycle-checkin')).toContainText('4 Nov');

    await page.getByTestId('cycle-pocket-input').fill('3180');
    await page.getByTestId('cycle-start-button').click();

    // 19 Oct .. 4 Nov = 17 days; floor(3180 / 17) = 187.05
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,180');
    await expect(page.getByTestId('treasury-days-left')).toHaveText('17');
    await expect(page.getByTestId('treasury-allowance')).toContainText('₹187.05');
    await expect(page.getByTestId('cycle-checkin')).toHaveCount(0);
  });

  test('deduction starts from the pocket figure', async ({ page }) => {
    await page.getByTestId('cycle-pocket-input').fill('3180');
    await page.getByTestId('cycle-start-button').click();
    await page.getByTestId('treasury-spend-input').fill('180');
    await page.getByTestId('treasury-register-button').click();
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,000');
    await expect(page.getByTestId('treasury-days-left')).toHaveText('16');
    await expect(page.getByTestId('treasury-allowance')).toContainText('₹187.50'); // 3000 / 16
  });

  test('yesterday can still be registered after the pocket was counted, without changing it', async ({ page }) => {
    // Pocket counted on the 19th, after the 18th's spending was already out of it.
    await page.getByTestId('cycle-pocket-input').fill('3180');
    await page.getByTestId('cycle-start-button').click();
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,180');

    await page.getByTestId('treasury-prev-day').click();
    await expect(page.getByTestId('treasury-day-label')).toHaveText(/Sun 18 Oct/);
    await page.getByTestId('treasury-spend-input').fill('250');
    await page.getByTestId('treasury-register-button').click();

    // It is recorded: the button now offers Update, and the figure is kept.
    await expect(page.getByTestId('treasury-register-button')).toContainText('Update');
    await expect(page.getByTestId('treasury-spend-input')).toHaveValue('250');
    // ...but the pocket the Player gave is untouched.
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,180');
    await expect(page.getByTestId('treasury-days-left')).toHaveText('17');
    await expect(page.getByTestId('treasury-allowance')).toContainText('₹187.05');

    // The 18th can be changed again; still no effect on the pocket.
    await page.getByTestId('treasury-spend-input').fill('900');
    await page.getByTestId('treasury-register-button').click();
    await expect(page.getByTestId('treasury-spendable')).toHaveText('₹3,180');
  });

  test('"Not now" puts the normal card back, and the question returns on reload', async ({ page }) => {
    await page.getByTestId('cycle-later').click();
    await expect(page.getByTestId('cycle-checkin')).toHaveCount(0);
    await expect(page.getByTestId('treasury-spendable')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('cycle-checkin')).toBeVisible();
  });

  test('will not start a cycle from an empty field', async ({ page }) => {
    await page.getByTestId('cycle-pocket-input').fill('');
    await expect(page.getByTestId('cycle-start-button')).toBeDisabled();
  });
});

test('the card is not asking mid-cycle', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-10T10:00:00Z') });
  await completeOnboarding(page);
  await page.getByText('Set up ›').click();
  await page.getByPlaceholder('Source name (e.g. Bank, Cash)').fill('Pocket');
  await page.getByPlaceholder('Amount ₹').fill('3000');
  await page.getByTestId('treasury-setup-submit').click();
  await expect(page.getByTestId('treasury-spendable')).toBeVisible();
  await expect(page.getByTestId('cycle-checkin')).toHaveCount(0);
});

const SAFE_TIME = '2026-09-05T10:00:00Z';

test('practising a DSA topic on Skills raises the skill', async ({ page }) => {
  await page.clock.install({ time: new Date(SAFE_TIME) });
  await completeOnboarding(page);
  await page.getByRole('link', { name: 'SKILLS' }).click();

  const arrays = page.getByText('Arrays', { exact: true }).locator('..');
  await expect(arrays.locator('[aria-label="unseen"]')).toBeVisible();

  await page.getByTitle('Practice Arrays').click();
  const record = page.getByRole('button', { name: /RECORD PRACTICE/ });
  await expect(record).toBeDisabled(); // a DSA practice needs the problem named
  await page.getByLabel('Problem name').fill('Two Sum');
  await record.click();

  await expect(page.getByText('Arrays', { exact: true }).locator('..').locator('[aria-label="introduced"]')).toBeVisible();
});

async function insertWeeklyShipQuest(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('system-arc');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('weekly_quest', 'readwrite');
          tx.objectStore('weekly_quest').add({
            id: 'wq-e2e',
            week_start_date: '2026-09-01',
            week_end_date: '2026-09-07',
            kind: 'ship_project',
            description: 'Ship one real unit of progress this week',
            target: 1,
            xp: 0,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      })
  );
}

test('a weekly ship quest can be marked done', async ({ page }) => {
  await page.clock.install({ time: new Date(SAFE_TIME) });
  await completeOnboarding(page);
  await insertWeeklyShipQuest(page);
  await page.reload();

  const card = page.getByTestId('weekly-quest-progress');
  await expect(card).toContainText('0/1');

  await page.getByTestId('weekly-ship-open').scrollIntoViewIfNeeded();
  await page.getByTestId('weekly-ship-open').click();
  const save = page.getByTestId('ship-save');
  await expect(save).toBeDisabled(); // naming what was shipped is required
  await page.getByTestId('ship-title').fill('Job tracker app');
  await save.click();

  await expect(card).toContainText('1/1');
  await expect(card).toContainText('COMPLETE');
  await expect(page.getByTestId('weekly-ship-open')).toHaveCount(0);
});
