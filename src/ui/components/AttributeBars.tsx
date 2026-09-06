import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { localDate } from '../../engine/time';
import { realDeps } from '../../store/deps';
import { getAttributes } from '../../store/attributes';
import type { AttributeResult } from '../../engine/attributes';
import type { Attribute } from '../../engine/types';
import { MeterBar, SectionLabel } from '../kit';

const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  DISCIPLINE: 'DISCIPLINE',
  DEPTH: 'DEPTH',
  PROBLEM_SOLVING: 'PROBLEM SOLVING',
  ENGINEERING: 'ENGINEERING',
  MOMENTUM: 'MOMENTUM',
  VITALITY: 'VITALITY',
};

// final/06 §5.6's display order, grouped under Mind/Craft/Career/Body —
// the six attributes are never averaged into a composite (final/01 §5).
const GROUPS: { heading: string; attributes: Attribute[] }[] = [
  { heading: 'MIND', attributes: ['DISCIPLINE', 'DEPTH', 'PROBLEM_SOLVING'] },
  { heading: 'CRAFT', attributes: ['ENGINEERING'] },
  { heading: 'CAREER', attributes: ['MOMENTUM'] },
  { heading: 'BODY', attributes: ['VITALITY'] },
];

function Bar({ result }: { result: AttributeResult }) {
  const value = Math.round(result.value);
  return (
    <div className="flex items-center gap-3 py-1.5">
      {/* Fixed label column so the bars align into one edge down the
          screen — six attributes read as a set only if they share a
          baseline. Wraps rather than truncating: "PROBLEM SOLVING" does
          not fit on one line here, and an attribute whose name is cut to
          "PROBLEM SOL…" has lost the only thing identifying its row.
          A slightly taller row is the cheaper cost, and it holds at
          every text scale rather than only at the default. */}
      <span className="w-[104px] shrink-0 text-xs leading-[1.25] text-ink-700">
        {ATTRIBUTE_LABELS[result.attribute]}
      </span>
      <MeterBar pct={value} height={6} label={ATTRIBUTE_LABELS[result.attribute]} className="min-w-0 flex-1" />
      <span className="w-7 shrink-0 text-right font-mono text-xs tabular-nums text-ink-100">
        {value}
      </span>
    </div>
  );
}

/** All 0-100, non-editable, 28-day rolling window — final/01 §5. Shared
 * by Profile and Progress's SYSTEM sub-tab. */
export function AttributeBars() {
  const [results, setResults] = useState<AttributeResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = localDate(realDeps.now(), DEFAULT_CONFIG.arc.timezone, DEFAULT_CONFIG.arc.dayBoundaryHour);
    void getAttributes(today, DEFAULT_CONFIG).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!results) return null;
  const byAttribute = new Map(results.map((r) => [r.attribute, r]));

  return (
    <div className="mt-6" data-testid="attribute-bars">
      {GROUPS.map((group) => (
        <div key={group.heading} className="mb-4">
          <SectionLabel rule className="mb-2">
            {group.heading}
          </SectionLabel>
          {group.attributes.map((attribute) => {
            const result = byAttribute.get(attribute);
            return result ? <Bar key={attribute} result={result} /> : null;
          })}
        </div>
      ))}
    </div>
  );
}
