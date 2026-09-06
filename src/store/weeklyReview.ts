// final/05-motivation-moments-notifications.md §6 — the weekly review.
// "This week" is the 7 local_dates ending at `today` (inclusive); "last
// week" is the 7 before that. Domain totals (applications, problems,
// sessions, deep work) are now real — store/review.ts's evening report
// had to omit them because Slices 6-9 (the domain data) didn't exist yet;
// they do now.
import { addDays, format, parseISO } from 'date-fns';
import type { EngineConfig } from '../engine/types';
import { evaluateRules, type RuleProposal } from '../engine/rules';
import {
  attributeDeltas,
  weeklyReviewFor,
  resumeNudgeFor,
  sleepDsaCorrelation,
  type WeeklyReviewResult,
  type SleepDsaCorrelation,
  type WakeRecord,
  type DsaDayRate,
} from '../engine/weeklyReview';
import { withinWakeWindowMinutes } from '../engine/sleep';
import { SLEEP_TOLERANCE_MINUTES } from './lifestyle';
import { getAttributes } from './attributes';
import { getAllEvents } from '../db/events';
import { db } from '../db/db';

function shiftDate(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr), days), 'yyyy-MM-dd');
}

function weekDates(endInclusive: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftDate(endInclusive, -(6 - i)));
}

export interface WeeklyMetrics {
  xpEarned: number;
  deepWorkMinutes: number;
  applications: number;
  qualityApplications: number;
  problems: number;
  buildSessions: number;
  learnBlocks: number;
  trainingSessions: number;
  meanSteps: number;
}

async function metricsFor(dates: string[]): Promise<WeeklyMetrics> {
  const dateSet = new Set(dates);
  const inWeek = (d: string) => dateSet.has(d);

  const [ledger, buildSessions, learningBlocks, systemDesigns, applications, dsaAttempts, trainingSessions, metricSamples] =
    await Promise.all([
      db.xp_ledger.toArray(),
      db.build_session.toArray(),
      db.learning_block.toArray(),
      db.system_design_study.toArray(),
      db.application.toArray(),
      db.dsa_attempt.toArray(),
      db.training_session.toArray(),
      db.metric_sample.toArray(),
    ]);

  const xpEarned = ledger.filter((r) => inWeek(r.local_date)).reduce((sum, r) => sum + r.amount, 0);
  const deepWorkMinutes =
    buildSessions.filter((s) => inWeek(s.local_date)).reduce((sum, s) => sum + s.minutes, 0) +
    learningBlocks.filter((b) => inWeek(b.local_date)).reduce((sum, b) => sum + b.minutes, 0) +
    systemDesigns.filter((s) => inWeek(s.local_date)).reduce((sum, s) => sum + s.minutes, 0);

  const weekApplications = applications.filter((a) => inWeek(a.local_date));
  const weekSteps = metricSamples.filter((s) => s.kind === 'steps' && inWeek(s.local_date)).map((s) => s.value);

  return {
    xpEarned,
    deepWorkMinutes,
    applications: weekApplications.length,
    qualityApplications: weekApplications.filter((a) => a.quality_pass).length,
    problems: dsaAttempts.filter((a) => !a.is_revisit && inWeek(a.local_date)).length,
    buildSessions: buildSessions.filter((s) => inWeek(s.local_date)).length,
    learnBlocks: learningBlocks.filter((b) => inWeek(b.local_date)).length,
    trainingSessions: trainingSessions.filter((s) => inWeek(s.local_date)).length,
    meanSteps: weekSteps.length > 0 ? weekSteps.reduce((a, b) => a + b, 0) / weekSteps.length : 0,
  };
}

async function computeSleepDsaCorrelation(thisWeekDates: string[], config: EngineConfig): Promise<SleepDsaCorrelation | null> {
  const [metricSamples, dsaAttempts] = await Promise.all([db.metric_sample.toArray(), db.dsa_attempt.toArray()]);

  const wakeRecords: WakeRecord[] = metricSamples
    .filter((s) => s.kind === 'wake_time' && thisWeekDates.includes(s.local_date))
    .map((s) => ({
      local_date: s.local_date,
      onTime: withinWakeWindowMinutes(s.value, config.wakeTargetTime, SLEEP_TOLERANCE_MINUTES),
    }));

  // DSA rate per day across the whole event log, not just this week —
  // a wake record near the week's edge needs the following day's rate,
  // which can fall just outside the week window.
  const byDate = new Map<string, { firstAttempt: number; total: number }>();
  for (const a of dsaAttempts.filter((a) => !a.is_revisit)) {
    const bucket = byDate.get(a.local_date) ?? { firstAttempt: 0, total: 0 };
    bucket.total += 1;
    if (a.outcome === 'first_attempt') bucket.firstAttempt += 1;
    byDate.set(a.local_date, bucket);
  }
  const dsaRates: DsaDayRate[] = [...byDate.entries()].map(([local_date, b]) => ({
    local_date,
    firstAttemptRate: b.firstAttempt / b.total,
  }));

  return sleepDsaCorrelation(wakeRecords, dsaRates);
}

export interface WeeklyReviewReport {
  thisWeek: WeeklyMetrics;
  lastWeek: WeeklyMetrics;
  review: WeeklyReviewResult;
  resumeNudge: string | null;
  sleepDsaCorrelation: SleepDsaCorrelation | null;
}

export async function getWeeklyReview(today: string, config: EngineConfig): Promise<WeeklyReviewReport> {
  const thisWeekDates = weekDates(today);
  const lastWeekDates = weekDates(shiftDate(today, -7));
  const dateSet = new Set(thisWeekDates);

  const [thisWeek, lastWeek, afterAttributes, beforeAttributes, events, artifacts, correlation] = await Promise.all([
    metricsFor(thisWeekDates),
    metricsFor(lastWeekDates),
    getAttributes(today, config),
    getAttributes(shiftDate(today, -7), config),
    getAllEvents(),
    db.artifact.toArray(),
    computeSleepDsaCorrelation(thisWeekDates, config),
  ]);

  const proposals: RuleProposal[] = evaluateRules(events, today);
  const review = weeklyReviewFor(attributeDeltas(beforeAttributes, afterAttributes), proposals);
  const resumeNudge = resumeNudgeFor(artifacts.filter((a) => dateSet.has(a.local_date)).length);

  return { thisWeek, lastWeek, review, resumeNudge, sleepDsaCorrelation: correlation };
}
