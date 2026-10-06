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
 * Spending can be entered or changed for any day of the period, at any
 * hour, including days already gone by.
 *
 * It used to open only at 22:00 and shut at 03:00. In practice that meant
 * a Player who forgot to feed the day at night simply lost it, and could
 * never repair a wrong figure the next morning. Nothing about the maths
 * needs the gate — the allowance is recomputed from the stored days on
 * every read, so entering or correcting any day re-spreads the remaining
 * money correctly — so the gate went, rather than being widened again.
 *
 * What stays is the only bound that is not a policy choice: a day can be
 * accounted for only once it has begun (no spending for tomorrow), and
 * only if it falls inside the period (nothing before it started, nothing
 * after it ended).
 */
export function canEditDay(
  localDate: string,
  periodStartDate: string,
  periodEndDate: string,
  todayLocalDate: string
): boolean {
  return localDate >= periodStartDate && localDate <= periodEndDate && localDate <= todayLocalDate;
}

/**
 * Days in the period, up to and including today, that have no entry —
 * oldest first. Today is included only when `includeToday` is set,
 * because an empty today is "not yet", where an empty past day is
 * genuinely unaccounted.
 */
export function unaccountedDays(
  periodStartDate: string,
  periodEndDate: string,
  todayLocalDate: string,
  registeredDates: string[],
  includeToday = false
): string[] {
  const have = new Set(registeredDates);
  const last = periodEndDate < todayLocalDate ? periodEndDate : todayLocalDate;
  const out: string[] = [];
  let curr = parseISO(periodStartDate);
  while (true) {
    const d = format(curr, 'yyyy-MM-dd');
    if (d > last) break;
    if ((d < todayLocalDate || includeToday) && !have.has(d)) out.push(d);
    curr = addDays(curr, 1);
  }
  return out;
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
  } = params;

  if (remainingDays <= 0) {
    return {
      status: 'CONCLUDED',
      verdict: spendableMinor >= 0 ? 'SURVIVED' : 'EXHAUSTED',
    };
  }

  if (spendableMinor <= 0) {
    return { status: 'CRITICAL' };
  }

  if (!dailySpending) {
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

    const statusResult = deriveTreasuryStatus({
      remainingDays,
      spendableMinor,
      allowanceMinor,
      dailySpending: spItem,
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
