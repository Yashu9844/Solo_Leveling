import type { EngineConfig } from './types';

/**
 * Pure. XP required to advance from level n to n+1.
 * req(n) = round_10( base + coefficient * n^exponent )
 * TODO: Slice 3
 */
export function req(n: number, config: EngineConfig): number {
  throw new Error('Not implemented — Slice 3');
}

/**
 * Pure. Resolves total XP into a level, XP into the current level, and
 * XP needed for the next level. Handles multi-level-up in one grant.
 * TODO: Slice 3
 */
export function levelFor(
  totalXp: number,
  config: EngineConfig
): { level: number; xpIntoLevel: number; xpForNext: number } {
  throw new Error('Not implemented — Slice 3');
}
