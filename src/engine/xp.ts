import type {
  CoreQuestKey,
  DayState,
  EngineConfig,
  QuestCompletedPayload,
  SystemEvent,
  XpCategory,
  XpGrant,
} from './types';

/**
 * Pure. Computes XP grants for an event given the day's state so far.
 * Maps the event to a base grant, then applies the category cap and the
 * daily cap in that order. BONUS and BOSS grants are exempt from both
 * (final/01 §2.1.1) — frequency-limited, not volume-limited. Never
 * returns a negative amount or an amount above remaining headroom.
 */
export function computeXp(event: SystemEvent, dayState: DayState, config: EngineConfig): XpGrant[] {
  return baseGrantsFor(event, config).map((grant) => applyCaps(grant, dayState, config));
}

function baseGrantsFor(event: SystemEvent, config: EngineConfig): XpGrant[] {
  switch (event.type) {
    case 'QUEST_COMPLETED': {
      const payload = event.payload as unknown as QuestCompletedPayload;
      const core = config.coreQuests[payload.questKey];
      if (!core) return [];
      return [{ category: core.category, amount: core.xp, reason: `core:${payload.questKey}` }];
    }
    // Every other event type — including body METRIC_RECORDED, external
    // CAREER_EVENT_LOGGED, APP_OPENED, REVIEW_COMPLETED, and
    // CHECKPOINT_SEALED — yields no XP. final/01 §2.3.
    default:
      return [];
  }
}

function applyCaps(grant: XpGrant, dayState: DayState, config: EngineConfig): XpGrant {
  if (grant.category === 'BONUS' || grant.category === 'BOSS') {
    return grant;
  }

  const original = grant.amount;
  let amount = grant.amount;
  let cappedFrom: number | undefined;

  const categoryCap = config.categoryCaps[grant.category];
  const categorySoFar = dayState.category_totals[grant.category] ?? 0;
  const categoryHeadroom = Math.max(0, categoryCap - categorySoFar);
  if (amount > categoryHeadroom) {
    cappedFrom = original;
    amount = categoryHeadroom;
  }

  const dailyHeadroom = Math.max(0, config.dailyCap - dayState.daily_total);
  if (amount > dailyHeadroom) {
    cappedFrom = cappedFrom ?? original;
    amount = dailyHeadroom;
  }

  amount = Math.max(0, amount);
  return cappedFrom !== undefined ? { ...grant, amount, capped_from: cappedFrom } : { ...grant, amount };
}

export function emptyDayState(localDate: string): DayState {
  return {
    local_date: localDate,
    category_totals: {
      CAREER: 0,
      MIND: 0,
      CRAFT: 0,
      BODY: 0,
      SLEEP: 0,
      ATTENTION: 0,
      LEARN: 0,
      MAINT: 0,
    },
    daily_total: 0,
    quests_completed: [],
    mvd_met: false,
    day_closed: false,
  };
}

export interface DayCompletion {
  instanceId: string;
  templateId: string;
  questKey: CoreQuestKey;
  completedAt: string;
}

export interface DayLedgerEntry {
  instanceId: string;
  templateId: string;
  category: XpCategory;
  amount: number;
  reason: string;
  cappedFrom?: number;
}

/**
 * Pure. Derives a full day's XP ledger from its completions, applying
 * caps in chronological order. This is the single implementation shared
 * by the live write path (store/quests.ts recomputes one day after a
 * complete/undo) and the full rebuild (db/projections.ts) — "recompute,
 * never subtract" (see the Slice 3 prompt's note on XP and undo): there
 * is exactly one way to turn "which instances are complete" into ledger
 * rows, and both callers use it.
 */
export function computeDayLedger(localDate: string, completions: DayCompletion[], config: EngineConfig): DayLedgerEntry[] {
  const sorted = [...completions].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  let dayState = emptyDayState(localDate);
  const entries: DayLedgerEntry[] = [];

  for (const completion of sorted) {
    const syntheticEvent: SystemEvent = {
      id: completion.instanceId,
      type: 'QUEST_COMPLETED',
      occurred_at: completion.completedAt,
      local_date: localDate,
      arc_id: '',
      payload: {
        instanceId: completion.instanceId,
        templateId: completion.templateId,
        questKey: completion.questKey,
        localDate,
      } satisfies QuestCompletedPayload as unknown as Record<string, unknown>,
      source: 'user',
      idem_key: `quest-complete:${completion.instanceId}`,
      schema_v: 1,
    };

    const grants = computeXp(syntheticEvent, dayState, config);
    for (const grant of grants) {
      entries.push({
        instanceId: completion.instanceId,
        templateId: completion.templateId,
        category: grant.category,
        amount: grant.amount,
        reason: grant.reason,
        cappedFrom: grant.capped_from,
      });
      // BONUS/BOSS are exempt from caps and never accumulate here — same
      // exclusion as DayState.category_totals' type (see types.ts).
      let categoryTotals = dayState.category_totals;
      if (grant.category !== 'BONUS' && grant.category !== 'BOSS') {
        categoryTotals = {
          ...categoryTotals,
          [grant.category]: (categoryTotals[grant.category] ?? 0) + grant.amount,
        };
      }
      dayState = {
        ...dayState,
        category_totals: categoryTotals,
        daily_total: dayState.daily_total + grant.amount,
      };
    }
  }

  return entries;
}
