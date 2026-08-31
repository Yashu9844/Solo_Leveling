import type { EngineConfig } from './types';

export interface DayOutcome {
  local_date: string;
  mvd_met: boolean;
  paused: boolean;
}

export interface StreakResult {
  arc_streak: number;
  grace_remaining: number;
  grace_used_this_cycle: number;
  reduced_mode: boolean;
}

/**
 * Pure. Derives the arc streak from a day-by-day history, applying up to
 * `graceDaysPer28` grace days automatically per rolling 28-day window, and
 * entering/exiting Reduced Mode on consecutive misses.
 * TODO: Slice 4
 */
export function streakFrom(days: DayOutcome[], config: EngineConfig['streak']): StreakResult {
  throw new Error('Not implemented — Slice 4');
}
