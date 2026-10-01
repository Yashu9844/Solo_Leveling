import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/db';
import {
  createTreasury,
  addSource,
  withdrawSource,
  registerSpending,
  correctSpending,
  getActiveTreasury,
  getTreasurySummary,
  getTreasuryRealityMetrics,
} from '../../src/store/treasury';

describe('Treasury Store Integration Tests (P3)', () => {
  beforeEach(async () => {
    await db.treasury.clear();
    await db.treasury_source.clear();
    await db.daily_spending.clear();
    await db.event.clear();
  });

  it('creates a treasury and initial sources', async () => {
    const id = await createTreasury({
      periodStartDate: '2026-09-01',
      periodEndDate: '2026-09-30',
      currency: 'INR',
      sources: [
        { name: 'Bank Account', amountMinor: 380000, protected: false },
        { name: 'Emergency Reserve', amountMinor: 100000, protected: true },
      ],
    });

    const active = await getActiveTreasury();
    expect(active).not.toBeNull();
    expect(active?.id).toBe(id);
    expect(active?.currency).toBe('INR');
    expect(active?.period_start_date).toBe('2026-09-01');

    const sources = await db.treasury_source.where('treasury_id').equals(id).toArray();
    expect(sources).toHaveLength(2);
    expect(sources.find((s) => s.name === 'Bank Account')?.amount_minor).toBe(380000);
    expect(sources.find((s) => s.name === 'Emergency Reserve')?.protected).toBe(true);

    const events = await db.event.where('type').equals('TREASURY_CREATED').toArray();
    expect(events).toHaveLength(1);
  });

  it('registers daily spending and updates Dexie row with history', async () => {
    const id = await createTreasury({
      periodStartDate: '2026-09-01',
      periodEndDate: '2026-09-30',
      sources: [{ name: 'Bank', amountMinor: 380000, protected: false }],
    });

    await registerSpending(id, 3000, '2026-09-01');

    const row = await db.daily_spending.get('2026-09-01');
    expect(row).not.toBeUndefined();
    expect(row?.amount_minor).toBe(3000);
    expect(row?.corrected).toBe(false);
    expect(row?.history).toHaveLength(1);
    expect(row?.history[0].amount_minor).toBe(3000);

    const events = await db.event.where('type').equals('DAILY_SPENDING_REGISTERED').toArray();
    expect(events).toHaveLength(1);
  });

  it('handles spending correction cleanly preserving history', async () => {
    const id = await createTreasury({
      periodStartDate: '2026-09-01',
      periodEndDate: '2026-09-30',
      sources: [{ name: 'Bank', amountMinor: 380000, protected: false }],
    });

    await registerSpending(id, 8000, '2026-09-01');
    await correctSpending(id, '2026-09-01', 9000, 'Forgot coffee');

    const row = await db.daily_spending.get('2026-09-01');
    expect(row?.amount_minor).toBe(9000);
    expect(row?.corrected).toBe(true);
    expect(row?.history).toHaveLength(2);
    expect(row?.history[0].amount_minor).toBe(8000);
    expect(row?.history[1].amount_minor).toBe(9000);
    expect(row?.history[1].reason).toBe('Forgot coffee');

    const correctEvents = await db.event.where('type').equals('DAILY_SPENDING_CORRECTED').toArray();
    expect(correctEvents).toHaveLength(1);
  });

  it('adds and withdraws sources mid-period', async () => {
    const id = await createTreasury({
      periodStartDate: '2026-09-01',
      periodEndDate: '2026-09-30',
      sources: [{ name: 'Bank', amountMinor: 100000, protected: false }],
    });

    const newSrcId = await addSource(id, { name: 'Gift', amountMinor: 50000, protected: false }, '2026-09-02');
    const sources = await db.treasury_source.where('treasury_id').equals(id).toArray();
    expect(sources).toHaveLength(2);

    await withdrawSource(id, newSrcId, 'Spent on laptop');
    const withdrawnSrc = await db.treasury_source.get(newSrcId);
    expect(withdrawnSrc?.active).toBe(false);
    expect(withdrawnSrc?.withdrawn_at).toBeDefined();
  });

  it('computes summary and REALITY metrics', async () => {
    const id = await createTreasury({
      periodStartDate: '2026-09-01',
      periodEndDate: '2026-09-30',
      sources: [{ name: 'Bank', amountMinor: 380000, protected: false }],
    });

    await registerSpending(id, 3000, '2026-09-01');

    const summary = await getTreasurySummary();
    expect(summary.treasury).not.toBeNull();
    expect(summary.spendableMinor).toBeGreaterThan(0);

    const metrics = await getTreasuryRealityMetrics();
    expect(metrics).not.toBeNull();
    expect(metrics?.initialSpendableMinor).toBe(380000);
    expect(metrics?.spentPeriodMinor).toBe(3000);
    expect(metrics?.daysUnderAllowance).toBe(1);
  });
});
