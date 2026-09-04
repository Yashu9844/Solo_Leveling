import { describe, it, expect } from 'vitest';
import { evaluateGates, verdictTextFor, type GateEvidence } from '../../src/engine/rank';

function fullEvidence(overrides: Partial<GateEvidence> = {}): GateEvidence {
  return {
    mvdConsistency14d: 0,
    coreCompletion28d: 0,
    problemsTotal: 0,
    firstAttemptRateM28d: 0,
    trainingSessionsTotal: 0,
    meanSteps: 0,
    wakeSdMin: 999,
    screenTimeAvgMin: 999,
    qualityApplicationsTotal: 0,
    followThroughRate: 0,
    networkingConversations: 0,
    recordedMocks: 0,
    aiFeaturePublicRepo: false,
    publicProjectsTotal: 0,
    publicProjectsWithEvalSuite: 0,
    publicProjectsDeployedReachable: 0,
    publishedWriteups: 0,
    resumeVersionsTotal: 0,
    resumeExternallyReviewed: false,
    foundationTopicsIntroducedPlus: 0,
    foundationTopicsFluentPlus: 0,
    foundationTopicsRetainedPlus: 0,
    systemDesignsStudied: 0,
    systemDesignsWrittenUp: 0,
    systemDesignsExplainedAloud: 0,
    trainingEst1RmGainPct: 0,
    costPerTaskMeasured: false,
    interviewBenchmarkPassed: false,
    bossICleared: false,
    bossIICleared: false,
    bossIIICleared: false,
    bossIVCleared: false,
    arcSealed: false,
    ...overrides,
  };
}

describe('evaluateGates — Day 0 (E)', () => {
  it('always starts at E', () => {
    const result = evaluateGates({ day: 0, previousRank: 'E' }, fullEvidence());
    expect(result.rank).toBe('E');
    expect(result.targetRank).toBe('E');
  });
});

describe('evaluateGates — Day 14 (D), effort-only', () => {
  it('advances at exactly 70% MVD consistency', () => {
    const result = evaluateGates({ day: 14, previousRank: 'E' }, fullEvidence({ mvdConsistency14d: 0.7 }));
    expect(result.rank).toBe('D');
  });

  it('stalls at E just below 70%', () => {
    const result = evaluateGates({ day: 14, previousRank: 'E' }, fullEvidence({ mvdConsistency14d: 0.69 }));
    expect(result.rank).toBe('E');
    expect(result.targetRank).toBe('D');
  });
});

describe('evaluateGates — Day 30 (C), final/08\'s named fixture', () => {
  const C_EVIDENCE_ALL_MET: Partial<GateEvidence> = {
    coreCompletion28d: 0.6,
    problemsTotal: 55,
    trainingSessionsTotal: 12,
    aiFeaturePublicRepo: true,
    qualityApplicationsTotal: 70,
    foundationTopicsIntroducedPlus: 3,
  };

  it('advances to C when every condition clears at exactly its threshold', () => {
    const result = evaluateGates({ day: 30, previousRank: 'D' }, fullEvidence(C_EVIDENCE_ALL_MET));
    expect(result.conditions).toHaveLength(6);
    expect(result.conditions.every((c) => c.met)).toBe(true);
    expect(result.rank).toBe('C');
  });

  it('each condition fires exactly on its own threshold, independent of the others', () => {
    // Flip exactly one condition below threshold at a time; the other
    // five stay met, and exactly the flipped one reads unmet.
    const cases: [keyof GateEvidence, unknown, string][] = [
      ['coreCompletion28d', 0.59, 'Core completion'],
      ['problemsTotal', 54, 'problems'],
      ['trainingSessionsTotal', 11, 'training sessions'],
      ['aiFeaturePublicRepo', false, 'AI feature'],
      ['qualityApplicationsTotal', 69, 'quality applications'],
      ['foundationTopicsIntroducedPlus', 2, 'foundation topics at Introduced'],
    ];
    for (const [field, badValue, labelFragment] of cases) {
      const evidence = fullEvidence({ ...C_EVIDENCE_ALL_MET, [field]: badValue });
      const result = evaluateGates({ day: 30, previousRank: 'D' }, evidence);
      expect(result.rank).toBe('D'); // stalls at previous rank, never regresses below it
      const unmet = result.conditions.filter((c) => !c.met);
      expect(unmet).toHaveLength(1);
      expect(unmet[0]!.label).toContain(labelFragment);
    }
  });

  it('never regresses: an unmet Day-30 gate keeps whatever rank was already held', () => {
    const result = evaluateGates({ day: 30, previousRank: 'D' }, fullEvidence());
    expect(result.rank).toBe('D');
    expect(result.rank).not.toBe('E');
  });
});

describe('evaluateGates — Day 60 (B)', () => {
  const B_EVIDENCE_ALL_MET: Partial<GateEvidence> = {
    coreCompletion28d: 0.65,
    problemsTotal: 130,
    firstAttemptRateM28d: 0.5,
    trainingSessionsTotal: 28,
    publicProjectsWithEvalSuite: 1,
    qualityApplicationsTotal: 150,
    resumeVersionsTotal: 2,
    resumeExternallyReviewed: true,
    foundationTopicsFluentPlus: 3,
    bossICleared: true,
  };

  it('advances to B when every condition clears', () => {
    const result = evaluateGates({ day: 60, previousRank: 'C' }, fullEvidence(B_EVIDENCE_ALL_MET));
    expect(result.rank).toBe('B');
  });

  it('resume v2 requires BOTH >= 2 versions AND an external review', () => {
    const missingReview = evaluateGates(
      { day: 60, previousRank: 'C' },
      fullEvidence({ ...B_EVIDENCE_ALL_MET, resumeExternallyReviewed: false })
    );
    expect(missingReview.rank).toBe('C');

    const onlyOneVersion = evaluateGates(
      { day: 60, previousRank: 'C' },
      fullEvidence({ ...B_EVIDENCE_ALL_MET, resumeVersionsTotal: 1 })
    );
    expect(onlyOneVersion.rank).toBe('C');
  });

  it('without Boss I cleared, B never fires (bosses are Slice 13 — always false today)', () => {
    const result = evaluateGates(
      { day: 60, previousRank: 'C' },
      fullEvidence({ ...B_EVIDENCE_ALL_MET, bossICleared: false })
    );
    expect(result.rank).toBe('C');
  });
});

describe('evaluateGates — Day 120 (S), the core-completion band', () => {
  it('60-85% core completion is inside the band; 90% is outside it (too high still fails)', () => {
    const S_BASE: Partial<GateEvidence> = {
      problemsTotal: 240,
      firstAttemptRateM28d: 0.6,
      interviewBenchmarkPassed: true,
      foundationTopicsIntroducedPlus: 9,
      foundationTopicsFluentPlus: 8,
      foundationTopicsRetainedPlus: 3,
      systemDesignsStudied: 12,
      systemDesignsWrittenUp: 4,
      systemDesignsExplainedAloud: 2,
      publicProjectsWithEvalSuite: 3,
      publicProjectsDeployedReachable: 1,
      costPerTaskMeasured: true,
      publishedWriteups: 1,
      resumeVersionsTotal: 3,
      resumeExternallyReviewed: true,
      qualityApplicationsTotal: 280,
      followThroughRate: 0.7,
      networkingConversations: 8,
      recordedMocks: 4,
      trainingSessionsTotal: 55,
      trainingEst1RmGainPct: 0.12,
      meanSteps: 8000,
      wakeSdMin: 44,
      screenTimeAvgMin: 60,
      bossICleared: true,
      bossIICleared: true,
      bossIIICleared: true,
      bossIVCleared: true,
      arcSealed: true,
    };

    const inBand = evaluateGates({ day: 120, previousRank: 'A' }, fullEvidence({ ...S_BASE, coreCompletion28d: 0.7 }));
    expect(inBand.rank).toBe('S');

    const tooHigh = evaluateGates({ day: 120, previousRank: 'A' }, fullEvidence({ ...S_BASE, coreCompletion28d: 0.9 }));
    expect(tooHigh.rank).toBe('A');
  });
});

describe('verdictTextFor', () => {
  // final/01 §4.3's mockup shows an 8-item illustrative checklist with
  // fictional numbers, but its OWN 8 items omit "Boss I cleared" even
  // though the §4.2 requirements table lists it as a ninth, real
  // condition for Rank B — the mockup is display-format prose, not a
  // literal fixture. This test follows the requirements table (9
  // conditions), not the mockup's illustrative count.
  it('final/01 §4.3\'s display shape when the gate is unmet', () => {
    const result = evaluateGates(
      { day: 60, previousRank: 'C' },
      fullEvidence({
        coreCompletion28d: 0.71,
        problemsTotal: 141,
        trainingSessionsTotal: 31,
        qualityApplicationsTotal: 162,
        foundationTopicsFluentPlus: 4,
      })
    );
    expect(verdictTextFor(result)).toBe('Rank C -> B requires 9 conditions. You meet 5.');
  });

  it('states the advance once every condition clears', () => {
    const result = evaluateGates({ day: 14, previousRank: 'E' }, fullEvidence({ mvdConsistency14d: 1 }));
    expect(verdictTextFor(result)).toBe('Rank D reached. 1 of 1 conditions met.');
  });
});
