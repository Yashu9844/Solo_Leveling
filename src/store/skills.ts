// final/06 §row 11 — "SKILLS | DSA topics · SE foundations · AI tiers ·
// career tree | L10." This screen was scaffolded (Skills.tsx said
// "Phase 0 — not implemented") but never built. AI tiers (final/03
// §4.2) have no per-skill tracked data anywhere in this build — they're
// rendered as a flat reference list, not an interactive one, which
// matches the row's own "flat lists" description. The "career tree" is
// final/02 §6's MAIN QUEST breakdown: every branch already has real
// backing data in this app (SOFTWARE ENGINEERING -> foundations mastery,
// AI/AGENTIC -> tiers, PROJECTS -> artifact table, RESUME -> resume_
// version, APPLICATIONS/INTERVIEWS/OFFER -> application/career_event) —
// nothing here is invented, it's a rollup of tables the app already
// maintains.
import { DSA_TOPICS } from '../engine/dsa';
import { FOUNDATION_TOPICS } from '../engine/foundations';
import { getDsaTopicMastery, getFoundationTopicMastery } from './mastery';
import { db } from '../db/db';
import type { MasteryState } from '../engine/types';

export interface TopicMastery {
  topic: string;
  state: MasteryState;
}

export async function getDsaSkillsOverview(): Promise<TopicMastery[]> {
  return Promise.all(DSA_TOPICS.map(async (topic) => ({ topic, state: await getDsaTopicMastery(topic) })));
}

export async function getFoundationSkillsOverview(): Promise<TopicMastery[]> {
  return Promise.all(FOUNDATION_TOPICS.map(async (topic) => ({ topic, state: await getFoundationTopicMastery(topic) })));
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
    // final/02 §6 groups "INTERVIEWS" as one branch; onsite is a
    // further-stage interview, not a separate branch.
    interviews: careerEvents.filter((e) => e.kind === 'interview' || e.kind === 'onsite').length,
    offers: careerEvents.filter((e) => e.kind === 'offer').length,
    artifactsByKind,
  };
}
