// final/05-motivation-moments-notifications.md §6 — the weekly review's
// structured metrics: attribute movement (IMPROVED/DECLINED), the single
// BOTTLENECK, and NEXT WEEK's proposals. The mockup also shows a
// correlational insight sentence ("your DSA rate drops 27 points after a
// missed sleep window") and a resume-content nudge — both need either
// real correlation analysis or free-text authoring this module doesn't
// attempt; flagged as a deferred scope cut in the Slice 11 report. The
// rest of the review (the domain summary lines — applications, problems,
// sessions) is plain arithmetic the UI renders directly from store data,
// not modelled here.
import type { RuleProposal } from './rules';
import type { Attribute, AttributeResult } from './attributes';

export interface AttributeDelta {
  attribute: Attribute;
  before: number;
  after: number;
  delta: number;
}

/** Pure. Pairs two attribute snapshots (last week's close, this week's
 * close) by attribute name. Both arrays are expected to carry all six
 * attributes; a missing pairing is skipped rather than assumed 0, since
 * "no snapshot yet" (arc younger than two weeks) is a different thing
 * from "genuinely at 0". */
export function attributeDeltas(before: AttributeResult[], after: AttributeResult[]): AttributeDelta[] {
  const beforeByAttribute = new Map(before.map((r) => [r.attribute, r.value]));
  const deltas: AttributeDelta[] = [];
  for (const a of after) {
    const b = beforeByAttribute.get(a.attribute);
    if (b === undefined) continue;
    deltas.push({ attribute: a.attribute, before: b, after: a.value, delta: a.value - b });
  }
  return deltas;
}

/** Pure. The single most-declined attribute, or null if nothing declined
 * (every attribute held or rose — final/05 §6 shows exactly one
 * BOTTLENECK line, not a ranked list). */
export function bottleneckFrom(deltas: AttributeDelta[]): Attribute | null {
  const declined = deltas.filter((d) => d.delta < 0);
  if (declined.length === 0) return null;
  return declined.reduce((worst, d) => (d.delta < worst.delta ? d : worst)).attribute;
}

/** Pure. Up to `limit` attributes with the largest positive delta,
 * strongest first — final/05 §6's "IMPROVED Problem solving · Momentum". */
export function improvedFrom(deltas: AttributeDelta[], limit = 2): Attribute[] {
  return deltas
    .filter((d) => d.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit)
    .map((d) => d.attribute);
}

/** Pure. Up to `limit` attributes with the largest negative delta,
 * worst first. */
export function declinedFrom(deltas: AttributeDelta[], limit = 2): Attribute[] {
  return deltas
    .filter((d) => d.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, limit)
    .map((d) => d.attribute);
}

export interface WeeklyReviewResult {
  improved: Attribute[];
  declined: Attribute[];
  bottleneck: Attribute | null;
  proposals: RuleProposal[];
}

/** Pure assembly — the store layer computes `deltas` (from two
 * store/attributes.ts snapshots) and `proposals` (from
 * engine/rules.ts's evaluateRules over the week's events); this just
 * combines them into the review's structured shape. */
export function weeklyReviewFor(deltas: AttributeDelta[], proposals: RuleProposal[]): WeeklyReviewResult {
  return {
    improved: improvedFrom(deltas),
    declined: declinedFrom(deltas),
    bottleneck: bottleneckFrom(deltas),
    proposals,
  };
}
