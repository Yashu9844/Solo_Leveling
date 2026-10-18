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
  registerSpending,
  correctSpending,
  setDaySpending,
  getTreasurySummary,
  getTreasuryLedger,
  withdrawSource,
  addSource,
  TreasuryEntryError,
} from '../../src/store/treasury';

/**
 * GOLDEN TESTS — spending can be entered or changed at any hour, for any
 * day of the period.
 *
 * Every figure below is worked out by hand from the spec's formula:
 *   allowance(t) = floor(spendable(t) / remainingDays(t))
 *   spendable(t) = opening money - every entry dated before t
 * and written down as a literal, never recomputed by the code under test.
 *
 * Money is paise throughout: ₹3,800 = 380,000.
 *
 * Clock reference (IST = UTC+5:30, day boundary 04:00, so 02:00 IST still
 * belongs to the PREVIOUS local date):
 *   2026-09-10T04:30:00Z = 10:00 IST on the 10th
 */

const at = (iso: string): EngineDeps => ({ now: () => iso, newId: realDeps.newId });

/** 10:00 IST on a given September day — the middle of the morning, when the
 * old 22:00-03:00 window would have refused everything. */
const morning = (day: number) => at(`2026-09-${String(day).padStart(2, '0')}T04:30:00Z`);

async function setup(opening = 380000, start = '2026-09-01', end = '2026-09-30', setUpOn = morning(1)): Promise<string> {
  return createTreasury(
    {
      periodStartDate: start,
      periodEndDate: end,
      currency: 'INR',
      sources: [{ name: 'Bank', amountMinor: opening, protected: false }],
    },
    setUpOn
  );
}

describe('Treasury entry — any hour, any day', () => {
  beforeEach(async () => {
    await db.treasury.clear();
    await db.treasury_source.clear();
    await db.daily_spending.clear();
    await db.event.clear();
    await db.profile.clear();
  });

  // ── 1. No time restriction ────────────────────────────────────────────
  describe('there is no time window', () => {
    it('accepts an entry at every hour of the day, 00:00 through 23:59 IST', async () => {
      // 2026-09-10 00:00 IST is 2026-09-09T18:30:00Z. 04:00 IST is the day
      // boundary, so the first four hours belong to the 9th; both dates are
      // inside the period, so what is being proven is only "never refused".
      for (let h = 0; h < 24; h++) {
        await db.daily_spending.clear();
        await db.event.where('type').equals('DAILY_SPENDING_REGISTERED').delete();
        const id = await db.treasury.toCollection().first().then((t) => t?.id ?? setup());
        const iso = new Date(Date.UTC(2026, 8, 9, 18, 30) + h * 3600_000).toISOString();
        const summary = await getTreasurySummary(iso);
        const result = await setDaySpending(id, summary.todayLocalDate, 5000, undefined, at(iso));
        expect(result).toBe('registered');
      }
    });

    it('accepts an entry at 10:00 IST, the middle of the morning (was locked)', async () => {
      const id = await setup();
      expect(await setDaySpending(id, '2026-09-10', 3000, undefined, morning(10))).toBe('registered');
      expect((await db.daily_spending.get('2026-09-10'))?.amount_minor).toBe(3000);
    });

    it('accepts an entry at 03:30 IST, inside the old day-close window (was locked)', async () => {
      const id = await setup();
      // 03:30 IST on the 11th = 22:00Z on the 10th. Before the 04:00
      // boundary, so the local date is still the 10th.
      const iso = '2026-09-10T22:00:00Z';
      const summary = await getTreasurySummary(iso);
      expect(summary.todayLocalDate).toBe('2026-09-10');
      expect(await setDaySpending(id, '2026-09-10', 3000, undefined, at(iso))).toBe('registered');
    });

    it('does not expose any lock state on the summary', async () => {
      await setup();
      const summary = await getTreasurySummary('2026-09-10T04:30:00Z');
      expect('isAccountingOpen' in summary).toBe(false);
      expect(summary.statusResult.status).not.toBe('LOCKED');
    });
  });

  // ── 2. Going back to earlier days ─────────────────────────────────────
  describe('past days', () => {
    it('can register yesterday, which was never entered', async () => {
      const id = await setup();
      expect(await setDaySpending(id, '2026-09-09', 12000, undefined, morning(10))).toBe('registered');
      expect((await db.daily_spending.get('2026-09-09'))?.amount_minor).toBe(12000);
    });

    it('can register a day several weeks back', async () => {
      const id = await setup();
      expect(await setDaySpending(id, '2026-09-02', 4500, undefined, morning(25))).toBe('registered');
    });

    it('can register the very first day of the period', async () => {
      const id = await setup();
      expect(await setDaySpending(id, '2026-09-01', 4500, undefined, morning(15))).toBe('registered');
    });

    it('lists exactly the past days that have no entry, oldest first, never today', async () => {
      const id = await setup();
      await setDaySpending(id, '2026-09-02', 1000, undefined, morning(5));
      await setDaySpending(id, '2026-09-04', 1000, undefined, morning(5));
      const s = await getTreasurySummary('2026-09-05T04:30:00Z');
      expect(s.unaccounted).toEqual(['2026-09-01', '2026-09-03']);
    });

    it('stops listing a day once it is filled in', async () => {
      const id = await setup();
      let s = await getTreasurySummary('2026-09-04T04:30:00Z');
      expect(s.unaccounted).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
      await setDaySpending(id, '2026-09-02', 1000, undefined, morning(4));
      s = await getTreasurySummary('2026-09-04T04:30:00Z');
      expect(s.unaccounted).toEqual(['2026-09-01', '2026-09-03']);
    });
  });

  // ── 3. Editing: increase and decrease ─────────────────────────────────
  describe('editing a day already entered', () => {
    it('can be raised, keeping the old figure in history', async () => {
      const id = await setup();
      await setDaySpending(id, '2026-09-09', 10000, undefined, morning(9));
      expect(await setDaySpending(id, '2026-09-09', 25000, undefined, morning(10))).toBe('corrected');
      const row = await db.daily_spending.get('2026-09-09');
      expect(row?.amount_minor).toBe(25000);
      expect(row?.corrected).toBe(true);
      expect(row?.history.map((h) => h.amount_minor)).toEqual([10000, 25000]);
    });

    it('can be lowered, keeping the old figure in history', async () => {
      const id = await setup();
      await setDaySpending(id, '2026-09-09', 25000, undefined, morning(9));
      expect(await setDaySpending(id, '2026-09-09', 10000, undefined, morning(10))).toBe('corrected');
      const row = await db.daily_spending.get('2026-09-09');
      expect(row?.amount_minor).toBe(10000);
      expect(row?.history.map((h) => h.amount_minor)).toEqual([25000, 10000]);
    });

    it('can be set back to zero', async () => {
      const id = await setup();
      await setDaySpending(id, '2026-09-09', 25000, undefined, morning(9));
      expect(await setDaySpending(id, '2026-09-09', 0, undefined, morning(10))).toBe('corrected');
      expect((await db.daily_spending.get('2026-09-09'))?.amount_minor).toBe(0);
    });

    it('can be changed many times, every figure kept in order', async () => {
      const id = await setup();
      for (const [i, amt] of [1000, 2000, 500, 3000, 100].entries()) {
        await setDaySpending(id, '2026-09-09', amt, undefined, morning(9 + (i % 2)));
      }
      const row = await db.daily_spending.get('2026-09-09');
      expect(row?.amount_minor).toBe(100);
      expect(row?.history.map((h) => h.amount_minor)).toEqual([1000, 2000, 500, 3000, 100]);
    });

    it('entering the same figure again changes nothing and writes nothing', async () => {
      const id = await setup();
      await setDaySpending(id, '2026-09-09', 10000, undefined, morning(9));
      const before = (await getAllEvents()).length;
      expect(await setDaySpending(id, '2026-09-09', 10000, undefined, morning(10))).toBe('unchanged');
      expect((await getAllEvents()).length).toBe(before);
      expect((await db.daily_spending.get('2026-09-09'))?.corrected).toBe(false);
    });

    it('works on today as well as on a past day', async () => {
      const id = await setup();
      await setDaySpending(id, '2026-09-10', 4000, undefined, morning(10));
      expect(await setDaySpending(id, '2026-09-10', 6000, undefined, morning(10))).toBe('corrected');
      expect((await db.daily_spending.get('2026-09-10'))?.amount_minor).toBe(6000);
    });
  });

  // ── 4. The numbers move correctly (hand-worked golden figures) ────────
  describe('golden figures', () => {
    it("spec example 1: spend ₹30 on day 1 -> 3,770 / 29 = ₹130.00", async () => {
      const id = await setup(380000);
      await setDaySpending(id, '2026-09-01', 3000, undefined, morning(1));
      const s = await getTreasurySummary('2026-09-02T04:30:00Z');
      expect(s.spendableMinor).toBe(377000);
      expect(s.remainingDays).toBe(29);
      expect(s.allowanceMinor).toBe(13000);
    });

    it("spec example 2: spend ₹150 on day 1 -> 3,650 / 29 = ₹125.86", async () => {
      const id = await setup(380000);
      await setDaySpending(id, '2026-09-01', 15000, undefined, morning(1));
      const s = await getTreasurySummary('2026-09-02T04:30:00Z');
      expect(s.spendableMinor).toBe(365000);
      expect(s.allowanceMinor).toBe(12586); // floor(365000 / 29) = 12586
    });

    it('filling in four forgotten days at once, then viewing day 5', async () => {
      const id = await setup(380000);
      // Entered all together on the 5th: 30 + 150 + 0 + 200 = 380 spent.
      await setDaySpending(id, '2026-09-01', 3000, undefined, morning(5));
      await setDaySpending(id, '2026-09-02', 15000, undefined, morning(5));
      await setDaySpending(id, '2026-09-03', 0, undefined, morning(5));
      await setDaySpending(id, '2026-09-04', 20000, undefined, morning(5));
      const s = await getTreasurySummary('2026-09-05T04:30:00Z');
      expect(s.spendableMinor).toBe(342000); // 3,420.00
      expect(s.remainingDays).toBe(26); // 5th..30th inclusive
      expect(s.allowanceMinor).toBe(13153); // floor(342000 / 26)
      expect(s.unaccounted).toEqual([]);
    });

    it('LOWERING an old day raises today\'s allowance', async () => {
      const id = await setup(380000);
      await setDaySpending(id, '2026-09-01', 3000, undefined, morning(5));
      await setDaySpending(id, '2026-09-02', 15000, undefined, morning(5));
      await setDaySpending(id, '2026-09-03', 0, undefined, morning(5));
      await setDaySpending(id, '2026-09-04', 20000, undefined, morning(5));
      // Day 2 was really ₹50, not ₹150.
      await setDaySpending(id, '2026-09-02', 5000, undefined, morning(5));
      const s = await getTreasurySummary('2026-09-05T04:30:00Z');
      expect(s.spendableMinor).toBe(352000); // 3,520.00
      expect(s.allowanceMinor).toBe(13538); // floor(352000 / 26)
    });

    it('RAISING an old day lowers today\'s allowance', async () => {
      const id = await setup(380000);
      await setDaySpending(id, '2026-09-01', 3000, undefined, morning(5));
      await setDaySpending(id, '2026-09-02', 15000, undefined, morning(5));
      await setDaySpending(id, '2026-09-03', 0, undefined, morning(5));
      await setDaySpending(id, '2026-09-04', 20000, undefined, morning(5));
      // Day 2 was really ₹400.
      await setDaySpending(id, '2026-09-02', 40000, undefined, morning(5));
      const s = await getTreasurySummary('2026-09-05T04:30:00Z');
      expect(s.spendableMinor).toBe(317000); // 3,170.00
      expect(s.allowanceMinor).toBe(12192); // floor(317000 / 26)
    });

    it('overspending a past day below zero is allowed and shown, never refused', async () => {
      const id = await setup(380000);
      await setDaySpending(id, '2026-09-01', 500000, undefined, morning(2));
      const s = await getTreasurySummary('2026-09-02T04:30:00Z');
      expect(s.spendableMinor).toBe(-120000);
      expect(s.statusResult.status).toBe('CRITICAL');
    });

    it('rupees and paise survive exactly: ₹12.34 is 1,234 paise', async () => {
      const id = await setup();
      await setDaySpending(id, '2026-09-09', Math.round(12.34 * 100), undefined, morning(10));
      expect((await db.daily_spending.get('2026-09-09'))?.amount_minor).toBe(1234);
    });

    it('the ledger re-spreads every later day when an earlier day changes', async () => {
      const id = await setup(380000);
      await setDaySpending(id, '2026-09-01', 3000, undefined, morning(3));
      await setDaySpending(id, '2026-09-02', 3000, undefined, morning(3));
      let ledger = await getTreasuryLedger('2026-09-03');
      const day3Before = ledger.find((r) => r.localDate === '2026-09-03');
      expect(day3Before?.spendableMinor).toBe(374000);
      expect(day3Before?.allowanceMinor).toBe(13357); // floor(374000 / 28)

      await setDaySpending(id, '2026-09-01', 23000, undefined, morning(3));
      ledger = await getTreasuryLedger('2026-09-03');
      const day3After = ledger.find((r) => r.localDate === '2026-09-03');
      expect(day3After?.spendableMinor).toBe(354000);
      expect(day3After?.allowanceMinor).toBe(12642); // floor(354000 / 28)
    });

    it('setting up late still counts the opening money from day one of the period', async () => {
      // Treasury created on the 10th for a period that began on the 1st.
      const id = await createTreasury(
        {
          periodStartDate: '2026-09-01',
          periodEndDate: '2026-09-30',
          currency: 'INR',
          sources: [{ name: 'Bank', amountMinor: 380000, protected: false }],
        },
        morning(10)
      );
      await setDaySpending(id, '2026-09-03', 10000, undefined, morning(10));
      const ledger = await getTreasuryLedger('2026-09-10');
      expect(ledger.find((r) => r.localDate === '2026-09-01')?.spendableMinor).toBe(380000);
      expect(ledger.find((r) => r.localDate === '2026-09-04')?.spendableMinor).toBe(370000);
    });

    it('money added mid-period does not reach back into earlier days', async () => {
      const id = await setup(380000);
      await addSource(id, { name: 'Gift', amountMinor: 100000, protected: false }, '2026-09-05', morning(5));
      const ledger = await getTreasuryLedger('2026-09-06');
      expect(ledger.find((r) => r.localDate === '2026-09-04')?.spendableMinor).toBe(380000);
      expect(ledger.find((r) => r.localDate === '2026-09-05')?.spendableMinor).toBe(480000);
    });

    it('withdrawn money stops counting from the day it left', async () => {
      const id = await setup(380000);
      const srcId = (await db.treasury_source.where('treasury_id').equals(id).first())!.id;
      await withdrawSource(id, srcId, 'moved', morning(5));
      const s = await getTreasurySummary('2026-09-06T04:30:00Z');
      expect(s.spendableMinor).toBe(0);
    });
  });

  // ── 5. Boundaries ─────────────────────────────────────────────────────
  describe('what is still refused', () => {
    it('refuses tomorrow', async () => {
      const id = await setup();
      await expect(setDaySpending(id, '2026-09-11', 1000, undefined, morning(10))).rejects.toThrow(
        TreasuryEntryError
      );
      expect(await db.daily_spending.get('2026-09-11')).toBeUndefined();
    });

    it('treats 02:00 IST as still the previous day, so the date that has not begun is refused', async () => {
      const id = await setup();
      // 02:00 IST on the 11th = 20:30Z on the 10th: local date is the 10th.
      const iso = '2026-09-10T20:30:00Z';
      expect((await getTreasurySummary(iso)).todayLocalDate).toBe('2026-09-10');
      await expect(setDaySpending(id, '2026-09-11', 1000, undefined, at(iso))).rejects.toThrow(
        /once it has begun/
      );
      expect(await setDaySpending(id, '2026-09-10', 1000, undefined, at(iso))).toBe('registered');
    });

    it('refuses a day before the period started', async () => {
      const id = await setup(380000, '2026-09-05', '2026-09-30', morning(5));
      await expect(setDaySpending(id, '2026-09-04', 1000, undefined, morning(10))).rejects.toThrow(
        /outside the treasury period/
      );
    });

    it('refuses negative, fractional-paise, NaN and infinite amounts', async () => {
      const id = await setup();
      for (const bad of [-1, -5000, 1.5, 0.1, NaN, Infinity, -Infinity]) {
        await expect(setDaySpending(id, '2026-09-09', bad, undefined, morning(10))).rejects.toThrow(
          TreasuryEntryError
        );
      }
      expect(await db.daily_spending.get('2026-09-09')).toBeUndefined();
    });

    it('refuses an unknown treasury', async () => {
      await expect(setDaySpending('nope', '2026-09-09', 1000, undefined, morning(10))).rejects.toThrow(
        /No treasury/
      );
    });

    it('refuses to edit a concluded period', async () => {
      const id = await setup(380000, '2026-09-01', '2026-09-05');
      await getTreasurySummary('2026-09-08T04:30:00Z'); // first look after the end concludes it
      await expect(setDaySpending(id, '2026-09-03', 1000, undefined, morning(8))).rejects.toThrow(
        /concluded/
      );
    });

    it('a refused entry writes no event', async () => {
      const id = await setup();
      const before = (await getAllEvents()).length;
      await setDaySpending(id, '2026-09-11', 1000, undefined, morning(10)).catch(() => undefined);
      await setDaySpending(id, '2026-09-09', -1, undefined, morning(10)).catch(() => undefined);
      expect((await getAllEvents()).length).toBe(before);
    });
  });

  // ── 6. The event log is the truth ─────────────────────────────────────
  describe('event log integrity', () => {
    it('registering a day twice keeps one event and the first figure', async () => {
      const id = await setup();
      await registerSpending(id, 1000, '2026-09-09', morning(10));
      await registerSpending(id, 9999, '2026-09-09', morning(10));
      const events = await db.event.where('type').equals('DAILY_SPENDING_REGISTERED').toArray();
      expect(events).toHaveLength(1);
      expect((await db.daily_spending.get('2026-09-09'))?.amount_minor).toBe(1000);
    });

    it('a correction event records the figure it replaced', async () => {
      const id = await setup();
      await setDaySpending(id, '2026-09-09', 1000, undefined, morning(9));
      await setDaySpending(id, '2026-09-09', 4000, 'forgot dinner', morning(10));
      const ev = (await db.event.where('type').equals('DAILY_SPENDING_CORRECTED').toArray())[0];
      expect(ev?.payload).toMatchObject({ previousAmountMinor: 1000, newAmountMinor: 4000, reason: 'forgot dinner' });
    });

    it('rebuilding from the event log alone reproduces every row, edits included', async () => {
      const id = await setup();
      await setDaySpending(id, '2026-09-01', 3000, undefined, morning(6));
      await setDaySpending(id, '2026-09-03', 7000, undefined, morning(6));
      await setDaySpending(id, '2026-09-03', 9000, undefined, morning(7)); // raised
      await setDaySpending(id, '2026-09-01', 1000, undefined, morning(7)); // lowered
      await setDaySpending(id, '2026-09-05', 2500, undefined, morning(7));

      const live = (await db.daily_spending.toArray()).sort((a, b) => a.local_date.localeCompare(b.local_date));
      const rebuilt = buildDomainTables(await getAllEvents(), DEFAULT_CONFIG).dailySpendings.sort((a, b) =>
        a.local_date.localeCompare(b.local_date)
      );

      expect(rebuilt.map((r) => [r.local_date, r.amount_minor, r.corrected])).toEqual(
        live.map((r) => [r.local_date, r.amount_minor, r.corrected])
      );
      expect(rebuilt.map((r) => r.history.map((h) => h.amount_minor))).toEqual(
        live.map((r) => r.history.map((h) => h.amount_minor))
      );
    });

    it('a restore keeps a correction whose original registration is missing', async () => {
      const id = await setup();
      // What an earlier build wrote when a never-entered day was corrected.
      await correctSpending(id, '2026-09-09', 4200, 'legacy', morning(10));
      await db.daily_spending.clear();
      const rebuilt = buildDomainTables(await getAllEvents(), DEFAULT_CONFIG).dailySpendings;
      expect(rebuilt.find((r) => r.local_date === '2026-09-09')?.amount_minor).toBe(4200);
    });
  });
});
