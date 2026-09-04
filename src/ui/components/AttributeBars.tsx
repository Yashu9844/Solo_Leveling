import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { localDate } from '../../engine/time';
import { realDeps } from '../../store/deps';
import { getAttributes } from '../../store/attributes';
import type { AttributeResult } from '../../engine/attributes';
import type { Attribute } from '../../engine/types';

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
    <div className="flex items-center gap-2 py-1">
      <span className="w-32 shrink-0 text-xs text-text-dim">{ATTRIBUTE_LABELS[result.attribute]}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-2">
        <div className="h-full rounded-pill bg-accent" style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-xs tabular-nums text-text">{value}</span>
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
        <div key={group.heading} className="mb-3">
          <div className="mb-1 border-b border-border pb-1 text-xxs uppercase tracking-wide text-text-faint">
            {group.heading}
          </div>
          {group.attributes.map((attribute) => {
            const result = byAttribute.get(attribute);
            return result ? <Bar key={attribute} result={result} /> : null;
          })}
        </div>
      ))}
    </div>
  );
}
