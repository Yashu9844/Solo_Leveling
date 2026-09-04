// The Day-0 checkpoint row is created empty during onboarding
// (store/onboarding.ts) — self_efficacy: {}, automaticity: {}, enjoyment:
// {}. This module fills in self_efficacy from the carry-over instrument
// (final/11-SLICE-2-PROMPT.md Step 1; the spec gap was in docs/13, not
// final/, which is why Phase 0 didn't have it). automaticity and
// enjoyment stay {} — no instrument for either exists yet in any final/
// doc; left as an open gap, same shape as the other flagged omissions
// in this file below.
//
// Slice 12 — final/01 §4: rank gate evidence, sealing, and the export
// gate that blocks sealing. computeGateEvidence pulls every field
// engine/rank.ts's GateEvidence needs from real tables where the data
// exists (career, DSA, foundations, training, resume, system design —
// all real as of Slices 6-11). Four fields have no data source ANYWHERE
// in this build and are always false: costPerTaskMeasured and
// interviewBenchmarkPassed have no logging surface in any final/ doc;
// all four bossXCleared fields are Slice 13's boss-quest system, which
// doesn't exist yet. This is the safe direction — a gate depending on
// them can never over-report a rank it hasn't actually earned.
import { addDays, format, parseISO } from 'date-fns';
import { evaluateGates, verdictTextFor, type Checkpoint, type GateEvidence, type GateResult } from '../engine/rank';
import type { DsaAttemptFixture } from '../engine/dsa';
import { foundationMasteryFor, FOUNDATION_TOPICS } from '../engine/foundations';
import { followThroughRate, type ApplicationFixture, type ApplicationStatus } from '../engine/career';
import { getStreakState } from './streak';
import { getAllEvents } from '../db/events';
import { db } from '../db/db';
import type { CheckpointRow } from '../db/schema';
import type { EngineConfig, Rank } from '../engine/types';

function shiftDate(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr), days), 'yyyy-MM-dd');
}

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 999; // insufficient evidence reads as the fail-safe worst case, never as "perfect"
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length);
}

export interface SelfEfficacy {
  items: [number, number, number, number, number, number];
  mean: number;
}

export async function getDayZeroCheckpoint(): Promise<CheckpointRow | undefined> {
  return db.checkpoint.where('day').equals(0).first();
}

export function selfEfficacyIsComplete(checkpoint: CheckpointRow | undefined): boolean {
  if (!checkpoint) return false;
  return Object.keys(checkpoint.self_efficacy).length > 0;
}

export async function saveSelfEfficacy(items: SelfEfficacy['items']): Promise<void> {
  const checkpoint = await getDayZeroCheckpoint();
  if (!checkpoint) {
    return;
  }
  const mean = items.reduce((sum, v) => sum + v, 0) / items.length;
  const self_efficacy: SelfEfficacy = { items, mean };
  await db.checkpoint.update(checkpoint.id, {
    self_efficacy: self_efficacy as unknown as Record<string, unknown>,
  });
}

export async function getCheckpoint(day: Checkpoint['day']): Promise<CheckpointRow | undefined> {
  return db.checkpoint.where('day').equals(day).first();
}

/** The rank as of the most recently sealed checkpoint, or 'E' before any
 * checkpoint has ever been sealed. This — not the target rank of an
 * upcoming, unsealed checkpoint — is what every "RANK X" display in the
 * app should read; rank only ever changes at a sealing. */
export async function getCurrentRank(): Promise<Rank> {
  const all = await db.checkpoint.toArray();
  const sealed = all.filter((c) => c.sealed_at !== undefined && c.rank_after !== undefined);
  if (sealed.length === 0) return 'E';
  return sealed.reduce((a, b) => (a.day > b.day ? a : b)).rank_after as Rank;
}

/** The rank already sealed as of the most recent SEALED checkpoint
 * strictly before `day` — "never regresses" needs to know what it's
 * not regressing from. Falls back to 'E' before any checkpoint exists. */
async function ranksSealedBefore(day: Checkpoint['day']): Promise<Rank> {
  const all = await db.checkpoint.where('day').below(day).toArray();
  const sealed = all.filter((c) => c.sealed_at !== undefined && c.rank_after !== undefined);
  if (sealed.length === 0) return 'E';
  const latest = sealed.reduce((a, b) => (a.day > b.day ? a : b));
  return latest.rank_after as Rank;
}

const CHECKPOINT_DAYS: Checkpoint['day'][] = [14, 30, 60, 90];

/**
 * Gathers every field engine/rank.ts's GateEvidence needs from real data.
 * `today` is the local_date the checkpoint is being evaluated as of —
 * ordinarily the checkpoint's own day, but evaluating early (to preview
 * "how close am I") is legitimate and this takes whatever date it's given.
 */
export async function computeGateEvidence(today: string, config: EngineConfig): Promise<GateEvidence> {
  const cutoff28 = shiftDate(today, -27);
  const inLast = (localDate: string, cutoff: string) => localDate >= cutoff && localDate <= today;

  const [
    streak,
    dsaAttempts,
    dsaProblems,
    applications,
    events,
    artifacts,
    resumeVersions,
    learningBlocks,
    systemDesigns,
    trainingSessions,
    metricSamples,
    checkpointsBefore,
  ] = await Promise.all([
    getStreakState(today, config),
    db.dsa_attempt.toArray(),
    db.dsa_problem.toArray(),
    db.application.toArray(),
    getAllEvents(),
    db.artifact.toArray(),
    db.resume_version.toArray(),
    db.learning_block.toArray(),
    db.system_design_study.toArray(),
    db.training_session.toArray(),
    db.metric_sample.toArray(),
    db.checkpoint.toArray(),
  ]);

  const problemById = new Map(dsaProblems.map((p) => [p.id, p]));
  const nonRevisit = dsaAttempts.filter((a) => !a.is_revisit);
  const nonRevisitFixtures28d: DsaAttemptFixture[] = nonRevisit
    .filter((a) => inLast(a.local_date, cutoff28))
    .map((a) => {
      const problem = problemById.get(a.problem_id);
      return {
        problem_id: a.problem_id,
        topic: problem?.topic ?? '',
        difficulty: problem?.difficulty ?? 'E',
        local_date: a.local_date,
        outcome: a.outcome,
        is_revisit: false,
      };
    });
  const mediumAttempts28d = nonRevisitFixtures28d.filter((a) => a.difficulty === 'M');

  const applicationFixtures: ApplicationFixture[] = applications.map((a) => ({
    id: a.id,
    local_date: a.local_date,
    company: a.company,
    role: a.role,
    role_category: a.role_category,
    resume_version_id: a.resume_version_id,
    why_line: a.why_line,
    quality_pass: a.quality_pass,
    status: a.status as ApplicationStatus,
    followed_up_at: a.followed_up_at,
    followup_due_at: a.followup_due_at,
  }));

  const substituteEvents = events.filter((e) => e.type === 'CAREER_SUBSTITUTE_LOGGED');
  const substituteKindCount = (kind: string) =>
    substituteEvents.filter((e) => (e.payload as unknown as { kind: string }).kind === kind).length;

  const blocks = learningBlocks.map((b) => ({ topic: b.topic, local_date: b.local_date }));
  const masteryStates = FOUNDATION_TOPICS.map((topic) => foundationMasteryFor(topic, blocks));

  const projectKeys = new Set(artifacts.filter((a) => a.kind === 'project').map((a) => a.project_key));
  const evalProjectKeys = new Set(artifacts.filter((a) => a.kind === 'eval').map((a) => a.project_key));
  const publicProjectsWithEvalSuite = [...projectKeys].filter((k) => evalProjectKeys.has(k)).length;

  const stepsInWindow = metricSamples.filter((s) => s.kind === 'steps' && inLast(s.local_date, cutoff28)).map((s) => s.value);
  const wakeTimesInWindow = metricSamples
    .filter((s) => s.kind === 'wake_time' && inLast(s.local_date, cutoff28))
    .map((s) => s.value);
  const screenTimeInWindow = metricSamples
    .filter((s) => s.kind === 'screen_time_min' && inLast(s.local_date, cutoff28))
    .map((s) => s.value);

  // Est. 1RM aggregate gain — final/00 §2's "+12%": for every exercise
  // name with >= 2 dated samples, compare the earliest to the latest
  // est_1rm; average the per-exercise % gains. 0 without qualifying data.
  const liftsByName = new Map<string, { local_date: string; est_1rm: number }[]>();
  for (const session of trainingSessions) {
    for (const lift of session.lifts) {
      const list = liftsByName.get(lift.name) ?? [];
      list.push({ local_date: session.local_date, est_1rm: lift.est_1rm });
      liftsByName.set(lift.name, list);
    }
  }
  const perExerciseGains: number[] = [];
  for (const samples of liftsByName.values()) {
    if (samples.length < 2) continue;
    const sorted = [...samples].sort((a, b) => a.local_date.localeCompare(b.local_date));
    const first = sorted[0]!.est_1rm;
    const last = sorted[sorted.length - 1]!.est_1rm;
    if (first > 0) perExerciseGains.push((last - first) / first);
  }
  const trainingEst1RmGainPct = perExerciseGains.length > 0 ? mean(perExerciseGains) : 0;

  const priorSealed = checkpointsBefore.filter((c) => CHECKPOINT_DAYS.includes(c.day as 14 | 30 | 60 | 90));
  const arcSealed = CHECKPOINT_DAYS.every((day) => priorSealed.some((c) => c.day === day && c.sealed_at !== undefined));

  return {
    mvdConsistency14d: streak.consistency_14 / 100,
    coreCompletion28d: streak.consistency_28 / 100,
    problemsTotal: nonRevisit.length,
    firstAttemptRateM28d:
      mediumAttempts28d.length > 0 ? mediumAttempts28d.filter((a) => a.outcome === 'first_attempt').length / mediumAttempts28d.length : 0,
    trainingSessionsTotal: trainingSessions.length,
    meanSteps: mean(stepsInWindow),
    wakeSdMin: stddev(wakeTimesInWindow),
    screenTimeAvgMin: screenTimeInWindow.length > 0 ? mean(screenTimeInWindow) : 999,
    qualityApplicationsTotal: applicationFixtures.filter((a) => a.quality_pass).length,
    followThroughRate: followThroughRate(applicationFixtures, today),
    networkingConversations: substituteKindCount('networking'),
    recordedMocks: substituteKindCount('mock'),
    aiFeaturePublicRepo: artifacts.some((a) => a.kind === 'feature' && !!a.url),
    publicProjectsTotal: projectKeys.size,
    publicProjectsWithEvalSuite,
    publicProjectsDeployedReachable: artifacts.filter((a) => a.kind === 'deployment').length,
    publishedWriteups: artifacts.filter((a) => a.kind === 'writeup').length,
    resumeVersionsTotal: resumeVersions.length,
    resumeExternallyReviewed: resumeVersions.some((r) => r.external_review === true),
    foundationTopicsIntroducedPlus: masteryStates.filter((s) => s !== 'unseen').length,
    foundationTopicsFluentPlus: masteryStates.filter((s) => s === 'fluent' || s === 'retained').length,
    foundationTopicsRetainedPlus: masteryStates.filter((s) => s === 'retained').length,
    systemDesignsStudied: systemDesigns.length,
    systemDesignsWrittenUp: systemDesigns.filter((s) => s.mode === 'written_up').length,
    systemDesignsExplainedAloud: systemDesigns.filter((s) => s.mode === 'explained_aloud').length,
    trainingEst1RmGainPct,
    costPerTaskMeasured: false,
    interviewBenchmarkPassed: false,
    bossICleared: false,
    bossIICleared: false,
    bossIIICleared: false,
    bossIVCleared: false,
    arcSealed,
  };
}

export interface CheckpointReport {
  checkpoint: CheckpointRow | undefined;
  result: GateResult;
  verdictText: string;
}

/** The full Day-`day` report: real evidence, the gate result, and the
 * display verdict — final/01 §4.3's "most important sentence." Safe to
 * call before the checkpoint row exists or before its day arrives (a
 * preview), and again after sealing (re-reads the same real data). */
export async function getCheckpointReport(day: Checkpoint['day'], today: string, config: EngineConfig): Promise<CheckpointReport> {
  const [checkpoint, previousRank, evidence] = await Promise.all([
    getCheckpoint(day),
    ranksSealedBefore(day),
    computeGateEvidence(today, config),
  ]);
  const result = evaluateGates({ day, previousRank }, evidence);
  return { checkpoint, result, verdictText: verdictTextFor(result) };
}

/** A full, real export of the event log — the single source of truth —
 * as pretty-printed JSON. Not the eventual full backup format (Slice 13
 * also covers profile/settings and a restore path), but a real,
 * complete, re-importable snapshot of everything that matters: replaying
 * these events through engine/reduce.ts's applyEvents reproduces every
 * derived table exactly (the same guarantee db/projections.ts's
 * rebuildProjections relies on). */
export async function exportSnapshotJson(): Promise<string> {
  const events = await getAllEvents();
  return JSON.stringify({ exported_at: new Date().toISOString(), schema_v: 1, events }, null, 2);
}

/** Marks the day-`day` checkpoint as exported — final/08's "sealing
 * blocked without export" gate. Creates the row if it doesn't exist yet
 * (Day 0's row is created at onboarding; 14/30/60/90/120 are not). */
export async function markExported(day: Checkpoint['day'], deps: { newId(): string }): Promise<void> {
  const existing = await getCheckpoint(day);
  if (existing) {
    if (existing.sealed_at) return; // sealed rows are immutable — see sealCheckpoint
    await db.checkpoint.update(existing.id, { export_verified: true });
    return;
  }
  const row: CheckpointRow = {
    id: deps.newId(),
    day,
    export_verified: true,
    metrics: {},
    self_efficacy: {},
    automaticity: {},
    enjoyment: {},
    rank_before: 'E',
    gates: {},
    controlled: {},
    external: {},
    quest_templates_snapshot: {},
  };
  await db.checkpoint.add(row);
}

export class CheckpointSealError extends Error {}

/**
 * Seals the day-`day` checkpoint: freezes the gate result, the rank
 * transition, and a snapshot of the active quest templates into the row,
 * and sets `sealed_at`. Refuses (throws CheckpointSealError, never a
 * silent no-op) when export hasn't been verified yet — final/08's
 * "sealing blocked without export" — or when the checkpoint is already
 * sealed — final/08's "sealed checkpoints reject writes," which this
 * enforces by rejecting the seal attempt itself rather than by locking
 * the row after the fact.
 */
export async function sealCheckpoint(day: Checkpoint['day'], today: string, config: EngineConfig, deps: { now(): string }): Promise<GateResult> {
  const existing = await getCheckpoint(day);
  if (existing?.sealed_at) {
    throw new CheckpointSealError(`Day ${day} checkpoint is already sealed.`);
  }
  if (!existing?.export_verified) {
    throw new CheckpointSealError('Export the arc data before sealing this checkpoint.');
  }

  const previousRank = await ranksSealedBefore(day);
  const evidence = await computeGateEvidence(today, config);
  const result = evaluateGates({ day, previousRank }, evidence);

  const templates = await db.quest_template.toArray();
  await db.checkpoint.update(existing.id, {
    sealed_at: deps.now(),
    rank_before: previousRank,
    rank_after: result.rank,
    gates: { conditions: result.conditions, targetRank: result.targetRank } as unknown as Record<string, unknown>,
    metrics: evidence as unknown as Record<string, unknown>,
    quest_templates_snapshot: templates as unknown as Record<string, unknown>,
  });

  return result;
}
