// Pure voice selection for Money Discipline (Treasury).
// Follows design/08-MONEY-DISCIPLINE-PLAN.md §13.
// Pure functions, no I/O, no Dexie.

import {
  TREASURY_MESSAGES,
  type TreasuryCondition,
  type TreasuryMessage,
} from './treasuryVoicePack';

export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Selects a deterministic Treasury message for the given condition and localDate.
 * Uses fnv1a hash to cycle through variants across days deterministically.
 */
export function selectTreasuryMessage(
  condition: TreasuryCondition,
  localDateStr: string,
  messages: TreasuryMessage[] = TREASURY_MESSAGES
): TreasuryMessage {
  const pool = messages.filter((m) => m.condition === condition);
  if (pool.length === 0) {
    // Fallback if pool is empty
    return {
      id: `fallback-${condition}`,
      text: `TREASURY STATUS: ${condition}`,
      condition,
      tone: 'neutral',
    };
  }

  const seed = `${localDateStr}:${condition}`;
  const winner = pool.reduce((best, candidate) => {
    return fnv1a(seed + candidate.id) < fnv1a(seed + best.id) ? candidate : best;
  });

  return winner;
}
