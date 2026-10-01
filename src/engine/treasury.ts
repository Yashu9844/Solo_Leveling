// Pure Treasury Engine functions.
// Follows design/08-MONEY-DISCIPLINE-PLAN.md §7, §9, §10.
// No I/O, no Dexie, no side effects.

import { parseISO, differenceInCalendarDays, addDays, format } from 'date-fns';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

/** All money figures are integer minor units (paise for INR). Never a float. */
export type AmountMinor = number;

export interface TreasurySourceInput {
  name: string;
  amountMinor: AmountMinor;
  protected: boolean;
  note?: string;
}

export interface TreasurySourceItem {
  id: string;
  treasuryId: string;
  name: string;
  amountMinor: AmountMinor;
  protected: boolean;
  active: boolean;
  createdAtLocalDate: string;
  withdrawnAtLocalDate?: string;
}

export interface DailySpendingItem {
  localDate: string;
  treasuryId: string;
  amountMinor: AmountMinor;
  registeredAt: string;
  corrected: boolean;
  history?: { amountMinor: AmountMinor; changedAt: string; reason?: string }[];
}

export type TreasuryStatus =
  | 'LOCKED'
  | 'UNREGISTERED'
  | 'PRESERVED'
  | 'ON_ALLOWANCE'
  | 'OVER_ALLOWANCE'
  | 'CRITICAL'
  | 'CONCLUDED';

export type TreasuryVerdict = 'SURVIVED' | 'EXHAUSTED';

export interface TreasuryStatusResult {
  status: TreasuryStatus;
  verdict?: TreasuryVerdict;
}

export interface TreasuryLedgerRow {
  localDate: string;
  remainingDays: number;
  spendableMinor: AmountMinor;
  allowanceMinor: AmountMinor | null;
  spentMinor: AmountMinor | null;
  preservedMinor: AmountMinor | null;
  overMinor: AmountMinor | null;
  spendableAfterMinor: AmountMinor;
  nextAllowanceMinor: AmountMinor | null;
  status: TreasuryStatus;
  verdict?: TreasuryVerdict;
}

/**
 * Returns true if accounting is open for the day.
 * Accounting is open from openHour (default 22:00) until the day closes (03:00).
 * If dayClosed is true (03:00 - 04:00 window), accounting is locked.
 */
export function isAccountingOpen(
  minutesOfDay: number,
  dayClosed: boolean,
  openHour = 22
): boolean {
  if (dayClosed) return false;
  return minutesOfDay >= openHour * 60;
}

/**
 * Computes remaining days in the period inclusive of localDate.
 * remainingDays(periodEndDate) === 1
 * remainingDays(day after periodEndDate) === 0
 */
export function computeRemainingDays(localDate: string, periodEndDate: string): number {
  const start = parseISO(localDate);
  const end = parseISO(periodEndDate);
  const diff = differenceInCalendarDays(end, start);
  return diff + 1;
}

/**
 * Calculates net spendable treasury at the start of targetLocalDate.
 * Includes all active, non-protected sources created on or before targetLocalDate.
 * Subtracts all daily spending recorded for prior dates (periodStart <= d < targetLocalDate).
 */
export function computeSpendableMinor(
  sources: TreasurySourceItem[],
  dailySpendings: DailySpendingItem[],
  targetLocalDate: string
): AmountMinor {
  const totalSources = sources.reduce((sum, s) => {
    if (s.protected) return sum;
    if (s.createdAtLocalDate > targetLocalDate) return sum;
    if (!s.active && s.withdrawnAtLocalDate && s.withdrawnAtLocalDate <= targetLocalDate) {
      return sum;
    }
    if (!s.active && !s.withdrawnAtLocalDate) {
      return sum;
    }
    return sum + s.amountMinor;
  }, 0);

  const priorSpending = dailySpendings.reduce((sum, sp) => {
    if (sp.localDate < targetLocalDate) {
      return sum + sp.amountMinor;
    }
    return sum;
  }, 0);

  return totalSources - priorSpending;
}

/**
 * Calculates daily allowance for localDate.
 * allowanceMinor = floor(spendable / remainingDays) if remainingDays > 0, else null.
 * Uses integer math (Math.floor). Never rounds up.
 */
export function computeAllowanceMinor(
  spendableMinor: AmountMinor,
  remainingDays: number
): AmountMinor | null {
  if (remainingDays <= 0) return null;
  return Math.floor(spendableMinor / remainingDays);
}

export interface DeriveStatusParams {
  remainingDays: number;
  spendableMinor: AmountMinor;
  allowanceMinor: AmountMinor | null;
  dailySpending: DailySpendingItem | null;
  isAccountingOpen: boolean;
  isDayClosed?: boolean;
}

/**
 * Derives the 7-state Treasury status per design/08 §10.
 */
export function deriveTreasuryStatus(params: DeriveStatusParams): TreasuryStatusResult {
  const {
    remainingDays,
    spendableMinor,
    allowanceMinor,
    dailySpending,
    isAccountingOpen: open,
    isDayClosed = false,
  } = params;

  if (remainingDays <= 0) {
    return {
      status: 'CONCLUDED',
      verdict: spendableMinor >= 0 ? 'SURVIVED' : 'EXHAUSTED',
    };
  }

  if (spendableMinor <= 0) {
    if (!dailySpending) {
      if (!open && !isDayClosed) {
        return { status: 'LOCKED' };
      }
      return { status: 'CRITICAL' };
    }
    return { status: 'CRITICAL' };
  }

  if (!dailySpending) {
    if (!open && !isDayClosed) {
      return { status: 'LOCKED' };
    }
    return { status: 'UNREGISTERED' };
  }

  const spent = dailySpending.amountMinor;
  const allowance = allowanceMinor ?? 0;

  if (spent < allowance) {
    return { status: 'PRESERVED' };
  } else if (spent === allowance) {
    return { status: 'ON_ALLOWANCE' };
  } else {
    const spendableNextDay = spendableMinor - spent;
    if (spendableNextDay <= 0 && remainingDays > 1) {
      return { status: 'CRITICAL' };
    }
    return { status: 'OVER_ALLOWANCE' };
  }
}

export interface ComputeLedgerParams {
  periodStartDate: string;
  periodEndDate: string;
  sources: TreasurySourceItem[];
  dailySpendings: DailySpendingItem[];
  currentLocalDate: string;
  openHour?: number;
}

/**
 * Computes day-by-day treasury ledger from periodStartDate up to currentLocalDate (or periodEndDate).
 * Recomputed on read; never cached in IndexedDB (design/08 §4.3.2).
 */
export function computeTreasuryLedger(params: ComputeLedgerParams): TreasuryLedgerRow[] {
  const {
    periodStartDate,
    periodEndDate,
    sources,
    dailySpendings,
    currentLocalDate,
  } = params;

  const rows: TreasuryLedgerRow[] = [];
  let curr = parseISO(periodStartDate);
  const end = parseISO(periodEndDate);

  while (curr <= end) {
    const dStr = format(curr, 'yyyy-MM-dd');
    if (dStr > currentLocalDate) break;

    const remainingDays = computeRemainingDays(dStr, periodEndDate);
    const spendableMinor = computeSpendableMinor(sources, dailySpendings, dStr);
    const allowanceMinor = computeAllowanceMinor(spendableMinor, remainingDays);
    const spItem = dailySpendings.find((s) => s.localDate === dStr) ?? null;
    const spentMinor = spItem ? spItem.amountMinor : null;

    let preservedMinor: AmountMinor | null = null;
    let overMinor: AmountMinor | null = null;
    if (spentMinor !== null && allowanceMinor !== null) {
      if (spentMinor < allowanceMinor) {
        preservedMinor = allowanceMinor - spentMinor;
      } else if (spentMinor > allowanceMinor) {
        overMinor = spentMinor - allowanceMinor;
      }
    }

    const spendableAfterMinor = spentMinor !== null ? spendableMinor - spentMinor : spendableMinor;
    const nextAllowanceMinor =
      remainingDays > 1
        ? computeAllowanceMinor(spendableAfterMinor, remainingDays - 1)
        : null;

    // For historical dates in ledger, treat accounting as having opened
    const isToday = dStr === currentLocalDate;
    const statusResult = deriveTreasuryStatus({
      remainingDays,
      spendableMinor,
      allowanceMinor,
      dailySpending: spItem,
      isAccountingOpen: !isToday ? true : true, // ledger view assumes accounting completed or closed for past days
    });

    rows.push({
      localDate: dStr,
      remainingDays,
      spendableMinor,
      allowanceMinor,
      spentMinor,
      preservedMinor,
      overMinor,
      spendableAfterMinor,
      nextAllowanceMinor,
      status: statusResult.status,
      verdict: statusResult.verdict,
    });

    curr = addDays(curr, 1);
  }

  return rows;
}
