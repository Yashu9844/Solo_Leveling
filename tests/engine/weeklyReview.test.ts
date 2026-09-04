import { describe, it, expect } from 'vitest';
import { attributeDeltas, bottleneckFrom, improvedFrom, declinedFrom, weeklyReviewFor } from '../../src/engine/weeklyReview';
import type { AttributeResult } from '../../src/engine/attributes';
import type { RuleProposal } from '../../src/engine/rules';

function snapshot(values: Partial<Record<AttributeResult['attribute'], number>>): AttributeResult[] {
  const all: AttributeResult['attribute'][] = ['DISCIPLINE', 'DEPTH', 'PROBLEM_SOLVING', 'ENGINEERING', 'MOMENTUM', 'VITALITY'];
  return all.map((attribute) => ({ attribute, value: values[attribute] ?? 0, components: {} }));
}

describe('attributeDeltas', () => {
  it('hand-computed: pairs before/after by attribute name and computes the delta', () => {
    const before = snapshot({ DISCIPLINE: 72, PROBLEM_SOLVING: 54, MOMENTUM: 60 });
    const after = snapshot({ DISCIPLINE: 60, PROBLEM_SOLVING: 61, MOMENTUM: 70 });
    const deltas = attributeDeltas(before, after);

    const discipline = deltas.find((d) => d.attribute === 'DISCIPLINE')!;
    expect(discipline).toEqual({ attribute: 'DISCIPLINE', before: 72, after: 60, delta: -12 });

    const problemSolving = deltas.find((d) => d.attribute === 'PROBLEM_SOLVING')!;
    expect(problemSolving.delta).toBe(7);

    const momentum = deltas.find((d) => d.attribute === 'MOMENTUM')!;
    expect(momentum.delta).toBe(10);
  });

  it('skips an attribute missing from the before snapshot', () => {
    const before = [{ attribute: 'DISCIPLINE' as const, value: 50, components: {} }];
    const after = snapshot({ DISCIPLINE: 55, VITALITY: 40 });
    const deltas = attributeDeltas(before, after);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.attribute).toBe('DISCIPLINE');
  });
});

describe('bottleneckFrom — final/05 §6\'s fixture week ("DECLINED Discipline (sleep window)" -> BOTTLENECK Sleep window)', () => {
  it('picks the single most-declined attribute', () => {
    const before = snapshot({ DISCIPLINE: 72, PROBLEM_SOLVING: 54, MOMENTUM: 60, VITALITY: 50 });
    const after = snapshot({ DISCIPLINE: 50, PROBLEM_SOLVING: 61, MOMENTUM: 70, VITALITY: 48 });
    const deltas = attributeDeltas(before, after);
    // DISCIPLINE drops 22, VITALITY drops 2 -> DISCIPLINE is the bottleneck.
    expect(bottleneckFrom(deltas)).toBe('DISCIPLINE');
  });

  it('is null when nothing declined', () => {
    const before = snapshot({ DISCIPLINE: 50 });
    const after = snapshot({ DISCIPLINE: 55 });
    expect(bottleneckFrom(attributeDeltas(before, after))).toBeNull();
  });
});

describe('improvedFrom / declinedFrom', () => {
  it('hand-computed: matches final/05 §6\'s fixture week exactly', () => {
    // "IMPROVED Problem solving · Momentum" · "DECLINED Discipline"
    const before = snapshot({ DISCIPLINE: 72, PROBLEM_SOLVING: 54, MOMENTUM: 60, ENGINEERING: 63, VITALITY: 50, DEPTH: 61 });
    const after = snapshot({ DISCIPLINE: 50, PROBLEM_SOLVING: 65, MOMENTUM: 68, ENGINEERING: 63, VITALITY: 50, DEPTH: 61 });
    const deltas = attributeDeltas(before, after);

    // PROBLEM_SOLVING +11, MOMENTUM +8 -> strongest first.
    expect(improvedFrom(deltas)).toEqual(['PROBLEM_SOLVING', 'MOMENTUM']);
    expect(declinedFrom(deltas)).toEqual(['DISCIPLINE']);
  });

  it('respects the limit', () => {
    const before = snapshot({ DISCIPLINE: 10, DEPTH: 10, PROBLEM_SOLVING: 10, ENGINEERING: 10, MOMENTUM: 10, VITALITY: 10 });
    const after = snapshot({ DISCIPLINE: 90, DEPTH: 80, PROBLEM_SOLVING: 70, ENGINEERING: 60, MOMENTUM: 50, VITALITY: 40 });
    expect(improvedFrom(attributeDeltas(before, after), 2)).toHaveLength(2);
    expect(improvedFrom(attributeDeltas(before, after), 2)[0]).toBe('DISCIPLINE'); // +80, the largest
  });
});

describe('weeklyReviewFor — fixture week end-to-end (final/08\'s Slice 11 done criterion)', () => {
  it('assembles improved/declined/bottleneck/proposals from a hand-built fixture week', () => {
    const before = snapshot({ DISCIPLINE: 72, PROBLEM_SOLVING: 54, MOMENTUM: 60 });
    const after = snapshot({ DISCIPLINE: 45, PROBLEM_SOLVING: 61, MOMENTUM: 70 });
    const deltas = attributeDeltas(before, after);
    const proposals: RuleProposal[] = [
      { rule: 'LEARN_SHIP_RATIO', message: 'SHIP only.', fires_on: 'ratio > 3:1' },
    ];

    const review = weeklyReviewFor(deltas, proposals);
    expect(review.bottleneck).toBe('DISCIPLINE');
    expect(review.declined).toEqual(['DISCIPLINE']);
    expect(review.improved).toEqual(['MOMENTUM', 'PROBLEM_SOLVING']);
    expect(review.proposals).toEqual(proposals);
  });

  it('an empty-history fixture week produces no bottleneck and no proposals', () => {
    const flat = snapshot({});
    const review = weeklyReviewFor(attributeDeltas(flat, flat), []);
    expect(review.bottleneck).toBeNull();
    expect(review.improved).toEqual([]);
    expect(review.declined).toEqual([]);
    expect(review.proposals).toEqual([]);
  });
});
