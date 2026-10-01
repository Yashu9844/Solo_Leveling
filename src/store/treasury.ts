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
  deriveTreasuryStatus,
  isAccountingOpen,
  type AmountMinor,
  type CurrencyCode,
  type TreasuryLedgerRow,
  type TreasurySourceInput,
  type TreasuryStatusResult,
} from '../engine/treasury';
import { isDayClosed, localDate } from '../engine/time';
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

export interface TreasurySummary {
  treasury: TreasuryRow | null;
  sources: TreasurySourceRow[];
  todaySpending: DailySpendingRow | null;
  todayLocalDate: string;
  remainingDays: number;
  spendableMinor: AmountMinor;
  allowanceMinor: AmountMinor | null;
  statusResult: TreasuryStatusResult;
  isAccountingOpen: boolean;
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
      statusResult: { status: 'LOCKED' },
      isAccountingOpen: false,
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
    createdAtLocalDate: localDate(s.created_at, tz),
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

  const wallClock = new Date(now).toLocaleTimeString('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const [hhStr, mmStr] = wallClock.split(':');
  const minutesOfDay = Number(hhStr ?? 0) * 60 + Number(mmStr ?? 0);
  const dayClosed = isDayClosed(now, config);
  const open = isAccountingOpen(minutesOfDay, dayClosed, treasury.accounting_open_hour);

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
    isAccountingOpen: open,
    isDayClosed: dayClosed,
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
    isAccountingOpen: open,
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
    createdAtLocalDate: localDate(s.created_at, tz),
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
    openHour: treasury.accounting_open_hour,
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
