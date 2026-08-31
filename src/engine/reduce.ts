import type { EngineConfig, EngineState, SystemEvent } from './types';

/**
 * Pure. Replays the event log into the full derived state. Deterministic:
 * applyEvents(log) twice yields identical state, and a duplicate idem_key
 * in the log is a no-op.
 *
 * Phase 0 exception: the empty-log case is implemented (per
 * final/08-testing-slices-scope.md Slice 0's "applyEvents([]) returns a
 * valid empty state" acceptance criterion) since it is the identity case,
 * not domain logic — no XP, quest, level, or streak is computed here.
 * Every non-empty log still throws until Slice 2 implements the reducer.
 * TODO: Slice 2
 */
export function applyEvents(events: SystemEvent[], config: EngineConfig): EngineState {
  if (events.length === 0) {
    return emptyEngineState();
  }
  throw new Error('Not implemented — Slice 2');
}

function emptyEngineState(): EngineState {
  return {
    player: {
      total_xp: 0,
      level: 1,
      xp_into_level: 0,
      xp_for_next: 0, // placeholder until level.ts (Slice 3) computes req(1)
      rank: 'E',
      rank_since_day: 0,
      arc_streak: 0,
      consistency_7: 0,
      consistency_28: 0,
      grace_remaining: 0,
      schema_v: 1,
    },
    days: {},
    quests: [],
  };
}
