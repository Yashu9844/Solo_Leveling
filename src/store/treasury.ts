// Store layer for Money Discipline (Treasury).
// Follows design/08-MONEY-DISCIPLINE-PLAN.md §4, §6, §7, §8, §10, §15, §16.

import { db } from '../db/db';
import { appendEvent } from '../db/events';
import type {
  DailySpendingRow,
  TreasuryRow,
  TreasurySourceRow,
} from '../db/schema';
import { DEFAULT_CONFIG } from '../engine/config';
import {
  computeAllowanceMinor,
  computeRemainingDays,
  computeSpendableMinor,
  computeTreasuryLedger,
  canEditDay,
  cycleBounds,
  deriveTreasuryStatus,
  needsCycleCheckIn,
  unaccountedDays,
  type AmountMinor,
  type CurrencyCode,
  type TreasuryLedgerRow,
  type TreasurySourceInput,
  type TreasuryStatusResult,
} from '../engine/treasury';
import { localDate } from '../engine/time';
import type {
  DailySpendingCorrectedPayload,
  DailySpendingRegisteredPayload,
  EngineConfig,
  EngineDeps,
  SystemEvent,
  TreasuryCreatedPayload,
  TreasuryPeriodConcludedPayload,
  TreasurySourceAddedPayload,
  TreasurySourceWithdrawnPayload,
} from '../engine/types';
import { realDeps } from './deps';

async function getProfile() {
  return db.profile.toCollection().first();
}

export interface CreateTreasuryParams {
  periodStartDate: string;
  periodEndDate: string;
  currency?: CurrencyCode;
  accountingOpenHour?: number;
  sources: TreasurySourceInput[];
}

export async function createTreasury(
  params: CreateTreasuryParams,
  deps: EngineDeps = realDeps
): Promise<string> {
  const profile = await getProfile();
  const tz = profile?.arc_timezone || DEFAULT_CONFIG.arc.timezone;
  const now = deps.now();
  const today = localDate(now, tz);

  const existingActive = await db.treasury.where('status').equals('active').first();
  if (existingActive) {
    // Conclude active treasury before creating a new one
    await db.treasury.update(existingActive.id, { status: 'concluded' });
  }

  const treasuryId = deps.newId();
  const currency = params.currency || 'INR';
  const openHour = params.accountingOpenHour ?? 22;

  const payload: TreasuryCreatedPayload = {
    treasuryId,
    currency,
    periodStartDate: params.periodStartDate,
    periodEndDate: params.periodEndDate,
    accountingOpenHour: openHour,
    sources: params.sources,
  };

  const event: SystemEvent<TreasuryCreatedPayload> = {
    id: deps.newId(),
    type: 'TREASURY_CREATED',
    occurred_at: now,
    local_date: today,
    arc_id: 'default',
    payload,
    source: 'user',
    idem_key: `treasury-created:${treasuryId}`,
    schema_v: 1,
  };

  await appendEvent(event as unknown as SystemEvent);

  const treasuryRow: TreasuryRow = {
    id: treasuryId,
    currency,
    period_start_date: params.periodStartDate,
    period_end_date: params.periodEndDate,
    accounting_open_hour: openHour,
    status: 'active',
    created_at: now,
  };

  await db.treasury.put(treasuryRow);

  for (let i = 0; i < params.sources.length; i++) {
    const src = params.sources[i];
    if (!src) continue;
    const sourceId = `${treasuryId}-src-${i}`;
    const sourceRow: TreasurySourceRow = {
      id: sourceId,
      treasury_id: treasuryId,
      name: src.name,
      amount_minor: src.amountMinor,
      protected: src.protected,
      note: src.note,
      active: true,
      created_at: `${params.periodStartDate}T00:00:00.000Z`,
    };
    await db.treasury_source.put(sourceRow);
  }

  return treasuryId;
}

export async function addSource(
  treasuryId: string,
  source: TreasurySourceInput,
  localDateStr?: string,
  deps: EngineDeps = realDeps
): Promise<string> {
  const profile = await getProfile();
  const tz = profile?.arc_timezone || DEFAULT_CONFIG.arc.timezone;
  const now = deps.now();
  const today = localDateStr || localDate(now, tz);
  const sourceId = deps.newId();

  const payload: TreasurySourceAddedPayload = {
    treasuryId,
    sourceId,
    localDate: today,
    source,
  };

  const event: SystemEvent<TreasurySourceAddedPayload> = {
    id: deps.newId(),
    type: 'TREASURY_SOURCE_ADDED',
    occurred_at: now,
    local_date: today,
    arc_id: 'default',
    payload,
    source: 'user',
    idem_key: `treasury-source-added:${sourceId}`,
    schema_v: 1,
  };

  await appendEvent(event as unknown as SystemEvent);

  const sourceRow: TreasurySourceRow = {
    id: sourceId,
    treasury_id: treasuryId,
    name: source.name,
    amount_minor: source.amountMinor,
    protected: source.protected,
    note: source.note,
    active: true,
    created_at: now,
  };

  await db.treasury_source.put(sourceRow);
  return sourceId;
}

export async function withdrawSource(
  treasuryId: string,
  sourceId: string,
  reason?: string,
  deps: EngineDeps = realDeps
): Promise<void> {
  const profile = await getProfile();
  const tz = profile?.arc_timezone || DEFAULT_CONFIG.arc.timezone;
  const now = deps.now();
  const today = localDate(now, tz);

  const payload: TreasurySourceWithdrawnPayload = {
    treasuryId,
    sourceId,
    localDate: today,
    reason,
  };

  const event: SystemEvent<TreasurySourceWithdrawnPayload> = {
    id: deps.newId(),
    type: 'TREASURY_SOURCE_WITHDRAWN',
    occurred_at: now,
    local_date: today,
    arc_id: 'default',
    payload,
    source: 'user',
    idem_key: `treasury-source-withdrawn:${sourceId}`,
    schema_v: 1,
  };

  await appendEvent(event as unknown as SystemEvent);

  const existing = await db.treasury_source.get(sourceId);
  if (existing) {
    await db.treasury_source.update(sourceId, {
      active: false,
      withdrawn_at: now,
    });
  }
}

export async function registerSpending(
  treasuryId: string,
  amountMinor: AmountMinor,
  localDateStr?: string,
  deps: EngineDeps = realDeps
): Promise<void> {
  const profile = await getProfile();
  const tz = profile?.arc_timezone || DEFAULT_CONFIG.arc.timezone;
  const now = deps.now();
  const today = localDateStr || localDate(now, tz);

  // A day has exactly one first entry. Anything after it is a correction,
  // which keeps the original value in history; registering again must
  // never silently replace it.
  if (await db.daily_spending.get(today)) return;

  const payload: DailySpendingRegisteredPayload = {
    treasuryId,
    localDate: today,
    amountMinor,
  };

  const event: SystemEvent<DailySpendingRegisteredPayload> = {
    id: deps.newId(),
    type: 'DAILY_SPENDING_REGISTERED',
    occurred_at: now,
    local_date: today,
    arc_id: 'default',
    payload,
    source: 'user',
    idem_key: `treasury-spend:${treasuryId}:${today}`,
    schema_v: 1,
  };

  await appendEvent(event as unknown as SystemEvent);

  const existing = await db.daily_spending.get(today);
  if (!existing) {
    const row: DailySpendingRow = {
      local_date: today,
      treasury_id: treasuryId,
      amount_minor: amountMinor,
      registered_at: now,
      corrected: false,
      history: [{ amount_minor: amountMinor, changed_at: now }],
    };
    await db.daily_spending.put(row);
  }
}

export async function correctSpending(
  treasuryId: string,
  localDateStr: string,
  newAmountMinor: AmountMinor,
  reason?: string,
  deps: EngineDeps = realDeps
): Promise<void> {
  const now = deps.now();

  const existing = await db.daily_spending.get(localDateStr);
  const previousAmountMinor = existing ? existing.amount_minor : 0;

  const payload: DailySpendingCorrectedPayload = {
    treasuryId,
    localDate: localDateStr,
    previousAmountMinor,
    newAmountMinor,
    reason,
  };

  const event: SystemEvent<DailySpendingCorrectedPayload> = {
    id: deps.newId(),
    type: 'DAILY_SPENDING_CORRECTED',
    occurred_at: now,
    local_date: localDateStr,
    arc_id: 'default',
    payload,
    source: 'user',
    idem_key: `treasury-spend-correct:${treasuryId}:${localDateStr}:${deps.newId()}`,
    schema_v: 1,
  };

  await appendEvent(event as unknown as SystemEvent);

  if (existing) {
    const newHistory = [
      ...existing.history,
      { amount_minor: newAmountMinor, changed_at: now, reason },
    ];
    await db.daily_spending.put({
      ...existing,
      amount_minor: newAmountMinor,
      corrected: true,
      history: newHistory,
    });
  } else {
    await db.daily_spending.put({
      local_date: localDateStr,
      treasury_id: treasuryId,
      amount_minor: newAmountMinor,
      registered_at: now,
      corrected: true,
      history: [{ amount_minor: newAmountMinor, changed_at: now, reason }],
    });
  }
}

export class TreasuryEntryError extends Error {}

/**
 * The day a source starts counting from. The sources entered at set-up
 * are the treasury's opening balance, so they count from the first day of
 * the period — not from the day the Player happened to type them in.
 * Without this, setting up on the 10th and then filling in the 1st-9th
 * would show those earlier days with no money behind them. A source added
 * later is genuinely new money and counts from the day it was added.
 */
function sourceStartDate(source: TreasurySourceRow, treasury: TreasuryRow, tz: string): string {
  return source.id.startsWith(`${treasury.id}-src-`)
    ? treasury.period_start_date
    : localDate(source.created_at, tz);
}

/**
 * Enter or change the spending for any day of the period, at any hour.
 *
 * The one write the UI needs: the first entry for a day is a register,
 * every later one is a correction that keeps the earlier figure in
 * history, and entering the same figure again is a no-op. Past days are
 * as editable as today — the allowance is recomputed from the stored days
 * on every read, so raising or lowering an old day re-spreads what is
 * left across the days still to come with nothing else to update.
 */
export async function setDaySpending(
  treasuryId: string,
  localDateStr: string,
  amountMinor: AmountMinor,
  reason?: string,
  deps: EngineDeps = realDeps
): Promise<'registered' | 'corrected' | 'unchanged'> {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new TreasuryEntryError('Enter an amount of zero or more.');
  }

  const treasury = await db.treasury.get(treasuryId);
  if (!treasury) throw new TreasuryEntryError('No treasury to enter spending against.');
  if (treasury.status !== 'active') {
    throw new TreasuryEntryError('This treasury period has concluded.');
  }

  const profile = await getProfile();
  const tz = profile?.arc_timezone || DEFAULT_CONFIG.arc.timezone;
  const today = localDate(deps.now(), tz);
  if (!canEditDay(localDateStr, treasury.period_start_date, treasury.period_end_date, today)) {
    throw new TreasuryEntryError(
      localDateStr > today
        ? 'A day can only be accounted once it has begun.'
        : 'That day is outside the treasury period.'
    );
  }

  const existing = await db.daily_spending.get(localDateStr);
  if (!existing) {
    await registerSpending(treasuryId, amountMinor, localDateStr, deps);
    return 'registered';
  }
  if (existing.amount_minor === amountMinor) return 'unchanged';
  await correctSpending(treasuryId, localDateStr, amountMinor, reason, deps);
  return 'corrected';
}

export async function concludeTreasuryPeriod(
  treasuryId: string,
  localDateStr: string,
  finalSpendableMinor: AmountMinor,
  verdict: 'SURVIVED' | 'EXHAUSTED',
  deps: EngineDeps = realDeps
): Promise<void> {
  const now = deps.now();
  const payload: TreasuryPeriodConcludedPayload = {
    treasuryId,
    concludedLocalDate: localDateStr,
    finalSpendableMinor,
    verdict,
  };

  const event: SystemEvent<TreasuryPeriodConcludedPayload> = {
    id: deps.newId(),
    type: 'TREASURY_PERIOD_CONCLUDED',
    occurred_at: now,
    local_date: localDateStr,
    arc_id: 'default',
    payload,
    source: 'system',
    idem_key: `treasury-concluded:${treasuryId}`,
    schema_v: 1,
  };

  await appendEvent(event as unknown as SystemEvent);

  const tr = await db.treasury.get(treasuryId);
  if (tr) {
    await db.treasury.update(treasuryId, {
      status: 'concluded',
      concluded_verdict: verdict,
      concluded_local_date: localDateStr,
    });
  }
}

export async function getActiveTreasury(): Promise<TreasuryRow | null> {
  const tr = await db.treasury.where('status').equals('active').first();
  return tr ?? null;
}

export async function getActiveOrLatestTreasury(): Promise<TreasuryRow | null> {
  const active = await db.treasury.where('status').equals('active').first();
  if (active) return active;
  const all = await db.treasury.toArray();
  if (all.length === 0) return null;
  all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return all[0] ?? null;
}

export interface CycleCheckIn {
  /** First and last day of the cycle being started (5th to 4th). */
  cycleStart: string;
  cycleEnd: string;
  /** What was left of the last treasury, as a starting suggestion. */
  suggestedMinor: AmountMinor;
}

/**
 * Money left in a treasury: every non-protected source that is still in,
 * less every day entered. Used to pre-fill the monthly pocket question.
 */
async function remainingOf(treasury: TreasuryRow, tz: string): Promise<AmountMinor> {
  const [sources, spendings] = await Promise.all([
    db.treasury_source.where('treasury_id').equals(treasury.id).toArray(),
    db.daily_spending.where('treasury_id').equals(treasury.id).toArray(),
  ]);
  return computeSpendableMinor(
    sources.map((src) => ({
      id: src.id,
      treasuryId: src.treasury_id,
      name: src.name,
      amountMinor: src.amount_minor,
      protected: src.protected,
      active: src.active,
      createdAtLocalDate: sourceStartDate(src, treasury, tz),
      withdrawnAtLocalDate: src.withdrawn_at ? localDate(src.withdrawn_at, tz) : undefined,
    })),
    spendings.map((d) => ({
      localDate: d.local_date,
      treasuryId: d.treasury_id,
      amountMinor: d.amount_minor,
      registeredAt: d.registered_at,
      corrected: d.corrected,
    })),
    '9999-12-31'
  );
}

export async function getCycleCheckIn(
  instantIso?: string,
  deps: EngineDeps = realDeps
): Promise<CycleCheckIn | null> {
  const profile = await getProfile();
  const tz = profile?.arc_timezone || DEFAULT_CONFIG.arc.timezone;
  const today = localDate(instantIso || deps.now(), tz);

  const all = await db.treasury.toArray();
  const active = all.find((t) => t.status === 'active') ?? null;
  // A treasury counts as started when it was set up, not only when its
  // period says it began: someone who sets up today with a period that
  // starts on the 1st has just told the System their pocket, and must not
  // be asked again before the next 5th.
  const activeStartedOn = active
    ? [active.period_start_date, localDate(active.created_at, tz)].sort()[1] ?? active.period_start_date
    : null;
  if (!needsCycleCheckIn(today, all.length > 0, activeStartedOn)) return null;

  const latest = active ?? [...all].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const left = latest ? await remainingOf(latest, tz) : 0;
  const { start, end } = cycleBounds(today);
  return { cycleStart: start, cycleEnd: end, suggestedMinor: Math.max(left, 0) };
}

/**
 * Start the new monthly cycle from the pocket the Player just counted.
 *
 * The money they say they hold is the whole spendable treasury from today
 * to the 4th, so deduction starts from that figure — not from whatever the
 * previous treasury's arithmetic says should be left. The old period is
 * concluded properly (with its verdict) rather than dropped.
 */
export async function startNewCycle(
  pocketMinor: AmountMinor,
  deps: EngineDeps = realDeps
): Promise<string> {
  if (!Number.isSafeInteger(pocketMinor) || pocketMinor < 0) {
    throw new TreasuryEntryError('Enter the amount in your pocket, zero or more.');
  }
  const profile = await getProfile();
  const tz = profile?.arc_timezone || DEFAULT_CONFIG.arc.timezone;
  const today = localDate(deps.now(), tz);

  const active = await getActiveTreasury();
  if (active) {
    const left = await remainingOf(active, tz);
    await concludeTreasuryPeriod(active.id, today, left, left >= 0 ? 'SURVIVED' : 'EXHAUSTED', deps);
  }

  return createTreasury(
    {
      periodStartDate: today,
      periodEndDate: cycleBounds(today).end,
      currency: 'INR',
      sources: [{ name: 'Pocket', amountMinor: pocketMinor, protected: false }],
    },
    deps
  );
}

export interface TreasurySummary {
  treasury: TreasuryRow | null;
  sources: TreasurySourceRow[];
  todaySpending: DailySpendingRow | null;
  todayLocalDate: string;
  remainingDays: number;
  spendableMinor: AmountMinor;
  allowanceMinor: AmountMinor | null;
  statusResult: TreasuryStatusResult;
  /** Every entered day, so the card can show any day's figure. */
  entries: { localDate: string; amountMinor: AmountMinor }[];
  /** Past days of the period with no entry, oldest first. */
  unaccounted: string[];
  /** Set when a new monthly cycle has begun and the pocket has not been re-counted. */
  cycleCheckIn: CycleCheckIn | null;
  justConcludedVerdict?: 'SURVIVED' | 'EXHAUSTED';
}

export async function getTreasurySummary(
  instantIso?: string,
  config: EngineConfig = DEFAULT_CONFIG,
  deps: EngineDeps = realDeps
): Promise<TreasurySummary> {
  const now = instantIso || deps.now();
  const profile = await getProfile();
  const tz = profile?.arc_timezone || config.arc.timezone;
  const today = localDate(now, tz);

  const treasury = await getActiveTreasury();
  if (!treasury) {
    return {
      treasury: null,
      sources: [],
      todaySpending: null,
      todayLocalDate: today,
      remainingDays: 0,
      spendableMinor: 0,
      allowanceMinor: null,
      statusResult: { status: 'UNREGISTERED' },
      entries: [],
      unaccounted: [],
      cycleCheckIn: await getCycleCheckIn(now, deps),
    };
  }

  const sources = await db.treasury_source.where('treasury_id').equals(treasury.id).toArray();
  const dailySpendings = await db.daily_spending.where('treasury_id').equals(treasury.id).toArray();
  const todaySpending = dailySpendings.find((s) => s.local_date === today) ?? null;

  const engineSources = sources.map((s) => ({
    id: s.id,
    treasuryId: s.treasury_id,
    name: s.name,
    amountMinor: s.amount_minor,
    protected: s.protected,
    active: s.active,
    createdAtLocalDate: sourceStartDate(s, treasury, tz),
    withdrawnAtLocalDate: s.withdrawn_at ? localDate(s.withdrawn_at, tz) : undefined,
  }));

  const engineSpendings = dailySpendings.map((s) => ({
    localDate: s.local_date,
    treasuryId: s.treasury_id,
    amountMinor: s.amount_minor,
    registeredAt: s.registered_at,
    corrected: s.corrected,
  }));

  const remainingDays = computeRemainingDays(today, treasury.period_end_date);
  const spendableMinor = computeSpendableMinor(engineSources, engineSpendings, today);
  const allowanceMinor = computeAllowanceMinor(spendableMinor, remainingDays);

  const statusResult = deriveTreasuryStatus({
    remainingDays,
    spendableMinor,
    allowanceMinor,
    dailySpending: todaySpending
      ? {
          localDate: todaySpending.local_date,
          treasuryId: todaySpending.treasury_id,
          amountMinor: todaySpending.amount_minor,
          registeredAt: todaySpending.registered_at,
          corrected: todaySpending.corrected,
        }
      : null,
  });

  // Auto-conclude period if ended
  let justConcludedVerdict: 'SURVIVED' | 'EXHAUSTED' | undefined = undefined;
  if (remainingDays <= 0 && treasury.status === 'active') {
    const verdict = spendableMinor >= 0 ? 'SURVIVED' : 'EXHAUSTED';
    await concludeTreasuryPeriod(treasury.id, today, spendableMinor, verdict, deps);
    justConcludedVerdict = verdict;
  }

  return {
    treasury,
    sources,
    todaySpending,
    todayLocalDate: today,
    remainingDays,
    spendableMinor,
    allowanceMinor,
    statusResult,
    entries: dailySpendings.map((d) => ({ localDate: d.local_date, amountMinor: d.amount_minor })),
    unaccounted: unaccountedDays(
      treasury.period_start_date,
      treasury.period_end_date,
      today,
      dailySpendings.map((d) => d.local_date)
    ),
    cycleCheckIn: await getCycleCheckIn(now, deps),
    justConcludedVerdict,
  };
}

export async function getTreasuryLedger(currentLocalDate?: string): Promise<TreasuryLedgerRow[]> {
  const treasury = await getActiveOrLatestTreasury();
  if (!treasury) return [];

  const profile = await getProfile();
  const tz = profile?.arc_timezone || DEFAULT_CONFIG.arc.timezone;
  const today = currentLocalDate || localDate(new Date().toISOString(), tz);

  const sources = await db.treasury_source.where('treasury_id').equals(treasury.id).toArray();
  const dailySpendings = await db.daily_spending.where('treasury_id').equals(treasury.id).toArray();

  const engineSources = sources.map((s) => ({
    id: s.id,
    treasuryId: s.treasury_id,
    name: s.name,
    amountMinor: s.amount_minor,
    protected: s.protected,
    active: s.active,
    createdAtLocalDate: sourceStartDate(s, treasury, tz),
    withdrawnAtLocalDate: s.withdrawn_at ? localDate(s.withdrawn_at, tz) : undefined,
  }));

  const engineSpendings = dailySpendings.map((s) => ({
    localDate: s.local_date,
    treasuryId: s.treasury_id,
    amountMinor: s.amount_minor,
    registeredAt: s.registered_at,
    corrected: s.corrected,
  }));

  return computeTreasuryLedger({
    periodStartDate: treasury.period_start_date,
    periodEndDate: treasury.period_end_date,
    sources: engineSources,
    dailySpendings: engineSpendings,
    currentLocalDate: today,
  });
}

export interface TreasuryRealityMetrics {
  initialSpendableMinor: AmountMinor;
  currentSpendableMinor: AmountMinor;
  spentPeriodMinor: AmountMinor;
  totalDays: number;
  remainingDays: number;
  currentAllowanceMinor: AmountMinor | null;
  avgDailySpendMinor: AmountMinor;
  daysUnderAllowance: number;
  daysOverAllowance: number;
  survivalRatePct: number;
}

export async function getTreasuryRealityMetrics(currentLocalDate?: string): Promise<TreasuryRealityMetrics | null> {
  const treasury = await getActiveOrLatestTreasury();
  if (!treasury) return null;

  const profile = await getProfile();
  const tz = profile?.arc_timezone || DEFAULT_CONFIG.arc.timezone;
  let today = currentLocalDate || localDate(new Date().toISOString(), tz);
  if (today < treasury.period_start_date) {
    today = treasury.period_start_date;
  }

  const ledger = await getTreasuryLedger(today);
  if (ledger.length === 0) return null;

  const initialSpendableMinor = ledger[0]?.spendableMinor ?? 0;
  const lastRow = ledger[ledger.length - 1];
  if (!lastRow) return null;
  const currentSpendableMinor = lastRow.spendableAfterMinor;

  let spentPeriodMinor = 0;
  let daysUnderAllowance = 0;
  let daysOverAllowance = 0;
  let recordedDays = 0;

  for (const row of ledger) {
    if (row.spentMinor !== null) {
      spentPeriodMinor += row.spentMinor;
      recordedDays++;
      if (row.allowanceMinor !== null) {
        if (row.spentMinor <= row.allowanceMinor) {
          daysUnderAllowance++;
        } else {
          daysOverAllowance++;
        }
      }
    }
  }

  const totalDays = computeRemainingDays(treasury.period_start_date, treasury.period_end_date);
  const remainingDays = lastRow.remainingDays;
  const currentAllowanceMinor = lastRow.nextAllowanceMinor ?? lastRow.allowanceMinor;
  const avgDailySpendMinor = recordedDays > 0 ? Math.floor(spentPeriodMinor / recordedDays) : 0;
  const survivalRatePct = recordedDays > 0 ? Math.round((daysUnderAllowance / recordedDays) * 100) : 100;

  return {
    initialSpendableMinor,
    currentSpendableMinor,
    spentPeriodMinor,
    totalDays,
    remainingDays,
    currentAllowanceMinor,
    avgDailySpendMinor,
    daysUnderAllowance,
    daysOverAllowance,
    survivalRatePct,
  };
}
