import type { SystemEvent } from './types';

export interface RuleProposal {
  rule: string;
  message: string;
  fires_on: string;
}

/**
 * Pure. Evaluates the rules engine against recent history and returns any
 * proposals that fire (e.g. learn:ship ratio > 3:1 over 14 days, or a
 * sustained sub-5% application response rate). Each rule fires exactly on
 * its stated condition — no more, no less.
 * TODO: Slice 11
 */
export function evaluateRules(history: SystemEvent[]): RuleProposal[] {
  throw new Error('Not implemented — Slice 11');
}
