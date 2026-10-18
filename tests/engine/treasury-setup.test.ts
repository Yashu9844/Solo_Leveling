import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/db';
import { DEFAULT_CONFIG } from '../../src/engine/config';
import { realDeps } from '../../src/store/deps';
import { getAllEvents } from '../../src/db/events';
import { buildDomainTables } from '../../src/db/domainProjections';
import type { EngineDeps } from '../../src/engine/types';
import {
  createTreasury,
  setDaySpending,
  getTreasurySummary,
  getTreasuryLedger,
  TreasuryEntryError,
} from '../../src/store/treasury';

/**
 * GOLDEN TESTS — setting up a treasury for the first time.
 *
 * The bug: set up with ₹2,000 at 01:29 on 19 Oct and the card showed
 * ₹0 spendable. The System's day runs 04:00-04:00, so at 01:29 it is
 * still 18 Oct; the sheet used the phone's calendar date (19 Oct) as
 * the start, and the opening money only counted from the 19th.
 *
 * Every figure is worked out by hand (paise; ₹2,000 = 200,000):
 *   allowance = floor(spendable / days left), days left inclusive.
 */

const at = (iso: string): EngineDeps => ({ now: () => iso, newId: realDeps.newId });
const POCKET = [{ name: 'Pocket', amountMinor: 200000, protected: false }];

/** 01:29 IST on 19 Oct — the System's day is still 18 Oct. */
const AFTER_MIDNIGHT = '2026-10-18T19:59:00Z';
/** 10:00 IST on 19 Oct. */
const MORNING_19 = '2026-10-19T04:30:00Z';

beforeEach(async () => {
  await Promise.all([
    db.treasury.clear(),
    db.treasury_source.clear(),
    db.daily_spending.clear(),
    db.event.clear(),
    db.profile.clear(),
  ]);
});

describe('first set-up', () => {
  it('the money is there at once, set up in the afternoon', async () => {
    await createTreasury({ periodStartDate: '2026-10-19', periodEndDate: '2026-11-04', sources: POCKET }, at(MORNING_19));
    const s = await getTreasurySummary(MORNING_19);
    expect(s.spendableMinor).toBe(200000);
    expect(s.remainingDays).toBe(17); // 19 Oct .. 4 Nov
    expect(s.allowanceMinor).toBe(11764); // floor(200000 / 17)
  });

  it('the money is there at once, set up after midnight on the System day', async () => {
    // What the sheet now sends at 01:29: the System's day, 18 Oct.
    await createTreasury({ periodStartDate: '2026-10-18', periodEndDate: '2026-11-04', sources: POCKET }, at(AFTER_MIDNIGHT));
    const s = await getTreasurySummary(AFTER_MIDNIGHT);
    expect(s.todayLocalDate).toBe('2026-10-18');
    expect(s.spendableMinor).toBe(200000);
    expect(s.remainingDays).toBe(18);
    expect(s.allowanceMinor).toBe(11111); // floor(200000 / 18)
  });

  it('refuses a period that starts after today', async () => {
    await expect(
      createTreasury({ periodStartDate: '2026-10-19', periodEndDate: '2026-11-04', sources: POCKET }, at(AFTER_MIDNIGHT))
    ).rejects.toBeInstanceOf(TreasuryEntryError);
    expect(await db.treasury.count()).toBe(0);
    expect(await db.event.count()).toBe(0);
  });

  it('refuses an end before the start, no sources, a blank name or a bad amount', async () => {
    const bad = [
      { periodStartDate: '2026-10-19', periodEndDate: '2026-10-18', sources: POCKET },
      { periodStartDate: '2026-10-19', periodEndDate: '2026-11-04', sources: [] },
      { periodStartDate: '2026-10-19', periodEndDate: '2026-11-04', sources: [{ name: ' ', amountMinor: 1, protected: false }] },
      { periodStartDate: '2026-10-19', periodEndDate: '2026-11-04', sources: [{ name: 'P', amountMinor: -1, protected: false }] },
      { periodStartDate: '2026-10-19', periodEndDate: '2026-11-04', sources: [{ name: 'P', amountMinor: 1.5, protected: false }] },
    ];
    for (const params of bad) {
      await expect(createTreasury(params, at(MORNING_19))).rejects.toBeInstanceOf(TreasuryEntryError);
    }
    expect(await db.treasury.count()).toBe(0);
  });
});

describe('a treasury already saved with the bad start', () => {
  // Written straight to the tables, exactly as the old sheet left it on
  // the Player's phone: set up 01:29 IST 19 Oct, period from 19 Oct.
  async function seedBroken(): Promise<string> {
    await db.treasury.put({
      id: 't-old',
      currency: 'INR',
      period_start_date: '2026-10-19',
      period_end_date: '2026-11-04',
      accounting_open_hour: 22,
      status: 'active',
      created_at: AFTER_MIDNIGHT,
    });
    await db.treasury_source.put({
      id: 't-old-src-0',
      treasury_id: 't-old',
      name: 'Pocket',
      amount_minor: 200000,
      protected: false,
      active: true,
      created_at: '2026-10-19T00:00:00.000Z',
    });
    return 't-old';
  }

  it('shows the ₹2,000 on the night it was set up', async () => {
    await seedBroken();
    const s = await getTreasurySummary(AFTER_MIDNIGHT);
    expect(s.spendableMinor).toBe(200000);
    expect(s.remainingDays).toBe(18);
    expect(s.allowanceMinor).toBe(11111);
  });

  it('the 18th can be entered and comes off the ₹2,000', async () => {
    const id = await seedBroken();
    await setDaySpending(id, '2026-10-18', 30000, undefined, at(AFTER_MIDNIGHT));
    const s = await getTreasurySummary(MORNING_19);
    expect(s.spendableMinor).toBe(170000); // 200000 - 30000
    expect(s.remainingDays).toBe(17);
    expect(s.allowanceMinor).toBe(10000); // floor(170000 / 17)
  });

  it('the history starts on the 18th', async () => {
    await seedBroken();
    const ledger = await getTreasuryLedger('2026-10-19');
    expect(ledger[0]?.localDate).toBe('2026-10-18');
    expect(ledger[0]?.spendableMinor).toBe(200000);
  });
});

describe('setting up again over days already entered', () => {
  it('a day entered under the old treasury is entered afresh under the new one', async () => {
    const first = await createTreasury(
      { periodStartDate: '2026-10-19', periodEndDate: '2026-11-04', sources: POCKET },
      at(MORNING_19)
    );
    await setDaySpending(first, '2026-10-19', 50000, undefined, at(MORNING_19));

    // Same day, the Player starts over with ₹2,000.
    const second = await createTreasury(
      { periodStartDate: '2026-10-19', periodEndDate: '2026-11-04', sources: POCKET },
      at('2026-10-19T05:00:00Z')
    );
    expect(await db.treasury.where('status').equals('active').count()).toBe(1);

    // Before the fix this was a silent no-op: the 19th's row belonged to
    // the first treasury, so the new card never saw it.
    expect(await setDaySpending(second, '2026-10-19', 20000, undefined, at('2026-10-19T05:01:00Z'))).toBe('registered');
    const s = await getTreasurySummary('2026-10-20T04:30:00Z');
    expect(s.treasury?.id).toBe(second);
    expect(s.spendableMinor).toBe(180000); // 200000 - 20000
    expect(s.entries).toEqual([{ localDate: '2026-10-19', amountMinor: 20000 }]);
  });

  it('rebuilding from the log gives the same single active treasury and figures', async () => {
    const first = await createTreasury(
      { periodStartDate: '2026-10-19', periodEndDate: '2026-11-04', sources: POCKET },
      at(MORNING_19)
    );
    await setDaySpending(first, '2026-10-19', 50000, undefined, at(MORNING_19));
    const second = await createTreasury(
      { periodStartDate: '2026-10-19', periodEndDate: '2026-11-04', sources: POCKET },
      at('2026-10-19T05:00:00Z')
    );
    await setDaySpending(second, '2026-10-19', 20000, undefined, at('2026-10-19T05:01:00Z'));
    await setDaySpending(second, '2026-10-19', 25000, undefined, at('2026-10-19T05:02:00Z'));

    const before = await getTreasurySummary('2026-10-20T04:30:00Z');
    const tables = buildDomainTables(await getAllEvents(), DEFAULT_CONFIG);
    await Promise.all([db.treasury.clear(), db.treasury_source.clear(), db.daily_spending.clear()]);
    await db.treasury.bulkPut(tables.treasuries);
    await db.treasury_source.bulkPut(tables.treasurySources);
    await db.daily_spending.bulkPut(tables.dailySpendings);
    const after = await getTreasurySummary('2026-10-20T04:30:00Z');

    expect(tables.treasuries.filter((t) => t.status === 'active').map((t) => t.id)).toEqual([second]);
    expect(after.spendableMinor).toBe(175000); // 200000 - 25000
    expect(after.spendableMinor).toBe(before.spendableMinor);
    expect(after.entries).toEqual(before.entries);
  });
});
