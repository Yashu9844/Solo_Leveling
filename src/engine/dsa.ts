import type { MasteryState } from './types';

export interface DsaAttemptFixture {
  problem_id: string;
  topic: string;
  difficulty: 'E' | 'M' | 'H';
  local_date: string;
  outcome: 'first_attempt' | 'hint' | 'editorial' | 'unsolved';
  is_revisit: boolean;
}

/**
 * Pure. Weighted problem volume over a window: E x1, M x2, H x3.5.
 * TODO: Slice 7
 */
export function weightedVolume(attempts: DsaAttemptFixture[]): number {
  throw new Error('Not implemented — Slice 7');
}

/**
 * Pure. Derives a topic's mastery state from its attempt history.
 * Retained requires a >= 21-day gap since the prior Fluent evidence.
 * TODO: Slice 7
 */
export function masteryFor(topic: string, attempts: DsaAttemptFixture[]): MasteryState {
  throw new Error('Not implemented — Slice 7');
}
