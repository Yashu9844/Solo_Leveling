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

export interface QuestInstance {
  id: string;
  template_id: string;
  local_date: string;
  state: QuestInstanceState;
  progress: Record<string, unknown>;
  completed_at?: string;
  recovered: boolean;
}

/**
 * Rolling per-day accumulator the XP engine consults to apply caps.
 * BONUS/BOSS are exempt from caps (final/01 §2.1.1) and so are never
 * accumulated here — same exclusion as EngineConfig.categoryCaps.
 */
export interface DayState {
  local_date: string;
  category_totals: Record<Exclude<XpCategory, 'BONUS' | 'BOSS'>, number>;
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

/** Derived arc state folded from ARC_STARTED (and ARC_PAUSED/ARC_RESUMED
 * — Slice 4). final/07 §4.2. */
export interface ArcState {
  id: string;
  start_date: string;
  end_date: string; // shifts forward on ARC_PAUSED — final/01 §6.5
  timezone: string;
  day_boundary_hour: number;
  day_close_hour: number;
  main_quest_text: string;
  stake_text?: string;
  status: 'active' | 'paused' | 'complete';
  // Every local_date currently covered by an active or historical pause.
  // A set, not a single "paused_until" pointer, so an early ARC_RESUMED
  // can un-pause future planned days without losing the historical record
  // of which past days were genuinely paused (needed for streak/MVD
  // history — a paused day is neutral, not a miss, forever after).
  paused_dates: string[];
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

export interface QuestCompletedPayload {
  instanceId: string;
  templateId: string;
  questKey: CoreQuestKey;
  localDate: string;
}

export interface QuestUndonePayload {
  instanceId: string;
  localDate: string;
}

/** Pause commits to a duration upfront (final/01 §6.5: "one tap, up to 7
 * days") — `days` covers `localDate` through `localDate + days - 1`
 * inclusive, and the arc's end_date shifts forward by `days` immediately. */
export interface ArcPausedPayload {
  localDate: string;
  days: number; // 1-7
}

/** Ends a pause early. Days from `localDate` onward are active again;
 * days before it stay marked paused in history. Does not claw back the
 * end_date shift from the original ARC_PAUSED — see engine/reduce.ts. */
export interface ArcResumedPayload {
  localDate: string;
}

/** Recovery quest claim — final/01 §6.3, §2.1.1: BONUS category, flat
 * 40 XP (config.recoveryXp), exempt from caps, max 1 per day. `reason`
 * is the optional post-lapse diagnostic tap; deferred to a later slice
 * (its only consumer, the weekly review's 3x-in-14-days detector,
 * doesn't exist yet) — the field is modelled so a future slice doesn't
 * need a payload migration, but nothing currently sets it. */
export interface QuestRecoveredPayload {
  localDate: string; // the missed day being recovered, not today
  reason?: 'ran_out_of_time' | 'too_tired' | 'wrong_time' | 'didnt_want_to';
}

/** What got in the way of today, if anything — final/05 §5's evening
 * review chip row. 'nothing' is its own value (not "no answer"): the
 * review always requires picking one, even on a full day. */
export type ReviewBlocker = 'time' | 'tired' | 'wrong_time' | 'didnt_want_to' | 'nothing';

/**
 * The evening review — final/05 §5, 25 seconds, 5 taps, no typing.
 * energy/focus are 1-5 (the wireframe's 5-dot rows). sleptAt is a plain
 * "HH:mm" capture, not a full SLEEP_LOGGED event — real sleep-window
 * tracking (wake SD, the sleep quest's criterion) is Slice 9's domain;
 * this is just what the review screen collects today.
 */
export interface ReviewCompletedPayload {
  localDate: string;
  energy: number; // 1-5
  focus: number; // 1-5
  blocker: ReviewBlocker;
  tomorrowPriority?: CoreQuestKey;
  sleptAt?: string; // "HH:mm"
}

// final/02-career-system.md §1 — CONTROLLED (these five payload types)
// vs EXTERNAL (CareerEventLoggedPayload's response/call/interview/onsite/
// offer/rejection kinds only). Only CONTROLLED events ever appear in a
// QUEST_COMPLETED payload's lineage; nothing here grants XP directly —
// see engine/xp.ts and store/career.ts for how logging feeds completion.

export interface ApplicationLoggedPayload {
  applicationId: string;
  company: string;
  role: string;
  roleCategory: string;
  source: string;
  resumeVersionId: string;
  whyLine: string;
  qualityPass: boolean;
}

export interface CareerSubstituteLoggedPayload {
  minutes: number;
  kind: 'resume_iteration' | 'followups' | 'networking' | 'portfolio' | 'writeup' | 'mock';
}

/** kind's first six values are EXTERNAL (final/02 §1) — never XP, never a
 * rank gate. conversation/mock/followup are CONTROLLED substitute work,
 * logged the same way for a single audit trail (final/02 §2.2). */
export type CareerEventKind =
  | 'response'
  | 'call'
  | 'interview'
  | 'onsite'
  | 'offer'
  | 'rejection'
  | 'conversation'
  | 'mock'
  | 'followup';

export interface CareerEventLoggedPayload {
  kind: CareerEventKind;
  applicationId?: string;
  company?: string;
  stuckOn?: string;
}

export interface ResumeVersionCreatedPayload {
  resumeVersionId: string;
  label: string;
  changedBecause: string;
  externalReview?: boolean;
}

export interface FollowupLoggedPayload {
  applicationId: string;
}

/**
 * A completion recorded purely from the event log. There is no
 * "instance created" event in the V1 catalogue (final/07 §4.1) — quest
 * instances are a generated projection (see engine/quests.ts's
 * generateQuests), not event-sourced. So reduce.ts cannot hold instance
 * objects; it holds this overlay instead, keyed by instance id, and the
 * store layer merges it onto freshly generated 'available' instances.
 * QUEST_UNDONE deletes the corresponding entry rather than storing a
 * separate "undone" record — undone means "no overlay," i.e. available.
 */
export interface QuestCompletionRecord {
  instance_id: string;
  template_id: string;
  quest_key: CoreQuestKey;
  local_date: string;
  completed_at: string;
  // The QUEST_COMPLETED event's own id — lets db/projections.ts link a
  // rebuilt ledger row back to its source event without re-scanning the
  // log for it.
  event_id: string;
}

/** The full derived state produced by replaying the event log. reduce.ts */
export interface EngineState {
  player: PlayerState;
  days: Record<string, DayState>; // keyed by local_date
  quests: Record<string, QuestCompletionRecord>; // keyed by instance id
  // Latest PLAN_AMENDED per quest key — see QuestCompletionRecord's note:
  // there is no template object in EngineState to "attach" an intention
  // to (templates aren't event-sourced either), so this tracks the same
  // information the way reduce.ts actually can.
  intentions: Partial<Record<CoreQuestKey, ImplementationIntention>>;
  baselineMetrics: Record<string, number>; // kind -> value, from METRIC_RECORDED
  // Days with a claimed recovery quest, keyed by the recovered local_date
  // (not the claim date) — QUEST_RECOVERED's idem_key already enforces
  // max-1-per-day, so a Set-like presence check is all this needs to be.
  recoveries: Record<string, true>;
  // Completed evening reviews, keyed by local_date — same presence-check
  // shape as recoveries, gates re-showing the review for an already-
  // reviewed day and carries the payload for the daily report.
  reviews: Record<string, ReviewCompletedPayload>;
  arc: ArcState | null;
}
