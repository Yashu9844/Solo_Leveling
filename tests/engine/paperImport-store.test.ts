import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/db';
import { initialiseArc, type OnboardingInput } from '../../src/store/onboarding';
import { parseDailyLog, parseDsaLog } from '../../src/engine/paperImport';
import { importDailyLog, importDsaLog } from '../../src/store/paperImport';
import { DEFAULT_CONFIG } from '../../src/engine/config';
import type { EngineDeps } from '../../src/engine/types';

function seededDeps(prefix = 'id'): EngineDeps {
  let counter = 0;
  let clockMs = Date.parse('2026-09-05T10:00:00Z'); // plainly outside the 03:00-04:00 day-close window
  return {
    now: () => {
      const iso = new Date(clockMs).toISOString();
      clockMs += 1000;
      return iso;
    },
    newId: () => `${prefix}-${String(counter++).padStart(6, '0')}`,
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
  await db.dsa_problem.clear();
  await db.dsa_attempt.clear();
  await db.metric_sample.clear();
  await db.maintenance_log.clear();
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

describe('store/paperImport — the daily and DSA logs end-to-end', () => {
  beforeEach(clearAll);

  it('imports a multi-day daily log and produces real quest completions, sleep, screentime and maintenance', async () => {
    const deps = seededDeps();
    const arcId = await initialiseArc({ ...ONBOARDING_INPUT, intentions: {}, baseline: {} }, DEFAULT_CONFIG, deps);

    const csv =
      'date,dsa,bld,trn,slp,fue,att,wake,sleep,scrn,energy,focus,blocker,note\n' +
      '2026-09-01,1,1,1,1,1,1,06:34,23:10,47,3,4,none,good day\n' +
      '2026-09-02,m,0,1,1,0,1,07:00,23:30,55,2,3,tired,';
    const { entries, errors } = parseDailyLog(csv);
    expect(errors).toEqual([]);

    const summary = await importDailyLog(entries, arcId, DEFAULT_CONFIG, deps);
    expect(summary.daysImported).toBe(2);
    expect(summary.skippedDayClosed).toBe(0);
    // Day 1: 5 core marks all complete. Day 2: dsa(floor)+trn+att = 3 (bld and fue are 'none'/skipped).
    expect(summary.questsCompleted).toBe(8);

    const day1Instances = await db.quest_instance.where('local_date').equals('2026-09-01').toArray();
    expect(day1Instances.filter((i) => i.state === 'complete')).toHaveLength(5);

    const day2Instances = await db.quest_instance.where('local_date').equals('2026-09-02').toArray();
    const day2Complete = day2Instances.filter((i) => i.state === 'complete');
    expect(day2Complete).toHaveLength(3);

    const maintenance = await db.maintenance_log.toArray();
    expect(maintenance.map((m) => m.local_date).sort()).toEqual(['2026-09-01']); // day 2's fue was '0'

    const wakeSamples = (await db.metric_sample.toArray()).filter((s) => s.kind === 'wake_time');
    expect(wakeSamples).toHaveLength(2);

    const screenSamples = (await db.metric_sample.toArray()).filter((s) => s.kind === 'screen_time_min');
    expect(screenSamples.map((s) => s.value).sort()).toEqual([47, 55]);

    const reviewEvents = (await db.event.toArray()).filter((e) => e.type === 'REVIEW_COMPLETED');
    expect(reviewEvents).toHaveLength(2);
  });

  it('imports a DSA log into real dsa_problem/dsa_attempt rows, reusing the normal logProblem path', async () => {
    const deps = seededDeps();
    const arcId = await initialiseArc({ ...ONBOARDING_INPUT, intentions: {}, baseline: {} }, DEFAULT_CONFIG, deps);

    const csv =
      'date,problem,topic,diff,outcome,min,insight\n' +
      '2026-09-01,Course Schedule II,graphs,M,hint,34,topo sort via indegree\n' +
      '2026-09-02,Two Sum,arrays,E,first,8,';
    const { entries, errors } = parseDsaLog(csv);
    expect(errors).toEqual([]);

    const count = await importDsaLog(entries, arcId, DEFAULT_CONFIG, deps);
    expect(count).toBe(2);

    const problems = await db.dsa_problem.toArray();
    expect(problems).toHaveLength(2);
    expect(problems.map((p) => p.slug).sort()).toEqual(['course-schedule-ii', 'two-sum']);

    const attempts = await db.dsa_attempt.toArray();
    expect(attempts).toHaveLength(2);
    expect(attempts.every((a) => !a.is_revisit)).toBe(true);
  });
});
