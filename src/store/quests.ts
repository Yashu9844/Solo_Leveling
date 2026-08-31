// Orchestrates the live TODAY loop: reads templates + today's instances,
// generates any missing ones via the pure generateQuests, and writes
// completion/undo as an event + a direct projection update in one
// transaction — the same event+projection pattern as store/onboarding.ts.
//
// db.quest_instance (not engine/reduce.ts's EngineState) is the
// authoritative live projection: there is no "instance created" event in
// the V1 catalogue, so instances can't be replayed from the event log
// alone. reduce.ts's completion overlay (engine/types.ts's
// QuestCompletionRecord) exists for replay/integrity purposes, not as
// the read path for this screen. See the Slice 2 report for the full
// reasoning.
import type { EngineConfig, EngineDeps, QuestCompletedPayload, QuestInstance, QuestTemplate, QuestUndonePayload } from '../engine/types';
import { generateQuests } from '../engine/quests';
import { isDayClosed } from '../engine/time';
import { db } from '../db/db';
import { appendEvent } from '../db/events';

export interface TodayQuests {
  templates: QuestTemplate[];
  instances: QuestInstance[];
}

/** Loads (and, if needed, generates + persists) today's 6 core quest instances. */
export async function loadTodayQuests(
  localDate: string,
  config: EngineConfig,
  deps: EngineDeps
): Promise<TodayQuests> {
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

  await db.transaction('rw', [db.event, db.quest_instance], async () => {
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
  });
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

  await db.transaction('rw', [db.event, db.quest_instance], async () => {
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
  });
}
