import { test, expect, type Page } from '@playwright/test';
import { completeOnboarding } from './helpers';

// Same reasoning as core-loop.spec.ts: never depend on the real wall
// clock for which local_date the arc considers "today."
const SAFE_TIME = '2026-09-05T10:00:00Z';

async function withSafeClock(page: Page) {
  await page.clock.install({ time: new Date(SAFE_TIME) });
}

const MOMENT = (page: Page) => page.getByRole('button', { name: /Level up/ });

async function dismissMomentIfPresent(page: Page) {
  // Poll briefly rather than a one-shot isVisible() check — the Moment
  // mounts asynchronously after the write resolves, and a same-tick
  // check can miss it, leaving it to block the NEXT click as a full-
  // screen overlay intercepting pointer events.
  const appeared = await MOMENT(page)
    .waitFor({ state: 'visible', timeout: 400 })
    .then(() => true)
    .catch(() => false);
  if (appeared) {
    await MOMENT(page).click();
    await expect(MOMENT(page)).toHaveCount(0);
  }
}

async function completeByTitle(page: Page, title: string) {
  await page.getByRole('button', { name: `Complete ${title}` }).click();
  await dismissMomentIfPresent(page);
}

async function barWidthPct(page: Page): Promise<number> {
  const style = await page.getByTestId('xp-bar-fill').getAttribute('style');
  const match = style?.match(/width:\s*([\d.]+)%/);
  return match ? Number(match[1]) : 0;
}

test('completing a quest shows +XP and advances the bar', async ({ page }) => {
  await withSafeClock(page);
  await completeOnboarding(page);

  expect(await barWidthPct(page)).toBe(0);

  const row = page.getByTestId('quest-row-career');
  await page.getByRole('button', { name: 'Complete CAREER' }).click();

  await expect(page.getByRole('button', { name: 'Undo CAREER' })).toBeVisible();
  await expect(row).toContainText('+100');
  // Same reasoning as the undo test below: the button's optimistic flip
  // and the confirmed write (a full rebuildProjections) resolve on
  // different timelines, so poll rather than assume they're in sync.
  await expect.poll(() => barWidthPct(page)).toBeGreaterThan(0);
});

test('tap -> XP feedback rendered in under 300ms', async ({ page }) => {
  await withSafeClock(page);
  await completeOnboarding(page);

  const start = Date.now();
  await page.getByRole('button', { name: 'Complete DSA' }).click();
  await expect(page.getByRole('button', { name: 'Undo DSA' })).toBeVisible();
  const elapsed = Date.now() - start;

  expect(elapsed).toBeLessThan(300);
});

test('undo removes the XP; total returns to its prior value', async ({ page }) => {
  await withSafeClock(page);
  await completeOnboarding(page);

  expect(await barWidthPct(page)).toBe(0);

  await page.getByRole('button', { name: 'Complete BUILD' }).click();
  await expect(page.getByRole('button', { name: 'Undo BUILD' })).toBeVisible();
  // The button's optimistic flip and the confirmed XP write (a full
  // rebuildProjections since Slice 4) resolve on different timelines —
  // poll rather than assume the bar has caught up the instant the
  // button re-renders.
  await expect.poll(() => barWidthPct(page)).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Undo BUILD' }).click();
  await expect(page.getByRole('button', { name: 'Complete BUILD' })).toBeVisible();
  await expect.poll(() => barWidthPct(page)).toBe(0);
});

test('crossing a level boundary fires the LEVEL UP Moment', async ({ page }) => {
  await withSafeClock(page);
  await completeOnboarding(page);

  // career(100) + dsa(100) + build(100) = 300, crossing req(1)=280.
  await page.getByRole('button', { name: 'Complete CAREER' }).click();
  await page.getByRole('button', { name: 'Complete DSA' }).click();
  await page.getByRole('button', { name: 'Complete BUILD' }).click();

  await expect(MOMENT(page)).toBeVisible();
  await expect(page.getByText('01 → 02')).toBeVisible();
});

test('the Moment dismisses on any tap', async ({ page }) => {
  await withSafeClock(page);
  await completeOnboarding(page);

  await page.getByRole('button', { name: 'Complete CAREER' }).click();
  await page.getByRole('button', { name: 'Complete DSA' }).click();
  await page.getByRole('button', { name: 'Complete BUILD' }).click();
  await expect(MOMENT(page)).toBeVisible();

  await MOMENT(page).click();
  await expect(MOMENT(page)).toHaveCount(0);
});

test('the 4th level-up renders as an inline banner, not full screen', async ({ page }) => {
  // Four simulated days of completing all six quests, with a reload and
  // a clock advance between each — 24 completions and 4 cold boots in
  // one test. It is slow by construction, not by regression.
  test.slow();
  await withSafeClock(page);
  await completeOnboarding(page);

  const CORE_TITLES = ['CAREER', 'DSA', 'BUILD', 'TRAINING', 'SLEEP', 'ATTENTION'];
  // ~500 XP/day; cumulative req to L5 is 1,630 (280+370+450+530), so 4
  // full days of all-six completions (2,000 XP) crosses 4 boundaries
  // (L2, L3, L4, L5) — the 4th (L5) must degrade to a banner.
  for (let day = 0; day < 4; day++) {
    if (day > 0) {
      const next = new Date(SAFE_TIME);
      next.setUTCDate(next.getUTCDate() + day);
      await page.clock.setFixedTime(next);
      await page.reload();
    }
    for (const title of CORE_TITLES) {
      await completeByTitle(page, title);
    }
  }

  // The 4th crossing must NOT be a full-screen Moment...
  await expect(MOMENT(page)).toHaveCount(0);
  // ...but the inline banner text must be present on TODAY.
  await expect(page.getByText(/LEVEL \d{2} → \d{2}/)).toBeVisible();
});

test('prefers-reduced-motion: Moment content present, no animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await withSafeClock(page);
  await completeOnboarding(page);

  await page.getByRole('button', { name: 'Complete CAREER' }).click();
  await page.getByRole('button', { name: 'Complete DSA' }).click();
  await page.getByRole('button', { name: 'Complete BUILD' }).click();

  // With reduced motion, content is present at its final state
  // immediately — no need to wait out the 700ms phased reveal.
  await expect(MOMENT(page)).toBeVisible();
  await expect(page.getByText('01 → 02')).toBeVisible();
  await expect(page.getByText('tap anywhere')).toBeVisible();
});
