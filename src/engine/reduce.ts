import type {
  ArcStartedPayload,
  EngineConfig,
  EngineState,
  MetricRecordedPayload,
  PlanAmendedPayload,
  QuestCompletedPayload,
  QuestUndonePayload,
  SystemEvent,
} from './types';

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
 * Every unhandled event type still throws — deliberately no permissive
 * default case, so an unhandled event type fails loudly for the rest of
 * the build rather than being silently dropped.
 * TODO: Slice 3 (XP-bearing events) and beyond — each slice adds its
 * event types here.
 */
export function applyEvents(events: SystemEvent[], config: EngineConfig): EngineState {
  // Not read by any branch yet — no event handled so far needs a cap,
  // a category, or a day boundary. Kept in the public signature because
  // Slice 3's XP-bearing events will need it immediately.
  void config;

  let state = emptyEngineState();
  const seenIdemKeys = new Set<string>();

  for (const event of events) {
    if (seenIdemKeys.has(event.idem_key)) {
      continue;
    }
    seenIdemKeys.add(event.idem_key);
    state = applyOne(state, event);
  }

  return state;
}

function applyOne(state: EngineState, event: SystemEvent): EngineState {
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

    case 'PLAN_AMENDED': {
      // There is no template object in EngineState to "attach" this to
      // (templates aren't event-sourced — see QuestCompletionRecord's
      // doc comment in types.ts) — so the latest intention per quest key
      // is tracked directly. A later PLAN_AMENDED for the same key
      // replaces the earlier one, which is the "amend" in its name.
      const payload = event.payload as unknown as PlanAmendedPayload;
      return {
        ...state,
        intentions: { ...state.intentions, [payload.questKey]: payload.implementationIntention },
      };
    }

    case 'METRIC_RECORDED': {
      const payload = event.payload as unknown as MetricRecordedPayload;
      return {
        ...state,
        baselineMetrics: { ...state.baselineMetrics, [payload.kind]: payload.value },
      };
    }

    case 'QUEST_COMPLETED': {
      const payload = event.payload as unknown as QuestCompletedPayload;
      return {
        ...state,
        quests: {
          ...state.quests,
          [payload.instanceId]: {
            instance_id: payload.instanceId,
            template_id: payload.templateId,
            local_date: payload.localDate,
            completed_at: event.occurred_at,
          },
        },
      };
    }

    case 'QUEST_UNDONE': {
      // Undone means "no completion overlay," i.e. back to available —
      // so this deletes the entry rather than recording an "undone" state.
      const payload = event.payload as unknown as QuestUndonePayload;
      const quests = Object.fromEntries(
        Object.entries(state.quests).filter(([instanceId]) => instanceId !== payload.instanceId)
      );
      return { ...state, quests };
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
    quests: {},
    intentions: {},
    baselineMetrics: {},
    arc: null,
  };
}
