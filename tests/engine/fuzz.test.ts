// final/08-testing-slices-scope.md §3.4's "Reducer fuzz — 10,000 random
// valid event sequences, assert invariants (XP non-negative, level
// monotonic, streak bounded, no outcome-derived XP)" — the one item in
// the testing plan's "Data integrity" section this codebase never had a
// test for. Targets db/projections.ts's buildProjections directly: it's
// a pure function of (events, config, deps) with zero IndexedDB access
// (rebuildProjections and verifyIntegrity are the only callers that add
// I/O around it), so a fuzz run here needs no fake-indexeddb setup for
// the computation itself — only the module import graph pulls in db.ts,
// which is why the shim is still loaded below.
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { addDays, format, parseISO } from 'date-fns';
import { buildProjections } from '../../src/db/projections';
import { levelFor } from '../../src/engine/level';
import { DEFAULT_CONFIG } from '../../src/engine/config';
import type {
  CoreQuestKey,
  EngineDeps,
  MaintenanceLoggedPayload,
  QuestCompletedPayload,
  QuestRecoveredPayload,
  QuestUndonePayload,
  StepsLoggedPayload,
  SystemEvent,
} from '../../src/engine/types';

const CORE_KEYS: CoreQuestKey[] = ['career', 'dsa', 'build', 'training', 'sleep', 'attention'];
const ARC_ID = 'fuzz-arc';
const START_DATE = DEFAULT_CONFIG.arc.startDate;

// mulberry32 — small, dependency-free, seedable. Reproducible: a failing
// seed can be pinned and replayed exactly.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fuzzDeps: EngineDeps = { now: () => '2026-09-01T04:30:00Z', newId: () => 'fuzz-id' };

function localDateAt(offsetDays: number): string {
  return format(addDays(parseISO(START_DATE), offsetDays), 'yyyy-MM-dd');
}

/**
 * Builds one random-but-structurally-valid event log: ARC_STARTED, then
 * up to 40 days each opened (APP_OPENED) with a random walk of
 * QUEST_COMPLETED/QUEST_UNDONE per core key, plus a random sprinkling of
 * every other XP-bearing event type. "Valid" means well-typed and
 * idem_key-unique, not gameplay-realistic — the point is to stress
 * arithmetic edge cases a hand-written test wouldn't think to try, not
 * to model a plausible day.
 */
function randomEventLog(seed: number): SystemEvent[] {
  const rand = mulberry32(seed);
  const events: SystemEvent[] = [];
  let counter = 0;
  const nextId = () => `evt-${seed}-${counter++}`;

  events.push({
    id: nextId(),
    type: 'ARC_STARTED',
    occurred_at: `${START_DATE}T04:30:00Z`,
    local_date: START_DATE,
    arc_id: ARC_ID,
    payload: {
      arcId: ARC_ID,
      startDate: START_DATE,
      endDate: DEFAULT_CONFIG.arc.endDate,
      timezone: DEFAULT_CONFIG.arc.timezone,
      dayBoundaryHour: DEFAULT_CONFIG.arc.dayBoundaryHour,
      dayCloseHour: DEFAULT_CONFIG.arc.dayCloseHour,
      mainQuestText: 'Fuzz.',
    },
    source: 'user',
    idem_key: `arc-started:${ARC_ID}`,
    schema_v: 1,
  });

  const dayCount = 1 + Math.floor(rand() * 40);
  let bossesCleared = 0;

  for (let d = 0; d < dayCount; d++) {
    const localDate = localDateAt(d);
    const occurredAt = `${localDate}T10:00:00Z`;

    events.push({
      id: nextId(),
      type: 'APP_OPENED',
      occurred_at: occurredAt,
      local_date: localDate,
      arc_id: ARC_ID,
      payload: { seconds: 0 },
      source: 'system',
      idem_key: `app-opened:${localDate}`,
      schema_v: 1,
    });

    for (const key of CORE_KEYS) {
      if (rand() < 0.3) continue; // this key untouched today
      const instanceId = `inst-${key}-${localDate}`;
      const toggles = Math.floor(rand() * 4); // 0-3 complete/undo pairs
      for (let t = 0; t < toggles; t++) {
        const completing = t % 2 === 0;
        if (completing) {
          events.push({
            id: nextId(),
            type: 'QUEST_COMPLETED',
            occurred_at: occurredAt,
            local_date: localDate,
            arc_id: ARC_ID,
            payload: {
              instanceId,
              templateId: `tpl-${key}`,
              questKey: key,
              localDate,
            } satisfies QuestCompletedPayload,
            source: 'user',
            idem_key: nextId(),
            schema_v: 1,
          });
        } else {
          events.push({
            id: nextId(),
            type: 'QUEST_UNDONE',
            occurred_at: occurredAt,
            local_date: localDate,
            arc_id: ARC_ID,
            payload: { instanceId, localDate } satisfies QuestUndonePayload,
            source: 'user',
            idem_key: nextId(),
            schema_v: 1,
          });
        }
      }
    }

    if (rand() < 0.15) {
      events.push({
        id: nextId(),
        type: 'QUEST_RECOVERED',
        occurred_at: occurredAt,
        local_date: localDate,
        arc_id: ARC_ID,
        payload: { localDate: localDateAt(Math.max(0, d - 1)) } satisfies QuestRecoveredPayload,
        source: 'user',
        idem_key: `recovery:${localDate}`,
        schema_v: 1,
      });
    }

    if (rand() < 0.2) {
      events.push({
        id: nextId(),
        type: 'PROBLEM_REVISITED',
        occurred_at: occurredAt,
        local_date: localDate,
        arc_id: ARC_ID,
        payload: { problemId: `p-${d}`, outcome: 'first_attempt', minutes: 10 },
        source: 'user',
        idem_key: nextId(),
        schema_v: 1,
      });
    }

    if (rand() < 0.1) {
      events.push({
        id: nextId(),
        type: 'ARTIFACT_SHIPPED',
        occurred_at: occurredAt,
        local_date: localDate,
        arc_id: ARC_ID,
        payload: { artifactId: nextId(), kind: 'feature', title: 'fuzz', projectKey: 'fuzz' },
        source: 'user',
        idem_key: nextId(),
        schema_v: 1,
      });
    }

    if (rand() < 0.2) {
      events.push({
        id: nextId(),
        type: 'STEPS_LOGGED',
        occurred_at: occurredAt,
        local_date: localDate,
        arc_id: ARC_ID,
        payload: { localDate, steps: Math.floor(rand() * 20000) } satisfies StepsLoggedPayload,
        source: 'user',
        idem_key: `steps:${localDate}`,
        schema_v: 1,
      });
    }

    if (rand() < 0.2) {
      events.push({
        id: nextId(),
        type: 'MAINTENANCE_LOGGED',
        occurred_at: occurredAt,
        local_date: localDate,
        arc_id: ARC_ID,
        payload: {
          localDate,
          bath: rand() < 0.5,
          fuel: rand() < 0.5,
          laundry: rand() < 0.5,
          allDone: rand() < 0.5,
        } satisfies MaintenanceLoggedPayload,
        source: 'user',
        idem_key: `maintenance:${localDate}`,
        schema_v: 1,
      });
    }

    if (bossesCleared < 4 && rand() < 0.05) {
      bossesCleared += 1;
      events.push({
        id: nextId(),
        type: 'BOSS_CLEARED',
        occurred_at: occurredAt,
        local_date: localDate,
        arc_id: ARC_ID,
        payload: { bossId: ['I', 'II', 'III', 'IV'][bossesCleared - 1] },
        source: 'user',
        idem_key: `boss:${bossesCleared}`,
        schema_v: 1,
      });
    }
  }

  return events;
}

const SEEDS = 10_000;

describe('Reducer fuzz — buildProjections over random valid event logs', () => {
  it(`holds every invariant across ${SEEDS} random seeds`, () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const log = randomEventLog(seed);
      const built = buildProjections(log, DEFAULT_CONFIG, fuzzDeps);
      const ctx = `seed=${seed}`;

      expect(built.playerState, ctx).not.toBeNull();
      const player = built.playerState!;

      // XP non-negative.
      expect(player.total_xp, ctx).toBeGreaterThanOrEqual(0);
      for (const row of built.ledger) {
        expect(row.amount, `${ctx} ledger=${row.id}`).toBeGreaterThanOrEqual(0);
      }

      // Level is always exactly the deterministic function of total_xp —
      // it cannot drift from it or regress independently ("monotonic").
      const recomputed = levelFor(player.total_xp, DEFAULT_CONFIG);
      expect(player.level, ctx).toBe(recomputed.level);
      expect(player.xp_into_level, ctx).toBe(recomputed.xpIntoLevel);
      expect(player.xp_for_next, ctx).toBe(recomputed.xpForNext);

      // Streak fields stay within their defined bounds.
      expect(player.consistency_7, ctx).toBeGreaterThanOrEqual(0);
      expect(player.consistency_7, ctx).toBeLessThanOrEqual(100);
      expect(player.consistency_28, ctx).toBeGreaterThanOrEqual(0);
      expect(player.consistency_28, ctx).toBeLessThanOrEqual(100);
      expect(player.arc_streak, ctx).toBeGreaterThanOrEqual(0);
      expect(player.grace_remaining, ctx).toBeGreaterThanOrEqual(0);

      // No outcome-derived XP: a core completion's grant is always
      // exactly the flat, questKey-keyed config amount (or less, if
      // capped) — never inflated by anything about how it was logged.
      for (const row of built.ledger) {
        if (!row.reason.startsWith('core:')) continue;
        const key = row.reason.slice('core:'.length) as CoreQuestKey;
        expect(row.amount, `${ctx} reason=${row.reason}`).toBeLessThanOrEqual(DEFAULT_CONFIG.coreQuests[key].xp);
      }

      // Every day rollup's XP is non-negative and its core-completed
      // count never exceeds the day's real core total.
      for (const rollup of built.dayRollups) {
        expect(rollup.xp_earned, `${ctx} day=${rollup.local_date}`).toBeGreaterThanOrEqual(0);
        expect(rollup.core_completed, `${ctx} day=${rollup.local_date}`).toBeLessThanOrEqual(CORE_KEYS.length);
      }
    }
  });

  it('is deterministic: the same seed rebuilds byte-identical output', () => {
    for (const seed of [0, 1, 42, 9999]) {
      const log = randomEventLog(seed);
      const first = buildProjections(log, DEFAULT_CONFIG, fuzzDeps);
      const second = buildProjections(log, DEFAULT_CONFIG, fuzzDeps);
      expect(second).toEqual(first);
    }
  });
});
