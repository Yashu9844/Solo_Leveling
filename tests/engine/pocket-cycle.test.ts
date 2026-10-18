import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/db';
import { realDeps } from '../../src/store/deps';
import type { EngineDeps } from '../../src/engine/types';
import { cycleBounds, needsCycleCheckIn } from '../../src/engine/treasury';
import {
  createTreasury,
  setDaySpending,
  getCycleCheckIn,
  startNewCycle,
  getTreasurySummary,
  getActiveTreasury,
  TreasuryEntryError,
} from '../../src/store/treasury';

/**
 * GOLDEN TESTS — the pocket is re-counted on the 5th of every month.
 *
 * Cycles run from the 5th to the 4th. Dates and money below are worked out
 * by hand and written as literals. ₹ figures are paise (₹3,000 = 300,000).
 */

describe('cycleBounds — 5th to 4th', () => {
  it.each([
    ['2026-10-05', '2026-10-05', '2026-11-04'], // the 5th itself starts a cycle
    ['2026-10-19', '2026-10-05', '2026-11-04'],
    ['2026-11-04', '2026-10-05', '2026-11-04'], // the 4th is the last day
    ['2026-11-05', '2026-11-05', '2026-12-04'], // the next 5th rolls over
    ['2026-10-04', '2026-09-05', '2026-10-04'], // before the 5th: still last month's
    ['2026-10-01', '2026-09-05', '2026-10-04'],
    ['2027-01-03', '2026-12-05', '2027-01-04'], // across the new year
    ['2026-12-05', '2026-12-05', '2027-01-04'],
    ['2027-01-04', '2026-12-05', '2027-01-04'],
    ['2027-02-10', '2027-02-05', '2027-03-04'], // February is short, the 5th is not
    ['2028-02-20', '2028-02-05', '2028-03-04'], // leap year
  ])('%s falls in %s to %s', (today, start, end) => {
    expect(cycleBounds(today)).toEqual({ start, end });
  });
});

describe('needsCycleCheckIn', () => {
  it('never asks before any treasury exists (that is ordinary set-up)', () => {
    expect(needsCycleCheckIn('2026-10-19', false, null)).toBe(false);
  });
  it('asks when the only treasury has ended', () => {
    expect(needsCycleCheckIn('2026-10-19', true, null)).toBe(true);
  });
  it('asks when the active treasury started in an earlier cycle', () => {
    expect(needsCycleCheckIn('2026-10-05', true, '2026-09-05')).toBe(true);
    expect(needsCycleCheckIn('2026-10-19', true, '2026-09-01')).toBe(true);
  });
  it('does not ask when the active treasury began inside this cycle', () => {
    expect(needsCycleCheckIn('2026-10-19', true, '2026-10-05')).toBe(false);
    expect(needsCycleCheckIn('2026-10-19', true, '2026-10-12')).toBe(false);
  });
  it('does not ask on the 4th for a treasury begun on the previous 5th', () => {
    expect(needsCycleCheckIn('2026-10-04', true, '2026-09-05')).toBe(false);
  });
});

const at = (iso: string): EngineDeps => ({ now: () => iso, newId: realDeps.newId });
// 10:00 IST on a given date
const ist10 = (isoDate: string) => at(`${isoDate}T04:30:00Z`);

async function wipe() {
  await db.treasury.clear();
  await db.treasury_source.clear();
  await db.daily_spending.clear();
  await db.event.clear();
  await db.profile.clear();
}

async function septemberCycle(opening = 300000): Promise<string> {
  return createTreasury(
    {
      periodStartDate: '2026-09-05',
      periodEndDate: '2026-10-04',
      currency: 'INR',
      sources: [{ name: 'Pocket', amountMinor: opening, protected: false }],
    },
    ist10('2026-09-05')
  );
}

describe('the monthly pocket check-in', () => {
  beforeEach(wipe);

  it('does not ask when no treasury has ever been set up', async () => {
    expect(await getCycleCheckIn('2026-10-05T04:30:00Z')).toBeNull();
  });

  it('does not ask while the current cycle is the one the treasury began in', async () => {
    await septemberCycle();
    expect(await getCycleCheckIn('2026-09-20T04:30:00Z')).toBeNull();
    expect(await getCycleCheckIn('2026-10-04T04:30:00Z')).toBeNull(); // last day of the cycle
  });

  it('asks on the 5th, naming the new cycle', async () => {
    await septemberCycle();
    const c = await getCycleCheckIn('2026-10-05T04:30:00Z');
    expect(c).not.toBeNull();
    expect(c?.cycleStart).toBe('2026-10-05');
    expect(c?.cycleEnd).toBe('2026-11-04');
  });

  it('suggests what was left of the previous cycle', async () => {
    const id = await septemberCycle(300000); // ₹3,000
    await setDaySpending(id, '2026-09-05', 20000, undefined, ist10('2026-09-05')); // ₹200
    await setDaySpending(id, '2026-09-06', 30000, undefined, ist10('2026-09-06')); // ₹300
    const c = await getCycleCheckIn('2026-10-05T04:30:00Z');
    expect(c?.suggestedMinor).toBe(250000); // 3,000 - 200 - 300 = 2,500
  });

  it('suggests zero, never a negative, after an overspent cycle', async () => {
    const id = await septemberCycle(100000);
    await setDaySpending(id, '2026-09-05', 150000, undefined, ist10('2026-09-05'));
    expect((await getCycleCheckIn('2026-10-05T04:30:00Z'))?.suggestedMinor).toBe(0);
  });

  it('keeps asking until it is answered, on any day after the 5th', async () => {
    await septemberCycle();
    expect(await getCycleCheckIn('2026-10-12T04:30:00Z')).not.toBeNull();
    expect(await getCycleCheckIn('2026-10-30T04:30:00Z')).not.toBeNull();
  });

  it('also asks when the old period ended before the 5th', async () => {
    await createTreasury(
      {
        periodStartDate: '2026-09-01',
        periodEndDate: '2026-09-30',
        currency: 'INR',
        sources: [{ name: 'Bank', amountMinor: 380000, protected: false }],
      },
      ist10('2026-09-01')
    );
    await getTreasurySummary('2026-10-02T04:30:00Z'); // first look after the end concludes it
    expect(await getActiveTreasury()).toBeNull();
    expect(await getCycleCheckIn('2026-10-02T04:30:00Z')).not.toBeNull();
  });
});

describe('startNewCycle', () => {
  beforeEach(wipe);

  it('starts deducting from the pocket the Player says they hold', async () => {
    await septemberCycle();
    await startNewCycle(318000, ist10('2026-10-05')); // ₹3,180
    const s = await getTreasurySummary('2026-10-05T04:30:00Z');
    expect(s.treasury?.period_start_date).toBe('2026-10-05');
    expect(s.treasury?.period_end_date).toBe('2026-11-04');
    expect(s.spendableMinor).toBe(318000);
    expect(s.remainingDays).toBe(31); // 5 Oct .. 4 Nov inclusive
    expect(s.allowanceMinor).toBe(10258); // floor(318000 / 31)
  });

  it('an answer given late starts from today, not from the 5th', async () => {
    await septemberCycle();
    await startNewCycle(318000, ist10('2026-10-19'));
    const s = await getTreasurySummary('2026-10-19T04:30:00Z');
    expect(s.treasury?.period_start_date).toBe('2026-10-19');
    expect(s.treasury?.period_end_date).toBe('2026-11-04');
    expect(s.remainingDays).toBe(17); // 19 Oct .. 4 Nov
    expect(s.allowanceMinor).toBe(18705); // floor(318000 / 17)
    expect(s.unaccounted).toEqual([]); // no backlog of days before today
  });

  it('the pocket figure replaces the old arithmetic rather than adding to it', async () => {
    const id = await septemberCycle(300000);
    await setDaySpending(id, '2026-09-05', 50000, undefined, ist10('2026-09-05'));
    // The old books say ₹2,500 is left, but the Player counts ₹2,000.
    await startNewCycle(200000, ist10('2026-10-05'));
    expect((await getTreasurySummary('2026-10-05T04:30:00Z')).spendableMinor).toBe(200000);
  });

  it('concludes the previous period with its verdict instead of dropping it', async () => {
    const id = await septemberCycle(300000);
    await setDaySpending(id, '2026-09-05', 20000, undefined, ist10('2026-09-05'));
    await startNewCycle(318000, ist10('2026-10-05'));

    const old = await db.treasury.get(id);
    expect(old?.status).toBe('concluded');
    expect(old?.concluded_verdict).toBe('SURVIVED');

    const concluded = await db.event.where('type').equals('TREASURY_PERIOD_CONCLUDED').toArray();
    expect(concluded).toHaveLength(1);
    expect(concluded[0]?.payload).toMatchObject({ treasuryId: id, finalSpendableMinor: 280000 });
  });

  it('marks an overspent previous cycle EXHAUSTED', async () => {
    const id = await septemberCycle(100000);
    await setDaySpending(id, '2026-09-05', 150000, undefined, ist10('2026-09-05'));
    await startNewCycle(200000, ist10('2026-10-05'));
    expect((await db.treasury.get(id))?.concluded_verdict).toBe('EXHAUSTED');
  });

  it('leaves exactly one active treasury, the new one', async () => {
    const oldId = await septemberCycle();
    const newId = await startNewCycle(318000, ist10('2026-10-05'));
    const all = await db.treasury.toArray();
    expect(all).toHaveLength(2);
    expect(all.filter((t) => t.status === 'active').map((t) => t.id)).toEqual([newId]);
    expect(newId).not.toBe(oldId);
  });

  it('stops asking once answered', async () => {
    await septemberCycle();
    await startNewCycle(318000, ist10('2026-10-05'));
    expect(await getCycleCheckIn('2026-10-05T04:30:00Z')).toBeNull();
    expect(await getCycleCheckIn('2026-10-30T04:30:00Z')).toBeNull();
  });

  it('asks again on the next 5th', async () => {
    await septemberCycle();
    await startNewCycle(318000, ist10('2026-10-05'));
    const c = await getCycleCheckIn('2026-11-05T04:30:00Z');
    expect(c?.cycleStart).toBe('2026-11-05');
    expect(c?.cycleEnd).toBe('2026-12-04');
  });

  it('accepts a pocket of zero', async () => {
    await septemberCycle();
    await startNewCycle(0, ist10('2026-10-05'));
    expect((await getTreasurySummary('2026-10-05T04:30:00Z')).spendableMinor).toBe(0);
  });

  it('rejects a negative, fractional-paise, NaN or infinite pocket and changes nothing', async () => {
    const id = await septemberCycle();
    for (const bad of [-1, -318000, 1.5, NaN, Infinity]) {
      await expect(startNewCycle(bad, ist10('2026-10-05'))).rejects.toThrow(TreasuryEntryError);
    }
    expect((await db.treasury.get(id))?.status).toBe('active');
    expect(await db.treasury.count()).toBe(1);
  });

  it('the new cycle accepts spending straight away, on any day, at any hour', async () => {
    await septemberCycle();
    const newId = await startNewCycle(318000, ist10('2026-10-05'));
    expect(await setDaySpending(newId, '2026-10-05', 12000, undefined, ist10('2026-10-05'))).toBe('registered');
    const s = await getTreasurySummary('2026-10-06T04:30:00Z');
    expect(s.spendableMinor).toBe(306000); // 3,180 - 120
    expect(s.remainingDays).toBe(30);
    expect(s.allowanceMinor).toBe(10200); // 306000 / 30
  });
});

describe('a treasury set up this cycle is not asked about again', () => {
  beforeEach(wipe);

  it('even when its period was entered as starting before the 5th', async () => {
    // Set up on 10 Oct, with a period the Player typed as starting 1 Oct.
    await createTreasury(
      {
        periodStartDate: '2026-10-01',
        periodEndDate: '2026-11-04',
        currency: 'INR',
        sources: [{ name: 'Pocket', amountMinor: 300000, protected: false }],
      },
      ist10('2026-10-10')
    );
    expect(await getCycleCheckIn('2026-10-10T04:30:00Z')).toBeNull();
    expect(await getCycleCheckIn('2026-10-30T04:30:00Z')).toBeNull();
  });

  it('but is asked again on the next 5th', async () => {
    await createTreasury(
      {
        periodStartDate: '2026-10-01',
        periodEndDate: '2026-11-04',
        currency: 'INR',
        sources: [{ name: 'Pocket', amountMinor: 300000, protected: false }],
      },
      ist10('2026-10-10')
    );
    expect(await getCycleCheckIn('2026-11-05T04:30:00Z')).not.toBeNull();
  });
});
