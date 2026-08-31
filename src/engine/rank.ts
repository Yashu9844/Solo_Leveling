import type { Rank } from './types';

export interface Checkpoint {
  day: 0 | 14 | 30 | 60 | 90 | 120;
}

export interface GateEvidence {
  [key: string]: number | boolean | string;
}

export interface GateResult {
  rank: Rank;
  conditions: { label: string; met: boolean }[];
}

/**
 * Pure. Evaluates the rank gates for the given checkpoint against evidence
 * derived entirely from controllable, externally verifiable facts. Never
 * references an external outcome (recruiter response, interview, offer).
 * Rank never regresses.
 * TODO: Slice 12
 */
export function evaluateGates(checkpoint: Checkpoint, evidence: GateEvidence): GateResult {
  throw new Error('Not implemented — Slice 12');
}
