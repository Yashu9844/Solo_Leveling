import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/db';
import { appendEvent } from '../../src/db/events';
import { initialiseArc, type OnboardingInput } from '../../src/store/onboarding';
import { loadTodayQuests, completeQuest, undoQuest } from '../../src/store/quests';
import { rebuildProjections, verifyIntegrity } from '../../src/db/projections';
import { DEFAULT_CONFIG } from '../../src/engine/config';
import type { ArcStartedPayload, EngineDeps } from '../../src/engine/types';

function seededDeps(prefix = 'id'): EngineDeps {
  let counter = 0;
  let clockMs = Date.parse('2026-09-05T10:00:00Z');
  return {
    now: () => {
      const iso = new Date(clockMs).toISOString();
      clockMs += 1000;
      return iso;
    },
    newId: () => `${prefix}-${counter++}`,
  };
}

async function clearAll() {
  await db.event.clear();
  await db.arc.clear();
  await db.quest_template.clear();
  await db.quest_instance.clear();
  await db.xp_ledger.clear();
  await db.checkpoint.clear();
  await db.profile.clear();
}

function sortById<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

async function snapshot() {
  return {
    templates: sortById(await db.quest_template.toArray()),
    instances: sortById(await db.quest_instance.toArray()),
    ledger: sortById(await db.xp_ledger.toArray()),
  };
}

const ONBOARDING_INPUT: Omit<OnboardingInput, 'intentions' | 'baseline'> = {
  name: 'Test',
  startDate: DEFAULT_CONFIG.arc.startDate,
  endDate: DEFAULT_CONFIG.arc.endDate,
  timezone: DEFAULT_CONFIG.arc.timezone,
  dayBoundaryHour: DEFAULT_CONFIG.arc.dayBoundaryHour,
  dayCloseHour: DEFAULT_CONFIG.arc.dayCloseHour,
  wakeTime: '08:30',
  sleepTime: '02:00',
  trainingDays: [],
  stepsTarget: 8000,
  screenCapMinutes: 60,
  attentionApps: [],
  mainQuestText: 'Ship it.',
};

async function buildLiveArcWithActivity(deps: EngineDeps) {
  await initialiseArc(
    {
      ...ONBOARDING_INPUT,
      intentions: {
        career: { time: '08:35', place: 'desk', first_action: 'apply' },
        dsa: { time: '22:00', place: 'desk', first_action: 'solve' },
        training: { time: '20:15', place: 'gym', first_action: 'lift' },
      },
      baseline: { heightCm: 178, weightKg: 72 },
    },
    DEFAULT_CONFIG,
    deps
  );

  const day1 = '2026-09-05';
  const { instances } = await loadTodayQuests(day1, DEFAULT_CONFIG, deps);
  const arc = (await db.arc.toCollection().first())!;
  const templates = await db.quest_template.toArray();
  const byKey = (key: string) =>
    instances.find((i) => templates.find((t) => t.id === i.template_id)?.key === key)!;

  const careerInstance = byKey('career');
  const dsaInstance = byKey('dsa');
  const buildInstance = byKey('build');

  // A completion, a completion that's later undone (net: no XP, no
  // ledger row), and a completion that stays — exercises the full
  // complete/undo lifecycle the rebuild has to reproduce exactly.
  await completeQuest(careerInstance, 'career', arc.id, DEFAULT_CONFIG, deps);
  await completeQuest(dsaInstance, 'dsa', arc.id, DEFAULT_CONFIG, deps);
  await undoQuest(dsaInstance, arc.id, DEFAULT_CONFIG, deps);
  await completeQuest(buildInstance, 'build', arc.id, DEFAULT_CONFIG, deps);

  return { arc, day1 };
}

describe('db/projections — rebuild (Slice 3 Step 0)', () => {
  beforeEach(clearAll);

  it('full log -> rebuildProjections -> tables match the live tables exactly', async () => {
    const deps = seededDeps();
    await buildLiveArcWithActivity(deps);
    const live = await snapshot();

    await rebuildProjections(DEFAULT_CONFIG, deps);
    const rebuilt = await snapshot();

    expect(rebuilt).toEqual(live);
  });

  it('wipe quest_template + quest_instance + xp_ledger -> rebuild -> identical state', async () => {
    const deps = seededDeps();
    await buildLiveArcWithActivity(deps);
    const before = await snapshot();

    await db.quest_template.clear();
    await db.quest_instance.clear();
    await db.xp_ledger.clear();

    await rebuildProjections(DEFAULT_CONFIG, deps);
    expect(await snapshot()).toEqual(before);
  });

  it('rebuild twice -> deep-equal (determinism)', async () => {
    const deps = seededDeps();
    await buildLiveArcWithActivity(deps);

    await rebuildProjections(DEFAULT_CONFIG, deps);
    const first = await snapshot();

    await rebuildProjections(DEFAULT_CONFIG, deps);
    const second = await snapshot();

    expect(second).toEqual(first);
  });

  it('instance ids are stable across rebuilds', async () => {
    const deps = seededDeps();
    await buildLiveArcWithActivity(deps);
    const liveIds = (await db.quest_instance.toArray()).map((i) => i.id).sort();

    await rebuildProjections(DEFAULT_CONFIG, deps);
    const rebuiltIds = (await db.quest_instance.toArray()).map((i) => i.id).sort();

    expect(rebuiltIds).toEqual(liveIds);
    // Composite-key derivation, not deps.newId() — see engine/quests.ts.
    expect(liveIds.every((id) => id.includes('::'))).toBe(true);
  });

  it('a day with no APP_OPENED produces no instances', async () => {
    const deps = seededDeps();
    const arcId = 'arc-raw';
    const payload: ArcStartedPayload = {
      arcId,
      startDate: DEFAULT_CONFIG.arc.startDate,
      endDate: DEFAULT_CONFIG.arc.endDate,
      timezone: DEFAULT_CONFIG.arc.timezone,
      dayBoundaryHour: DEFAULT_CONFIG.arc.dayBoundaryHour,
      dayCloseHour: DEFAULT_CONFIG.arc.dayCloseHour,
      mainQuestText: 'Ship it.',
    };
    await appendEvent({
      id: deps.newId(),
      type: 'ARC_STARTED',
      occurred_at: deps.now(),
      local_date: DEFAULT_CONFIG.arc.startDate,
      arc_id: arcId,
      payload: payload as unknown as Record<string, unknown>,
      source: 'user',
      idem_key: `arc-started:${arcId}`,
      schema_v: 1,
    });
    // No APP_OPENED event anywhere in the log.

    await rebuildProjections(DEFAULT_CONFIG, deps);
    expect(await db.quest_template.count()).toBe(6); // templates still derive from ARC_STARTED
    expect(await db.quest_instance.count()).toBe(0); // but no day was ever opened
  });

  it('verifyIntegrity returns empty discrepancies on a clean database', async () => {
    const deps = seededDeps();
    await buildLiveArcWithActivity(deps);
    const report = await verifyIntegrity(DEFAULT_CONFIG, deps);
    expect(report.clean).toBe(true);
    expect(report.discrepancies).toEqual([]);
  });
});
