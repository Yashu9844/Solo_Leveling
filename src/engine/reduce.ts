import type { ArcStartedPayload, EngineConfig, EngineState, SystemEvent } from './types';

/**
 * Pure. Replays the event log into the full derived state. Deterministic:
 * applyEvents(log) twice yields identical state, and a duplicate idem_key
 * in the log is a no-op (tracked and skipped during the fold, mirroring
 * the db-level idem_key uniqueness guarantee in db/events.ts).
 *
 * The empty-log case returning the empty base state is specified
 * behaviour (final/08 Slice 0 acceptance criteria), not a compromise —
 * it is simply what folding zero events over the identity state produces.
 *
 * Slice 1: folds ARC_STARTED only. Every other event type still throws —
 * deliberately no permissive default case, so an unhandled event type
 * fails loudly for the rest of the build rather than being silently
 * dropped.
 * TODO: Slice 2 (QUEST_COMPLETED / QUEST_UNDONE), Slice 3 (XP-bearing
 * events), and so on — each slice adds its event types here.
 */
export function applyEvents(events: SystemEvent[], config: EngineConfig): EngineState {
  let state = emptyEngineState();
  const seenIdemKeys = new Set<string>();

  for (const event of events) {
    if (seenIdemKeys.has(event.idem_key)) {
      continue;
    }
    seenIdemKeys.add(event.idem_key);
    state = applyOne(state, event, config);
  }

  return state;
}

function applyOne(state: EngineState, event: SystemEvent, config: EngineConfig): EngineState {
  switch (event.type) {
    case 'ARC_STARTED': {
      const payload = event.payload as unknown as ArcStartedPayload;
      return {
        ...state,
        arc: {
          id: payload.arcId,
          start_date: payload.startDate,
          end_date: payload.endDate,
          timezone: payload.timezone,
          day_boundary_hour: payload.dayBoundaryHour,
          day_close_hour: payload.dayCloseHour,
          main_quest_text: payload.mainQuestText,
          stake_text: payload.stakeText,
          status: 'active',
        },
      };
    }
    default:
      throw new Error(`Not implemented — Slice N (unhandled event type: ${event.type})`);
  }
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
    arc: null,
  };
}
