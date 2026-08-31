import type { SystemEvent, DayState, EngineConfig, XpGrant } from './types';

/**
 * Pure. Computes XP grants for an event given the day's state so far.
 * Applies category caps then the daily cap. Never returns a negative amount.
 * TODO: Slice 3
 */
export function computeXp(
  event: SystemEvent,
  dayState: DayState,
  config: EngineConfig
): XpGrant[] {
  throw new Error('Not implemented — Slice 3');
}
