// Slice 3's structural fix: quest_template, quest_instance and xp_ledger
// are now CACHES, fully derivable from the event log alone — the event
// log is the only source of truth (final/07 §5, §6). This is what makes
// an export-wipe-import backup complete, and what verifyIntegrity() has
// something real to diff against.
//
// generateCoreQuestTemplates and generateQuests derive stable, composite-
// key ids (not deps.newId()) specifically so a rebuild reproduces the
// exact ids that QUEST_COMPLETED/QUEST_UNDONE events already reference —
// see the doc comments on both in engine/quests.ts.
import type { EngineConfig, EngineDeps, QuestInstance, SystemEvent } from '../engine/types';
import { applyEvents } from '../engine/reduce';
import { generateCoreQuestTemplates, generateQuests } from '../engine/quests';
import { computeDayLedger, type DayCompletion } from '../engine/xp';
import { db } from './db';
import { getAllEvents } from './events';
import type { QuestInstanceRow, QuestTemplateRow, XpLedgerRow } from './schema';

interface BuiltProjections {
  templates: QuestTemplateRow[];
  instances: QuestInstanceRow[];
  ledger: XpLedgerRow[];
}

/**
 * Pure assembly: event log -> the three cache tables' rows, in memory.
 * The single place both rebuildProjections (writes them) and
 * verifyIntegrity (diffs them against the live tables) do this — one
 * implementation, so they can never quietly diverge from each other.
 */
function buildProjections(events: SystemEvent[], config: EngineConfig, deps: EngineDeps): BuiltProjections {
  const state = applyEvents(events, config);
  if (!state.arc) {
    return { templates: [], instances: [], ledger: [] };
  }
  const arc = state.arc;

  const templates = generateCoreQuestTemplates(arc.id, state.intentions, config, deps);

  // "Was this day opened" is a recorded fact (APP_OPENED), not an
  // inference from whichever instance rows happen to exist in a cache.
  const appOpenedDates = new Set<string>();
  for (const event of events) {
    if (event.type === 'APP_OPENED' && event.local_date >= arc.start_date && event.local_date <= arc.end_date) {
      appOpenedDates.add(event.local_date);
    }
  }

  let instances: QuestInstance[] = [];
  for (const localDate of [...appOpenedDates].sort()) {
    instances = instances.concat(generateQuests(localDate, templates, [], config, deps));
  }
  instances = instances.map((instance) => {
    const record = state.quests[instance.id];
    if (!record) return instance;
    return { ...instance, state: 'complete' as const, completed_at: record.completed_at };
  });

  const completionsByDate = new Map<string, DayCompletion[]>();
  const eventIdByInstance = new Map<string, string>();
  for (const record of Object.values(state.quests)) {
    eventIdByInstance.set(record.instance_id, record.event_id);
    const list = completionsByDate.get(record.local_date) ?? [];
    list.push({
      instanceId: record.instance_id,
      templateId: record.template_id,
      questKey: record.quest_key,
      completedAt: record.completed_at,
    });
    completionsByDate.set(record.local_date, list);
  }

  const ledger: XpLedgerRow[] = [];
  for (const [localDate, completions] of completionsByDate) {
    const entries = computeDayLedger(localDate, completions, config);
    for (const entry of entries) {
      ledger.push({
        id: `${entry.instanceId}::xp`,
        event_id: eventIdByInstance.get(entry.instanceId) ?? entry.instanceId,
        instance_id: entry.instanceId,
        local_date: localDate,
        amount: entry.amount,
        category: entry.category,
        reason: entry.reason,
        capped_from: entry.cappedFrom,
      });
    }
  }

  return { templates, instances, ledger };
}

/**
 * Rebuilds every derived table from the event log alone. Wipes and
 * repopulates quest_template, quest_instance, xp_ledger. Deterministic:
 * same log + same config -> identical tables (same rows, same ids).
 */
export async function rebuildProjections(config: EngineConfig, deps: EngineDeps): Promise<void> {
  const events = await getAllEvents();
  const built = buildProjections(events, config, deps);

  await db.transaction('rw', [db.quest_template, db.quest_instance, db.xp_ledger], async () => {
    await db.quest_template.clear();
    await db.quest_instance.clear();
    await db.xp_ledger.clear();
    if (built.templates.length > 0) await db.quest_template.bulkAdd(built.templates);
    if (built.instances.length > 0) await db.quest_instance.bulkAdd(built.instances);
    if (built.ledger.length > 0) await db.xp_ledger.bulkAdd(built.ledger);
  });
}

export interface IntegrityReport {
  clean: boolean;
  discrepancies: string[];
}

/**
 * Rebuilds into memory (never touches the db) and diffs against the live
 * tables. Dev-only surface — used by projections.test.ts and the Profile
 * dev action.
 */
export async function verifyIntegrity(config: EngineConfig, deps: EngineDeps): Promise<IntegrityReport> {
  const events = await getAllEvents();
  const rebuilt = buildProjections(events, config, deps);

  const liveTemplates = await db.quest_template.toArray();
  const liveInstances = await db.quest_instance.toArray();
  const liveLedger = await db.xp_ledger.toArray();

  const discrepancies: string[] = [];
  diffById('quest_template', liveTemplates, rebuilt.templates, discrepancies);
  diffById('quest_instance', liveInstances, rebuilt.instances, discrepancies);
  diffById('xp_ledger', liveLedger, rebuilt.ledger, discrepancies);

  return { clean: discrepancies.length === 0, discrepancies };
}

function diffById<T extends { id: string }>(table: string, live: T[], rebuilt: T[], out: string[]): void {
  const liveById = new Map(live.map((row) => [row.id, row]));
  const rebuiltById = new Map(rebuilt.map((row) => [row.id, row]));

  for (const [id, row] of rebuiltById) {
    const liveRow = liveById.get(id);
    if (!liveRow) {
      out.push(`${table}: missing live row for rebuilt id ${id}`);
    } else if (JSON.stringify(liveRow) !== JSON.stringify(row)) {
      out.push(`${table}: row ${id} differs from rebuild`);
    }
  }
  for (const id of liveById.keys()) {
    if (!rebuiltById.has(id)) {
      out.push(`${table}: live row ${id} has no counterpart in the rebuild`);
    }
  }
}
