// Every tunable constant in the domain. Nothing may be hard-coded anywhere
// else in the codebase. Transcribed from final/01-quests-xp-level-rank.md.
import type { EngineConfig } from './types';

export const DEFAULT_CONFIG: EngineConfig = {
  arc: {
    timezone: 'Asia/Kolkata',
    dayBoundaryHour: 4,
    dayCloseHour: 3,
    startDate: '2026-09-01',
    endDate: '2026-12-29',
  },
  coreQuests: {
    career: { xp: 100, category: 'CAREER' },
    dsa: { xp: 100, category: 'MIND' },
    build: { xp: 100, category: 'CRAFT' },
    training: { xp: 100, category: 'BODY' },
    sleep: { xp: 60, category: 'SLEEP' },
    attention: { xp: 40, category: 'ATTENTION' },
  }, // sums to 500
  categoryCaps: {
    CAREER: 140,
    MIND: 200,
    CRAFT: 200,
    BODY: 150,
    SLEEP: 60,
    ATTENTION: 40,
    LEARN: 75,
    MAINT: 20,
  },
  dailyCap: 700,
  mvdXp: 35,
  recoveryXp: 40,
  bossXp: 500,
  level: { base: 200, coefficient: 75, exponent: 0.98, roundTo: 10 },
  streak: { graceDaysPer28: 4, reducedModeTriggerMisses: 2, reducedModeExitDays: 2 },
  attributes: { windowDays: 28 },
  srs: {
    firstAttemptIntervals: [3, 10, 30, 90],
    hint: 3,
    editorial: 2,
    unsolved: 1,
    maxRevisitsPerDay: 3,
    retainedMinGapDays: 21,
  },
};
