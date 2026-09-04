/**
 * The System Message generator — final/05 §1.1: deterministic templates,
 * ranked by specificity, highest applicable wins.
 *
 *   P1  Personal record / first occurrence
 *   P2  Trend with numbers
 *   P3  Correlation from your own data
 *   P4  Consistency fact
 *   P5  Neutral status
 *
 * P1-P3 need domain data this codebase doesn't have yet — first-attempt
 * rate, deep-work minutes, sleep-window hits, career response rates —
 * all Slice 6-9 territory. Implementing them now would mean inventing
 * numbers. This slice implements P4 (a consistency fact from real core-
 * completion history) and P5 (today's real completion count, "final/05's
 * own '4 of 6 complete' example) — both fully honest with what
 * day_rollup actually holds today. P5 is always available, so
 * selectMessage always returns something real; it never needs to fall
 * back to the reflection library (~150 authored lines, explicitly
 * "subject to your review before ship" per final/05 §1.2 — content that
 * needs the arc owner's taste, not something to bulk-generate here).
 *
 * The Phase 0 stub's signature took `state: PlayerState` and
 * `log: MessageLogEntry[]` for reflection-library cooldown bookkeeping.
 * Neither P4 nor P5 needs them (both are derived fresh from day facts
 * every time, so there's nothing to rotate or cool down) — dropped
 * rather than threaded through unused. See the Slice 5 report.
 */

export interface DayFacts {
  local_date: string;
  core_completed: number;
  core_total: number;
}

export interface MessageContext {
  today: DayFacts;
  /** Chronological, most recent last, NOT including today. */
  trailingDays: DayFacts[];
}

const CONSISTENCY_WINDOW = 14;
const CONSISTENCY_MIN_HISTORY = 7; // "3 of 3 days" reads as noise, not a fact

/** Pure. Selects the best-available System Message for the given
 * context — P4 if there's enough history to say something real, else
 * the always-available P5. */
export function selectMessage(context: MessageContext): string {
  return consistencyFact(context) ?? neutralStatus(context);
}

function consistencyFact(context: MessageContext): string | null {
  const window = context.trailingDays.slice(-CONSISTENCY_WINDOW);
  if (window.length < CONSISTENCY_MIN_HISTORY) return null;

  const fullDays = window.filter((d) => d.core_total > 0 && d.core_completed === d.core_total).length;
  return `${fullDays} of the last ${window.length} days were fully complete.`;
}

function neutralStatus(context: MessageContext): string {
  return `${context.today.core_completed} of ${context.today.core_total} complete.`;
}
