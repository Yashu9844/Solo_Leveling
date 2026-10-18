import { DSA_TOPICS } from '../engine/dsa';
import { FOUNDATION_TOPICS } from '../engine/foundations';
import { getDsaTopicMastery, getFoundationTopicMastery } from './mastery';
import { db } from '../db/db';
import type { MasteryState, EngineConfig, EngineDeps } from '../engine/types';
import { logLearningBlock } from './build';
import { logProblem, type LogProblemInput } from './dsa';
import { foundationMasteryFor } from '../engine/foundations';

export interface TopicMastery {
  topic: string;
  state: MasteryState;
}

export const AI_TIER_TOPICS = [
  'LLM Fundamentals',
  'Prompting with Cache-Awareness',
  'Structured Outputs',
  'Tool Calling',
  'Embeddings',
  'RAG Basics',
  'Vector Store Selection',
  'Model Landscape & Pricing',
  'Evaluation Design',
  'Agent Orchestration',
  'Context Engineering',
  'MCP Protocol',
  'Cost & Latency Optimization',
  'Observability & Tracing',
  'Guardrails & OWASP LLM Risks',
  'Sandboxing & Kill-Switches',
  'Production Deployment',
  'Async Job Architecture',
  'Multi-Agent Coordination',
  'Computer-Use / Vision-Action Loops',
  'Custom Fine-Tuning',
] as const;

export async function getDsaSkillsOverview(): Promise<TopicMastery[]> {
  return Promise.all(DSA_TOPICS.map(async (topic) => ({ topic, state: await getDsaTopicMastery(topic) })));
}

export async function getFoundationSkillsOverview(): Promise<TopicMastery[]> {
  return Promise.all(FOUNDATION_TOPICS.map(async (topic) => ({ topic, state: await getFoundationTopicMastery(topic) })));
}

export async function getAiSkillsOverview(): Promise<TopicMastery[]> {
  const blocks = await db.learning_block.toArray();
  return AI_TIER_TOPICS.map((topic) => ({
    topic,
    state: foundationMasteryFor(
      topic,
      blocks.map((b) => ({ topic: b.topic, local_date: b.local_date }))
    ),
  }));
}

export interface TodayAutoFillSummary {
  dsaCount: number;
  learningBlockCount: number;
  buildMinutes: number;
  recentTopics: string[];
}

export async function getTodayAutoFillSummary(today: string): Promise<TodayAutoFillSummary> {
  const [dsaAttempts, learningBlocks, buildSessions] = await Promise.all([
    db.dsa_attempt.where('local_date').equals(today).toArray(),
    db.learning_block.where('local_date').equals(today).toArray(),
    db.build_session.where('local_date').equals(today).toArray(),
  ]);

  const dsaProblems = await db.dsa_problem.toArray();
  const problemMap = new Map(dsaProblems.map((p) => [p.id, p]));

  const dsaTopicsToday = dsaAttempts.map((a) => problemMap.get(a.problem_id)?.topic).filter((t): t is string => Boolean(t));
  const learnTopicsToday = learningBlocks.map((b) => b.topic);

  const uniqueTopics = Array.from(new Set([...dsaTopicsToday, ...learnTopicsToday]));
  const buildMinutes = buildSessions.reduce((sum, s) => sum + s.minutes, 0);

  return {
    dsaCount: dsaAttempts.length,
    learningBlockCount: learningBlocks.length,
    buildMinutes,
    recentTopics: uniqueTopics,
  };
}

export async function logQuickSkillPractice(
  today: string,
  arcId: string,
  topic: string,
  minutes: number,
  config: EngineConfig,
  deps: EngineDeps,
  note?: string
): Promise<void> {
  await logLearningBlock(today, arcId, topic, minutes, config, deps, note);
}

export interface QuickDsaPractice {
  topic: string;
  title: string;
  difficulty: LogProblemInput['difficulty'];
  outcome: LogProblemInput['outcome'];
  minutes: number;
  insight?: string;
}

/**
 * Practising a DSA topic from the Skills screen logs the problem itself.
 *
 * A DSA topic's mastery and the weekly "N problems" quest are both read
 * from logged problem attempts. This used to write a learning block
 * instead, which neither of them reads, so practising Arrays moved
 * nothing — the skill stayed unseen and the weekly count stayed at 0.
 * Going through logProblem also completes the DSA quest, the same as
 * logging from Today.
 */
export async function logQuickDsaPractice(
  today: string,
  arcId: string,
  practice: QuickDsaPractice,
  config: EngineConfig,
  deps: EngineDeps
): Promise<void> {
  const title = practice.title.trim();
  if (!title) throw new Error('A problem name is required.');
  await logProblem(
    today,
    arcId,
    {
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      title,
      topic: practice.topic,
      difficulty: practice.difficulty,
      outcome: practice.outcome,
      minutes: practice.minutes,
      insight: practice.insight,
    },
    config,
    deps
  );
}

export interface CareerTreeOverview {
  applications: number;
  qualityApplications: number;
  resumeVersions: number;
  interviews: number;
  offers: number;
  artifactsByKind: Partial<Record<'feature' | 'eval' | 'project' | 'deployment' | 'writeup', number>>;
}

export async function getCareerTreeOverview(): Promise<CareerTreeOverview> {
  const [applications, resumeVersions, careerEvents, artifacts] = await Promise.all([
    db.application.toArray(),
    db.resume_version.toArray(),
    db.career_event.toArray(),
    db.artifact.toArray(),
  ]);

  const artifactsByKind: CareerTreeOverview['artifactsByKind'] = {};
  for (const kind of ['feature', 'eval', 'project', 'deployment', 'writeup'] as const) {
    artifactsByKind[kind] = artifacts.filter((a) => a.kind === kind).length;
  }

  return {
    applications: applications.length,
    qualityApplications: applications.filter((a) => a.quality_pass).length,
    resumeVersions: resumeVersions.length,
    interviews: careerEvents.filter((e) => e.kind === 'interview' || e.kind === 'onsite').length,
    offers: careerEvents.filter((e) => e.kind === 'offer').length,
    artifactsByKind,
  };
}

