// Orchestrates the live TODAY loop: reads templates + today's instances,
// generates any missing ones via the pure generateQuests, and writes
// completion/undo as an event + a direct projection update + a
// recomputed day ledger, all in one transaction — the same event+
// projection pattern as store/onboarding.ts, extended in Slice 3 to
// cover xp_ledger too.
//
// db.quest_instance and db.xp_ledger (not engine/reduce.ts's EngineState)
// are the live projections this screen reads. Slice 3 made them fully
// rebuildable from the event log (db/projections.ts) — see that file's
// header comment for why they're caches now, not a second source of
// truth. On undo, the day's ledger is fully recomputed from its current
// completions rather than deleted/negated row-by-row (the "recompute,
// never subtract" rule from the Slice 3 prompt).
import type {
  CoreQuestKey,
  EngineConfig,
  EngineDeps,
  QuestCompletedPayload,
  QuestInstance,
  QuestTemplate,
  QuestUndonePayload,
} from '../engine/types';
import { generateQuests } from '../engine/quests';
import { isDayClosed } from '../engine/time';
import { computeDayLedger, type DayCompletion } from '../engine/xp';
import { db } from '../db/db';
import { appendEvent } from '../db/events';
import type { XpLedgerRow } from '../db/schema';

export interface TodayQuests {
  templates: QuestTemplate[];
  instances: QuestInstance[];
}

/** Loads (and, if needed, generates + persists) today's 6 core quest
 * instances, and records that this local day was opened. */
export async function loadTodayQuests(
  localDate: string,
  config: EngineConfig,
  deps: EngineDeps
): Promise<TodayQuests> {
  const arc = await db.arc.toCollection().first();
  if (arc) {
    await appendEvent({
      id: deps.newId(),
      type: 'APP_OPENED',
      occurred_at: deps.now(),
      local_date: localDate,
      arc_id: arc.id,
      payload: { seconds: 0 },
      source: 'system',
      idem_key: `app-opened:${localDate}`,
      schema_v: 1,
    });
  }

  const templates = await db.quest_template.toArray();
  const existing = await db.quest_instance.where('local_date').equals(localDate).toArray();
  const instances = generateQuests(localDate, templates, existing, config, deps);

  const existingIds = new Set(existing.map((i) => i.id));
  const newInstances = instances.filter((i) => !existingIds.has(i.id));
  if (newInstances.length > 0) {
    await db.quest_instance.bulkAdd(newInstances);
  }

  return { templates, instances };
}

/** Number of prior QUEST_COMPLETED/QUEST_UNDONE events for this instance —
 * used as a monotonic idem_key suffix so a real re-completion after an
 * undo gets a fresh event, while two near-simultaneous taps of the SAME
 * toggle compute the same key and collide (the intended debounce). */
async function toggleSequence(instanceId: string): Promise<number> {
  const completed = await db.event.where('type').equals('QUEST_COMPLETED').toArray();
  const undone = await db.event.where('type').equals('QUEST_UNDONE').toArray();
  const matches = (rows: typeof completed) =>
    rows.filter((e) => (e.payload as { instanceId?: string }).instanceId === instanceId).length;
  return matches(completed) + matches(undone);
}

/** Recomputes local_date's entire xp_ledger from its current completions
 * — the mechanism for both a fresh completion and an undo. Never deletes
 * or negates a single row; always wipes-and-rewrites the whole day. */
async function recomputeDayLedger(localDate: string, config: EngineConfig): Promise<void> {
  const templates = await db.quest_template.toArray();
  const templateById = new Map(templates.map((t) => [t.id, t]));

  const dayInstances = await db.quest_instance.where('local_date').equals(localDate).toArray();
  const completedInstances = dayInstances.filter(
    (i): i is QuestInstance & { completed_at: string } => i.state === 'complete' && i.completed_at != null
  );

  const dayEvents = await db.event.where('local_date').equals(localDate).toArray();
  const questCompletedEvents = dayEvents.filter((e) => e.type === 'QUEST_COMPLETED');
  function findEventId(instanceId: string, completedAt: string): string {
    const match = questCompletedEvents.find((e) => {
      const payload = e.payload as { instanceId?: string };
      return payload.instanceId === instanceId && e.occurred_at === completedAt;
    });
    return match?.id ?? instanceId;
  }

  const completions: DayCompletion[] = completedInstances.map((i) => ({
    instanceId: i.id,
    templateId: i.template_id,
    questKey: (templateById.get(i.template_id)?.key ?? 'career') as CoreQuestKey,
    completedAt: i.completed_at,
  }));

  const entries = computeDayLedger(localDate, completions, config);
  const completedAtByInstance = new Map(completions.map((c) => [c.instanceId, c.completedAt]));

  const ledgerRows: XpLedgerRow[] = entries.map((entry) => ({
    id: `${entry.instanceId}::xp`,
    event_id: findEventId(entry.instanceId, completedAtByInstance.get(entry.instanceId) ?? ''),
    instance_id: entry.instanceId,
    local_date: localDate,
    amount: entry.amount,
    category: entry.category,
    reason: entry.reason,
    capped_from: entry.cappedFrom,
  }));

  await db.xp_ledger.where('local_date').equals(localDate).delete();
  if (ledgerRows.length > 0) {
    await db.xp_ledger.bulkAdd(ledgerRows);
  }
}

export async function completeQuest(
  instance: QuestInstance,
  templateKey: string,
  arcId: string,
  config: EngineConfig,
  deps: EngineDeps
): Promise<void> {
  const now = deps.now();
  if (isDayClosed(now, config)) {
    return;
  }

  await db.transaction(
    'rw',
    [db.event, db.quest_instance, db.quest_template, db.xp_ledger],
    async () => {
      const seq = await toggleSequence(instance.id);
      const payload: QuestCompletedPayload = {
        instanceId: instance.id,
        templateId: instance.template_id,
        questKey: templateKey as QuestCompletedPayload['questKey'],
        localDate: instance.local_date,
      };
      await appendEvent({
        id: deps.newId(),
        type: 'QUEST_COMPLETED',
        occurred_at: now,
        local_date: instance.local_date,
        arc_id: arcId,
        payload: payload as unknown as Record<string, unknown>,
        source: 'user',
        idem_key: `quest-complete:${instance.id}:${seq}`,
        schema_v: 1,
      });
      await db.quest_instance.update(instance.id, { state: 'complete', completed_at: now });
      await recomputeDayLedger(instance.local_date, config);
    }
  );
}

export async function undoQuest(
  instance: QuestInstance,
  arcId: string,
  config: EngineConfig,
  deps: EngineDeps
): Promise<void> {
  const now = deps.now();
  // Undo is allowed for the rest of the local day only, and never while
  // the day is closed (final/11 Step 5). A completed instance from a
  // prior local_date is never shown on TODAY in the first place — see
  // loadTodayQuests, which only ever reads/generates the current date.
  if (isDayClosed(now, config)) {
    return;
  }

  await db.transaction(
    'rw',
    [db.event, db.quest_instance, db.quest_template, db.xp_ledger],
    async () => {
      const seq = await toggleSequence(instance.id);
      const payload: QuestUndonePayload = { instanceId: instance.id, localDate: instance.local_date };
      await appendEvent({
        id: deps.newId(),
        type: 'QUEST_UNDONE',
        occurred_at: now,
        local_date: instance.local_date,
        arc_id: arcId,
        payload: payload as unknown as Record<string, unknown>,
        source: 'user',
        idem_key: `quest-undo:${instance.id}:${seq}`,
        schema_v: 1,
      });
      await db.quest_instance.update(instance.id, { state: 'available', completed_at: undefined });
      // XP is never earned back by deleting a row and never clawed back
      // by a negative one — recompute is the mechanism. Because this
      // instance is no longer in the completed set, its grant simply
      // doesn't appear when the day's ledger is rebuilt.
      await recomputeDayLedger(instance.local_date, config);
    }
  );
}
