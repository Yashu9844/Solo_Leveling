// final/05-motivation-moments-notifications.md §6 — the weekly review.
// "This week" is the 7 local_dates ending at `today` (inclusive); "last
// week" is the 7 before that. Domain totals (applications, problems,
// sessions, deep work) are now real — store/review.ts's evening report
// had to omit them because Slices 6-9 (the domain data) didn't exist yet;
// they do now.
import { addDays, format, parseISO } from 'date-fns';
import type { EngineConfig } from '../engine/types';
import { evaluateRules, type RuleProposal } from '../engine/rules';
import { attributeDeltas, weeklyReviewFor, type WeeklyReviewResult } from '../engine/weeklyReview';
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

export interface WeeklyReviewReport {
  thisWeek: WeeklyMetrics;
  lastWeek: WeeklyMetrics;
  review: WeeklyReviewResult;
}

export async function getWeeklyReview(today: string, config: EngineConfig): Promise<WeeklyReviewReport> {
  const thisWeekDates = weekDates(today);
  const lastWeekDates = weekDates(shiftDate(today, -7));

  const [thisWeek, lastWeek, afterAttributes, beforeAttributes, events] = await Promise.all([
    metricsFor(thisWeekDates),
    metricsFor(lastWeekDates),
    getAttributes(today, config),
    getAttributes(shiftDate(today, -7), config),
    getAllEvents(),
  ]);

  const proposals: RuleProposal[] = evaluateRules(events, today);
  const review = weeklyReviewFor(attributeDeltas(beforeAttributes, afterAttributes), proposals);

  return { thisWeek, lastWeek, review };
}
