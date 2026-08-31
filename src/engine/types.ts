// Pure type definitions for the domain engine. No logic lives here.
// Mirrors the data model in final/07-data-model-architecture.md §4.

/**
 * The complete V1 event catalogue (final/07 §4.1).
 * NOTE: the spec prose says "27 types" but the literal list enumerates 30 —
 * flagged as a spec discrepancy in the Phase 0 report. All 30 are modelled.
 */
export type EventType =
  | 'ARC_STARTED'
  | 'ARC_PAUSED'
  | 'ARC_RESUMED'
  | 'ARC_AMENDED'
  | 'QUEST_COMPLETED'
  | 'QUEST_UNDONE'
  | 'QUEST_RECOVERED'
  | 'APPLICATION_LOGGED'
  | 'CAREER_SUBSTITUTE_LOGGED'
  | 'CAREER_EVENT_LOGGED'
  | 'RESUME_VERSION_CREATED'
  | 'FOLLOWUP_LOGGED'
  | 'PROBLEM_LOGGED'
  | 'PROBLEM_REVISITED'
  | 'LEARNING_BLOCK_LOGGED'
  | 'SYSTEM_DESIGN_LOGGED'
  | 'BUILD_SESSION_LOGGED'
  | 'ARTIFACT_SHIPPED'
  | 'TRAINING_SESSION_LOGGED'
  | 'STEPS_LOGGED'
  | 'METRIC_RECORDED'
  | 'SLEEP_LOGGED'
  | 'SCREENTIME_LOGGED'
  | 'MAINTENANCE_LOGGED'
  | 'REVIEW_COMPLETED'
  | 'WEEK_REVIEWED'
  | 'CHECKPOINT_SEALED'
  | 'BOSS_CLEARED'
  | 'PLAN_AMENDED'
  | 'APP_OPENED';

export type EventSource = 'user' | 'system' | 'import' | 'rule';

/** The immutable, append-only unit of truth. final/07 §4.1. */
export interface SystemEvent<TPayload = Record<string, unknown>> {
  id: string; // uuidv7
  type: EventType;
  occurred_at: string; // ISO-8601 UTC instant — authoritative timestamp
  local_date: string; // YYYY-MM-DD, computed at write time, never recomputed
  arc_id: string;
  payload: TPayload;
  source: EventSource;
  idem_key: string;
  schema_v: number;
}

export type XpCategory =
  | 'CAREER'
  | 'MIND'
  | 'CRAFT'
  | 'BODY'
  | 'SLEEP'
  | 'ATTENTION'
  | 'LEARN'
  | 'MAINT'
  | 'BONUS'
  | 'BOSS';

/** A single XP grant produced by computeXp for one event. Amount is always >= 0. */
export interface XpGrant {
  category: XpCategory;
  amount: number;
  reason: string; // e.g. "core:career" | "bonus:problem:M"
  capped_from?: number; // pre-cap amount, if a cap trimmed this grant
}

export type CoreQuestKey = 'career' | 'dsa' | 'build' | 'training' | 'sleep' | 'attention';
export type QuestKey = CoreQuestKey | 'maintenance' | (string & {});

export type QuestType = 'core' | 'weekly' | 'adaptive' | 'recovery' | 'revisit' | 'boss' | 'side';

export type QuestInstanceState =
  | 'available'
  | 'in_progress'
  | 'complete'
  | 'incomplete'
  | 'recoverable'
  | 'expired';

export interface QuestState {
  id: string;
  template_id: string;
  local_date: string;
  state: QuestInstanceState;
  progress: Record<string, unknown>;
  completed_at?: string;
  recovered: boolean;
}

/** Rolling per-day accumulator the XP engine consults to apply caps. */
export interface DayState {
  local_date: string;
  category_totals: Record<XpCategory, number>;
  daily_total: number;
  quests_completed: QuestKey[];
  mvd_met: boolean;
  day_closed: boolean; // true from day_close_hour until the next boundary
}

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export type Attribute =
  | 'DISCIPLINE'
  | 'DEPTH'
  | 'PROBLEM_SOLVING'
  | 'ENGINEERING'
  | 'MOMENTUM'
  | 'VITALITY';

export interface PlayerState {
  total_xp: number;
  level: number;
  xp_into_level: number;
  xp_for_next: number;
  rank: Rank;
  rank_since_day: number;
  arc_streak: number;
  consistency_7: number;
  consistency_28: number;
  grace_remaining: number;
  schema_v: number;
}

export type MasteryState = 'unseen' | 'introduced' | 'applied' | 'fluent' | 'retained';

/** All tunable constants. Nothing is hard-coded outside engine/config.ts. */
export interface EngineConfig {
  arc: {
    timezone: string;
    dayBoundaryHour: number;
    dayCloseHour: number;
    startDate: string;
    endDate: string;
  };
  coreQuests: Record<CoreQuestKey, { xp: number; category: XpCategory }>;
  // BONUS (weekly payout, recovery) and BOSS grants are frequency-limited,
  // not volume-limited, and are exempt from both category caps and the
  // daily cap — final/01 §2.1.1. This is a specified exemption, not an
  // omission: do not add entries for them here.
  categoryCaps: Record<Exclude<XpCategory, 'BONUS' | 'BOSS'>, number>;
  dailyCap: number;
  mvdXp: number;
  recoveryXp: number;
  bossXp: number;
  level: { base: number; coefficient: number; exponent: number; roundTo: number };
  streak: {
    graceDaysPer28: number;
    reducedModeTriggerMisses: number;
    reducedModeExitDays: number;
  };
  attributes: { windowDays: number };
  srs: {
    firstAttemptIntervals: number[];
    hint: number;
    editorial: number;
    unsolved: number;
    maxRevisitsPerDay: number;
    retainedMinGapDays: number;
  };
}

/** The clock and id generator are always injected — never read ambiently. */
export interface EngineDeps {
  now: () => string; // ISO UTC instant
  newId: () => string; // uuidv7
}

/** An "at [time] at [place] I will [first_action]" if-then sentence. final/06 §5.1 step 5. */
export interface ImplementationIntention {
  time: string; // "HH:mm"
  place: string;
  first_action: string;
}

/** Pure output of generateCoreQuestTemplates — mirrors db/schema.ts's QuestTemplateRow. */
export interface QuestTemplate {
  id: string;
  arc_id: string;
  type: QuestType;
  key: CoreQuestKey;
  title: string;
  category: XpCategory;
  xp: number;
  criterion: Record<string, unknown>;
  implementation_intention?: ImplementationIntention;
  active_from: string;
  active_to: string | null;
  locked_until_checkpoint: boolean;
}

/** Derived arc state folded from ARC_STARTED. final/07 §4.2. */
export interface ArcState {
  id: string;
  start_date: string;
  end_date: string;
  timezone: string;
  day_boundary_hour: number;
  day_close_hour: number;
  main_quest_text: string;
  stake_text?: string;
  status: 'active' | 'paused' | 'complete';
}

export interface ArcStartedPayload {
  arcId: string;
  startDate: string;
  endDate: string;
  timezone: string;
  dayBoundaryHour: number;
  dayCloseHour: number;
  mainQuestText: string;
  stakeText?: string;
}

export interface PlanAmendedPayload {
  questKey: CoreQuestKey;
  implementationIntention: ImplementationIntention;
}

export interface MetricRecordedPayload {
  kind: string;
  value: number;
  unit: string;
}

/** The full derived state produced by replaying the event log. reduce.ts */
export interface EngineState {
  player: PlayerState;
  days: Record<string, DayState>; // keyed by local_date
  quests: QuestState[];
  arc: ArcState | null;
}
