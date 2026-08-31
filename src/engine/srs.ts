import type { EngineConfig } from './types';

export type AttemptOutcome = 'first_attempt' | 'hint' | 'editorial' | 'unsolved';

export interface ReviewHistoryEntry {
  local_date: string;
  outcome: AttemptOutcome;
}

/**
 * Pure. Computes the next review date for a problem given its outcome and
 * prior review history. First-attempt success advances through
 * [3, 10, 30, 90]-day intervals; hint/editorial/unsolved reset or shorten
 * the interval. Capped at maxRevisitsPerDay with oldest-first rollover
 * handled by the caller.
 * TODO: Slice 7
 */
export function nextReview(
  outcome: AttemptOutcome,
  history: ReviewHistoryEntry[],
  config: EngineConfig['srs']
): string {
  throw new Error('Not implemented — Slice 7');
}
