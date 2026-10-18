import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/db';
import { DEFAULT_CONFIG } from '../../src/engine/config';
import type { EngineDeps } from '../../src/engine/types';
import { initialiseArc, type OnboardingInput } from '../../src/store/onboarding';
import { acceptWeeklyQuest, getActiveWeeklyQuest } from '../../src/store/weeklyQuest';
import { logQuickDsaPractice, getDsaSkillsOverview } from '../../src/store/skills';
import { getDsaTopicMastery } from '../../src/store/mastery';
import { shipArtifact } from '../../src/store/build';
import { loadTodayQuests } from '../../src/store/quests';

/**
 * Two bugs from real use:
 *
 *  1. Practising a DSA topic from the Skills screen moved nothing — the
 *     skill stayed unseen and the weekly "N problems" count stayed at 0.
 *  2. A weekly "ship one real unit" quest could not be marked done; the only
 *     way to create the artifact it counts was a 45-minute build session.
 */

function seededDeps(): EngineDeps {
  let counter = 0;
  let clockMs = Date.parse('2026-09-05T10:00:00Z');
  return {
    now: () => {
      const iso = new Date(clockMs).toISOString();
      clockMs += 1000;
      return iso;
    },
    newId: () => `id-${String(counter++).padStart(6, '0')}`,
  };
}

async function clearAll() {
  for (const t of [
    db.event, db.arc, db.quest_template, db.quest_instance, db.xp_ledger, db.day_rollup,
    db.player_state, db.checkpoint, db.profile, db.dsa_problem, db.dsa_attempt, db.artifact,
    db.build_session, db.weekly_quest,
  ]) {
    await t.clear();
  }
}

const INPUT: Omit<OnboardingInput, 'intentions' | 'baseline'> = {
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

const DAY = DEFAULT_CONFIG.arc.startDate;

async function arc(deps: EngineDeps): Promise<string> {
  return initialiseArc({ ...INPUT, intentions: {}, baseline: {} }, DEFAULT_CONFIG, deps);
}

describe('practising a DSA topic from Skills', () => {
  beforeEach(clearAll);

  it('raises the skill from unseen', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    expect(await getDsaTopicMastery('Arrays')).toBe('unseen');

    await logQuickDsaPractice(DAY, arcId, { topic: 'Arrays', title: 'Two Sum', difficulty: 'E', outcome: 'first_attempt', minutes: 20 }, DEFAULT_CONFIG, deps);

    expect(await getDsaTopicMastery('Arrays')).toBe('introduced');
    const overview = await getDsaSkillsOverview();
    expect(overview.find((t) => t.topic === 'Arrays')?.state).toBe('introduced');
    expect(overview.find((t) => t.topic === 'Strings')?.state).toBe('unseen');
  });

  it('keeps climbing as more problems are practised (3 attempts -> applied)', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    for (const name of ['Two Sum', 'Best Time to Buy', 'Contains Duplicate']) {
      await logQuickDsaPractice(DAY, arcId, { topic: 'Arrays', title: name, difficulty: 'E', outcome: 'first_attempt', minutes: 15 }, DEFAULT_CONFIG, deps);
    }
    expect(await getDsaTopicMastery('Arrays')).toBe('applied');
  });

  it('counts toward the weekly problem quest, one per problem, only for its topic', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await acceptWeeklyQuest(DAY, { kind: 'dsa_topic_volume', description: '10 problems, Arrays focus', target: 10, topic: 'Arrays' }, deps);

    await logQuickDsaPractice(DAY, arcId, { topic: 'Arrays', title: 'Two Sum', difficulty: 'E', outcome: 'first_attempt', minutes: 15 }, DEFAULT_CONFIG, deps);
    await logQuickDsaPractice(DAY, arcId, { topic: 'Arrays', title: 'Three Sum', difficulty: 'M', outcome: 'hint', minutes: 30 }, DEFAULT_CONFIG, deps);
    await logQuickDsaPractice(DAY, arcId, { topic: 'Graphs', title: 'Number of Islands', difficulty: 'M', outcome: 'first_attempt', minutes: 30 }, DEFAULT_CONFIG, deps);

    const active = await getActiveWeeklyQuest(DAY, arcId, DEFAULT_CONFIG, deps);
    expect(active?.progress).toBe(2); // the two Arrays problems, not the Graphs one
  });

  it('completes the weekly quest when the target is reached', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await acceptWeeklyQuest(DAY, { kind: 'dsa_topic_volume', description: '2 problems, Arrays focus', target: 2, topic: 'Arrays' }, deps);
    await logQuickDsaPractice(DAY, arcId, { topic: 'Arrays', title: 'A', difficulty: 'E', outcome: 'first_attempt', minutes: 10 }, DEFAULT_CONFIG, deps);
    await logQuickDsaPractice(DAY, arcId, { topic: 'Arrays', title: 'B', difficulty: 'E', outcome: 'first_attempt', minutes: 10 }, DEFAULT_CONFIG, deps);
    const active = await getActiveWeeklyQuest(DAY, arcId, DEFAULT_CONFIG, deps);
    expect(active?.justCompleted).toBe(true);
  });

  it('completes the DSA daily quest, as logging from Today does', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await loadTodayQuests(DAY, DEFAULT_CONFIG, deps); // the day's quests exist once Today has opened
    await logQuickDsaPractice(DAY, arcId, { topic: 'Arrays', title: 'Two Sum', difficulty: 'E', outcome: 'first_attempt', minutes: 5 }, DEFAULT_CONFIG, deps);
    const template = (await db.quest_template.toArray()).find((t) => t.key === 'dsa');
    const instance = (await db.quest_instance.where('local_date').equals(DAY).toArray()).find((i) => i.template_id === template?.id);
    expect(instance?.state).toBe('complete');
  });

  it('the same problem name twice is one problem with two attempts', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await logQuickDsaPractice(DAY, arcId, { topic: 'Arrays', title: 'Two Sum', difficulty: 'E', outcome: 'unsolved', minutes: 10 }, DEFAULT_CONFIG, deps);
    await logQuickDsaPractice(DAY, arcId, { topic: 'Arrays', title: '  two   sum ', difficulty: 'E', outcome: 'first_attempt', minutes: 10 }, DEFAULT_CONFIG, deps);
    expect(await db.dsa_problem.count()).toBe(1);
    expect(await db.dsa_attempt.count()).toBe(2);
  });

  it('refuses an empty problem name and writes nothing', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await expect(
      logQuickDsaPractice(DAY, arcId, { topic: 'Arrays', title: '   ', difficulty: 'E', outcome: 'first_attempt', minutes: 10 }, DEFAULT_CONFIG, deps)
    ).rejects.toThrow(/problem name/i);
    expect(await db.dsa_attempt.count()).toBe(0);
  });
});

describe('marking a weekly ship quest done', () => {
  beforeEach(clearAll);

  const SHIP_QUEST = { kind: 'ship_project' as const, description: 'Ship one real unit of progress this week', target: 1 };

  it('starts at 0 of 1', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await acceptWeeklyQuest(DAY, SHIP_QUEST, deps);
    const active = await getActiveWeeklyQuest(DAY, arcId, DEFAULT_CONFIG, deps);
    expect(active?.progress).toBe(0);
    expect(active?.justCompleted).toBe(false);
  });

  it('is completed by marking something shipped, with no build session', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await acceptWeeklyQuest(DAY, SHIP_QUEST, deps);

    await shipArtifact(DAY, arcId, { kind: 'project', title: 'Job tracker app' }, DEFAULT_CONFIG, deps);

    expect(await db.build_session.count()).toBe(0); // no invented build minutes
    const active = await getActiveWeeklyQuest(DAY, arcId, DEFAULT_CONFIG, deps);
    expect(active?.progress).toBe(1);
    expect(active?.justCompleted).toBe(true);
    expect(active?.row.xp).toBe(DEFAULT_CONFIG.weeklyQuestXp);
  });

  it('pays the weekly XP exactly once and stays complete on a later read', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await acceptWeeklyQuest(DAY, SHIP_QUEST, deps);
    await shipArtifact(DAY, arcId, { kind: 'project', title: 'Job tracker app' }, DEFAULT_CONFIG, deps);
    await getActiveWeeklyQuest(DAY, arcId, DEFAULT_CONFIG, deps);
    const events = await db.event.where('type').equals('WEEKLY_QUEST_COMPLETED').toArray();
    expect(events).toHaveLength(1);
    // Once complete the quest is no longer "active": it does not claim twice.
    expect(await getActiveWeeklyQuest(DAY, arcId, DEFAULT_CONFIG, deps)).toBeNull();
    expect(await db.event.where('type').equals('WEEKLY_QUEST_COMPLETED').count()).toBe(1);
  });

  it('writes the artifact event and row, and the ship bonus lands in the ledger', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await shipArtifact(DAY, arcId, { kind: 'deployment', title: 'Portfolio', url: 'https://example.com' }, DEFAULT_CONFIG, deps);
    expect(await db.event.where('type').equals('ARTIFACT_SHIPPED').count()).toBe(1);
    const row = (await db.artifact.toArray())[0];
    expect(row).toMatchObject({ kind: 'deployment', title: 'Portfolio', url: 'https://example.com', local_date: DAY });
    const ledger = await db.xp_ledger.toArray();
    const ship = ledger.find((l) => l.reason === 'ship');
    expect(ship).toMatchObject({ category: 'CRAFT', amount: DEFAULT_CONFIG.shipBonusXp });
  });

  it('survives a rebuild from the event log', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await shipArtifact(DAY, arcId, { kind: 'project', title: 'Job tracker app' }, DEFAULT_CONFIG, deps);
    const { getAllEvents } = await import('../../src/db/events');
    const { buildDomainTables } = await import('../../src/db/domainProjections');
    const rebuilt = buildDomainTables(await getAllEvents(), DEFAULT_CONFIG).artifacts;
    expect(rebuilt.map((a) => a.title)).toEqual(['Job tracker app']);
  });

  it('refuses an empty name and writes nothing', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await expect(shipArtifact(DAY, arcId, { kind: 'project', title: '  ' }, DEFAULT_CONFIG, deps)).rejects.toThrow(/name/i);
    expect(await db.artifact.count()).toBe(0);
  });

  it('an artifact shipped outside the quest week does not count toward it', async () => {
    const deps = seededDeps();
    const arcId = await arc(deps);
    await acceptWeeklyQuest(DAY, SHIP_QUEST, deps); // 1 Sep .. 7 Sep
    await shipArtifact('2026-09-20', arcId, { kind: 'project', title: 'Too late' }, DEFAULT_CONFIG, deps);
    const active = await getActiveWeeklyQuest(DAY, arcId, DEFAULT_CONFIG, deps);
    expect(active?.progress).toBe(0);
  });
});
