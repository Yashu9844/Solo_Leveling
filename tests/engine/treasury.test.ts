import { describe, it, expect } from 'vitest';
import {
  isAccountingOpen,
  computeRemainingDays,
  computeSpendableMinor,
  computeAllowanceMinor,
  deriveTreasuryStatus,
  computeTreasuryLedger,
  type TreasurySourceItem,
  type DailySpendingItem,
} from '../../src/engine/treasury';

describe('Treasury Engine - P1 Pure Unit Tests', () => {
  describe('isAccountingOpen (10 PM Lock Gate)', () => {
    it('is locked before 22:00 (e.g. 21:59 = 1319 mins)', () => {
      expect(isAccountingOpen(21 * 60 + 59, false, 22)).toBe(false);
    });

    it('is open at 22:00 exactly (1320 mins)', () => {
      expect(isAccountingOpen(22 * 60, false, 22)).toBe(true);
    });

    it('is open after 22:00 (e.g. 23:30 = 1410 mins)', () => {
      expect(isAccountingOpen(23 * 60 + 30, false, 22)).toBe(true);
    });

    it('stays open after midnight until the day closes', () => {
      expect(isAccountingOpen(0, false, 22)).toBe(true);
      expect(isAccountingOpen(30, false, 22)).toBe(true);
      expect(isAccountingOpen(2 * 60 + 59, false, 22)).toBe(true);
    });

    it('is locked through the morning after the day boundary', () => {
      expect(isAccountingOpen(4 * 60, false, 22)).toBe(false);
      expect(isAccountingOpen(12 * 60, false, 22)).toBe(false);
    });

    it('is locked when day is closed (03:00 - 04:00 window)', () => {
      expect(isAccountingOpen(23 * 60, true, 22)).toBe(false);
      expect(isAccountingOpen(3 * 60 + 30, true, 22)).toBe(false);
    });
  });

  describe('computeRemainingDays', () => {
    it('returns 30 days for 2026-09-01 to 2026-09-30 on day 1', () => {
      expect(computeRemainingDays('2026-09-01', '2026-09-30')).toBe(30);
    });

    it('returns 1 day on the period end date', () => {
      expect(computeRemainingDays('2026-09-30', '2026-09-30')).toBe(1);
    });

    it('returns 0 days on the day after period end date', () => {
      expect(computeRemainingDays('2026-10-01', '2026-09-30')).toBe(0);
    });
  });

  describe('Allowance Calculation & Worked Examples (§7)', () => {
    // Worked Example 1 (under spend):
    // Total source: ₹3,800.00 = 380,000 paise. 30 days.
    // Day 1 allowance: floor(380000 / 30) = 12,666 paise (₹126.66)
    // Day 1 spend: ₹30.00 = 3,000 paise.
    // Day 2 spendable: 380,000 - 3,000 = 377,000 paise (₹3,770.00)
    // Day 2 allowance: floor(377000 / 29) = 13,000 paise (₹130.00)
    it('matches Worked Example 1 (under spend) exactly', () => {
      const sources: TreasurySourceItem[] = [
        {
          id: 'src-1',
          treasuryId: 'tr-1',
          name: 'Main Bank',
          amountMinor: 380000,
          protected: false,
          active: true,
          createdAtLocalDate: '2026-09-01',
        },
      ];

      // Day 1:
      const spendableDay1 = computeSpendableMinor(sources, [], '2026-09-01');
      expect(spendableDay1).toBe(380000);
      const allowanceDay1 = computeAllowanceMinor(spendableDay1, 30);
      expect(allowanceDay1).toBe(12666);

      // Day 1 spend of 3,000 paise
      const spendings: DailySpendingItem[] = [
        {
          localDate: '2026-09-01',
          treasuryId: 'tr-1',
          amountMinor: 3000,
          registeredAt: '2026-09-01T22:30:00Z',
          corrected: false,
        },
      ];

      // Day 2:
      const spendableDay2 = computeSpendableMinor(sources, spendings, '2026-09-02');
      expect(spendableDay2).toBe(377000);
      const remainingDay2 = computeRemainingDays('2026-09-02', '2026-09-30');
      expect(remainingDay2).toBe(29);
      const allowanceDay2 = computeAllowanceMinor(spendableDay2, remainingDay2);
      expect(allowanceDay2).toBe(13000); // 13000 paise = ₹130.00
    });

    // Worked Example 2 (over spend):
    // Total source: ₹3,800.00 = 380,000 paise. 30 days.
    // Day 1 spend: ₹150.00 = 15,000 paise.
    // Day 2 spendable: 380,000 - 15,000 = 365,000 paise (₹3,650.00)
    // Day 2 allowance: floor(365000 / 29) = 12,586 paise (₹125.86)
    it('matches Worked Example 2 (over spend) exactly', () => {
      const sources: TreasurySourceItem[] = [
        {
          id: 'src-1',
          treasuryId: 'tr-1',
          name: 'Main Bank',
          amountMinor: 380000,
          protected: false,
          active: true,
          createdAtLocalDate: '2026-09-01',
        },
      ];

      const spendings: DailySpendingItem[] = [
        {
          localDate: '2026-09-01',
          treasuryId: 'tr-1',
          amountMinor: 15000,
          registeredAt: '2026-09-01T22:30:00Z',
          corrected: false,
        },
      ];

      const spendableDay2 = computeSpendableMinor(sources, spendings, '2026-09-02');
      expect(spendableDay2).toBe(365000);
      const allowanceDay2 = computeAllowanceMinor(spendableDay2, 29);
      expect(allowanceDay2).toBe(12586); // ₹125.86
    });

    it('floors allowance and never rounds up', () => {
      // 101 paise spendable / 3 days = 33.666... -> floor is 33
      expect(computeAllowanceMinor(101, 3)).toBe(33);
    });

    it('ignores protected sources from spendable treasury', () => {
      const sources: TreasurySourceItem[] = [
        {
          id: 'src-1',
          treasuryId: 'tr-1',
          name: 'Spendable Bank',
          amountMinor: 100000,
          protected: false,
          active: true,
          createdAtLocalDate: '2026-09-01',
        },
        {
          id: 'src-2',
          treasuryId: 'tr-1',
          name: 'Reserve Pot',
          amountMinor: 500000,
          protected: true,
          active: true,
          createdAtLocalDate: '2026-09-01',
        },
      ];

      const spendable = computeSpendableMinor(sources, [], '2026-09-01');
      expect(spendable).toBe(100000);
    });
  });

  describe('Status State Machine (§10)', () => {
    it('returns LOCKED before 22:00 if not registered', () => {
      const res = deriveTreasuryStatus({
        remainingDays: 10,
        spendableMinor: 100000,
        allowanceMinor: 10000,
        dailySpending: null,
        isAccountingOpen: false,
      });
      expect(res.status).toBe('LOCKED');
    });

    it('returns UNREGISTERED after 22:00 if not registered', () => {
      const res = deriveTreasuryStatus({
        remainingDays: 10,
        spendableMinor: 100000,
        allowanceMinor: 10000,
        dailySpending: null,
        isAccountingOpen: true,
      });
      expect(res.status).toBe('UNREGISTERED');
    });

    it('returns PRESERVED when spent < allowance', () => {
      const res = deriveTreasuryStatus({
        remainingDays: 10,
        spendableMinor: 100000,
        allowanceMinor: 10000,
        dailySpending: {
          localDate: '2026-09-05',
          treasuryId: 'tr-1',
          amountMinor: 5000,
          registeredAt: '2026-09-05T22:05:00Z',
          corrected: false,
        },
        isAccountingOpen: true,
      });
      expect(res.status).toBe('PRESERVED');
    });

    it('returns ON_ALLOWANCE when spent == allowance', () => {
      const res = deriveTreasuryStatus({
        remainingDays: 10,
        spendableMinor: 100000,
        allowanceMinor: 10000,
        dailySpending: {
          localDate: '2026-09-05',
          treasuryId: 'tr-1',
          amountMinor: 10000,
          registeredAt: '2026-09-05T22:05:00Z',
          corrected: false,
        },
        isAccountingOpen: true,
      });
      expect(res.status).toBe('ON_ALLOWANCE');
    });

    it('returns OVER_ALLOWANCE when spent > allowance but treasury remains positive', () => {
      const res = deriveTreasuryStatus({
        remainingDays: 10,
        spendableMinor: 100000,
        allowanceMinor: 10000,
        dailySpending: {
          localDate: '2026-09-05',
          treasuryId: 'tr-1',
          amountMinor: 15000,
          registeredAt: '2026-09-05T22:05:00Z',
          corrected: false,
        },
        isAccountingOpen: true,
      });
      expect(res.status).toBe('OVER_ALLOWANCE');
    });

    it('returns CRITICAL when spending depletes spendable to 0 or negative mid-period', () => {
      const res = deriveTreasuryStatus({
        remainingDays: 10,
        spendableMinor: 10000,
        allowanceMinor: 1000,
        dailySpending: {
          localDate: '2026-09-05',
          treasuryId: 'tr-1',
          amountMinor: 12000,
          registeredAt: '2026-09-05T22:05:00Z',
          corrected: false,
        },
        isAccountingOpen: true,
      });
      expect(res.status).toBe('CRITICAL');
    });

    it('returns CONCLUDED with SURVIVED verdict when period ends with spendable >= 0', () => {
      const res = deriveTreasuryStatus({
        remainingDays: 0,
        spendableMinor: 500,
        allowanceMinor: null,
        dailySpending: null,
        isAccountingOpen: true,
      });
      expect(res.status).toBe('CONCLUDED');
      expect(res.verdict).toBe('SURVIVED');
    });

    it('returns CONCLUDED with EXHAUSTED verdict when period ends with spendable < 0', () => {
      const res = deriveTreasuryStatus({
        remainingDays: 0,
        spendableMinor: -500,
        allowanceMinor: null,
        dailySpending: null,
        isAccountingOpen: true,
      });
      expect(res.status).toBe('CONCLUDED');
      expect(res.verdict).toBe('EXHAUSTED');
    });
  });

  describe('Ledger Calculation & Mid-period events', () => {
    it('recomputes downstream allowances automatically when a prior day spending is corrected', () => {
      const sources: TreasurySourceItem[] = [
        {
          id: 'src-1',
          treasuryId: 'tr-1',
          name: 'Main',
          amountMinor: 300000, // ₹3,000.00
          protected: false,
          active: true,
          createdAtLocalDate: '2026-09-01',
        },
      ];

      // Day 1 original spend: ₹1,000 (100000 paise).
      // Initial ledger:
      const spendingsBeforeCorrection: DailySpendingItem[] = [
        {
          localDate: '2026-09-01',
          treasuryId: 'tr-1',
          amountMinor: 100000,
          registeredAt: '2026-09-01T22:00:00Z',
          corrected: false,
        },
      ];

      const ledger1 = computeTreasuryLedger({
        periodStartDate: '2026-09-01',
        periodEndDate: '2026-09-03',
        sources,
        dailySpendings: spendingsBeforeCorrection,
        currentLocalDate: '2026-09-02',
      });

      expect(ledger1[0].spentMinor).toBe(100000);
      expect(ledger1[1].spendableMinor).toBe(200000); // 300000 - 100000
      expect(ledger1[1].allowanceMinor).toBe(100000); // floor(200000 / 2 days)

      // Correct Day 1 spend to ₹500 (50000 paise)
      const spendingsAfterCorrection: DailySpendingItem[] = [
        {
          localDate: '2026-09-01',
          treasuryId: 'tr-1',
          amountMinor: 50000,
          registeredAt: '2026-09-01T22:00:00Z',
          corrected: true,
          history: [{ amountMinor: 100000, changedAt: '2026-09-01T22:30:00Z' }],
        },
      ];

      const ledger2 = computeTreasuryLedger({
        periodStartDate: '2026-09-01',
        periodEndDate: '2026-09-03',
        sources,
        dailySpendings: spendingsAfterCorrection,
        currentLocalDate: '2026-09-02',
      });

      expect(ledger2[0].spentMinor).toBe(50000);
      expect(ledger2[1].spendableMinor).toBe(250000); // 300000 - 50000
      expect(ledger2[1].allowanceMinor).toBe(125000); // floor(250000 / 2 days)
    });

    it('handles source added mid-period without affecting prior days', () => {
      const sources: TreasurySourceItem[] = [
        {
          id: 'src-1',
          treasuryId: 'tr-1',
          name: 'Main',
          amountMinor: 100000,
          protected: false,
          active: true,
          createdAtLocalDate: '2026-09-01',
        },
        {
          id: 'src-2',
          treasuryId: 'tr-1',
          name: 'Top Up',
          amountMinor: 50000,
          protected: false,
          active: true,
          createdAtLocalDate: '2026-09-02',
        },
      ];

      const spendableDay1 = computeSpendableMinor(sources, [], '2026-09-01');
      expect(spendableDay1).toBe(100000);

      const spendableDay2 = computeSpendableMinor(sources, [], '2026-09-02');
      expect(spendableDay2).toBe(150000);
    });
  });
});
