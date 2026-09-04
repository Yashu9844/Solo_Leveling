// final/01-quests-xp-level-rank.md §8 — real evidence for the 8
// achievements and 5 identities, reusing store/checkpoint.ts's
// computeGateEvidence for everything that overlaps rather than
// re-deriving it a second way, plus the handful of facts unique to this
// screen (first quest ever, cumulative/trailing-90 MVD day counts, a
// recovered-after-a-real-gap check, and whether Day 120 specifically is
// sealed).
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { EngineConfig, QuestRecoveredPayload } from '../engine/types';
import { achievementsFrom, identitiesFrom, type AchievementEvidence, type AchievementResult, type IdentityResult } from '../engine/achievements';
import { computeGateEvidence } from './checkpoint';
import { applyEvents } from '../engine/reduce';
import { getAllEvents } from '../db/events';
import { buildDayOutcomes } from '../db/projections';
import { db } from '../db/db';

export interface AchievementsReport {
  achievements: AchievementResult[];
  identities: IdentityResult[];
}

export async function getAchievementsReport(today: string, config: EngineConfig): Promise<AchievementsReport> {
  const arc = await db.arc.toCollection().first();
  if (!arc) return { achievements: achievementsFrom(EMPTY), identities: identitiesFrom(EMPTY) };

  const [events, gateEvidence, checkpoints] = await Promise.all([
    getAllEvents(),
    computeGateEvidence(today, config),
    db.checkpoint.toArray(),
  ]);
  const state = applyEvents(events, config);

  const dayOutcomes = buildDayOutcomes(events, state.quests, arc.start_date, state.arc?.paused_dates ?? [], today);
  const totalMvdDays = dayOutcomes.filter((d) => d.mvd_met).length;
  const trailing90Cutoff = differenceInCalendarDays(parseISO(today), parseISO(arc.start_date)) >= 90
    ? dayOutcomes.slice(-90)
    : dayOutcomes;
  const mvdDaysInTrailing90 = trailing90Cutoff.filter((d) => d.mvd_met).length;

  const returnedAfterGap = events.some((e) => {
    if (e.type !== 'QUEST_RECOVERED') return false;
    const payload = e.payload as unknown as QuestRecoveredPayload;
    return differenceInCalendarDays(parseISO(e.local_date), parseISO(payload.localDate)) >= 2;
  });

  const day120 = checkpoints.find((c) => c.day === 120);

  const evidence: AchievementEvidence = {
    firstQuestCompleted: Object.keys(state.quests).length > 0,
    totalMvdDays,
    mvdDaysInTrailing90,
    problemsTotal: gateEvidence.problemsTotal,
    firstAttemptRateM: gateEvidence.firstAttemptRateM28d,
    aiFeaturePublicRepo: gateEvidence.aiFeaturePublicRepo,
    returnedAfterGap,
    wakeSdMin: gateEvidence.wakeSdMin,
    publicProjectsDeployedReachable: gateEvidence.publicProjectsDeployedReachable,
    publishedWriteups: gateEvidence.publishedWriteups,
    publicProjectsTotal: gateEvidence.publicProjectsTotal,
    trainingSessionsTotal: gateEvidence.trainingSessionsTotal,
    ifThenFiringRate: 0, // no data source yet — see engine/achievements.ts's doc comment
    day120Sealed: day120?.sealed_at !== undefined,
  };

  return { achievements: achievementsFrom(evidence), identities: identitiesFrom(evidence) };
}

const EMPTY: AchievementEvidence = {
  firstQuestCompleted: false,
  totalMvdDays: 0,
  mvdDaysInTrailing90: 0,
  problemsTotal: 0,
  firstAttemptRateM: 0,
  aiFeaturePublicRepo: false,
  returnedAfterGap: false,
  wakeSdMin: 999,
  publicProjectsDeployedReachable: 0,
  publishedWriteups: 0,
  publicProjectsTotal: 0,
  trainingSessionsTotal: 0,
  ifThenFiringRate: 0,
  day120Sealed: false,
};
