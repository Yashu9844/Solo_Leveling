import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { localDate } from '../../engine/time';
import { realDeps } from '../../store/deps';
import { db } from '../../db/db';
import { getDsaSkillsOverview, getFoundationSkillsOverview, getCareerTreeOverview, type TopicMastery, type CareerTreeOverview } from '../../store/skills';
import { getInterviewBenchmarkHistory, getInterviewBenchmarkPassed, logInterviewBenchmark } from '../../store/training';
import type { MasteryState } from '../../engine/types';
import { ScreenHeader } from '../kit';

// final/03 §1's "5-segment bar, never a percentage" — one segment per
// state, filled cumulatively up to the current one.
const MASTERY_ORDER: MasteryState[] = ['unseen', 'introduced', 'applied', 'fluent', 'retained'];

function MasteryBar({ state }: { state: MasteryState }) {
  const filled = MASTERY_ORDER.indexOf(state);
  return (
    <div className="flex gap-1" aria-label={state}>
      {MASTERY_ORDER.map((_, i) => (
        <div key={i} className={`h-1.5 w-4 rounded-pill ${i < filled ? 'bg-accent' : 'bg-surface-2'}`} />
      ))}
    </div>
  );
}

function TopicRow({ item }: { item: TopicMastery }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-text-dim">{item.topic}</span>
      <MasteryBar state={item.state} />
    </div>
  );
}

// final/03 §4.2 — reference only, no per-skill tracked data exists for
// any of these, matching final/06's "flat lists" description.
const AI_TIERS: { title: string; items: string[] }[] = [
  {
    title: 'Tier 0 — table stakes',
    items: [
      'LLM fundamentals',
      'Prompting with cache-awareness',
      'Structured outputs',
      'Tool calling',
      'Embeddings',
      'RAG basics',
      'Vector store selection',
      'Model landscape and pricing',
    ],
  },
  {
    title: 'Tier 1 — differentiators',
    items: ['Evaluation design', 'Agent orchestration', 'Context engineering', 'MCP', 'Cost & latency'],
  },
  {
    title: 'Tier 2 — production',
    items: [
      'Observability and tracing',
      'Guardrails and OWASP LLM risks',
      'Sandboxing and kill-switches',
      'Deployment',
      'Async job architecture',
    ],
  },
  {
    title: 'Tier 3 — frontier',
    items: ['Multi-agent coordination', 'Computer-use / vision-action loops', 'Fine-tuning'],
  },
];

export function Skills() {
  const [dsa, setDsa] = useState<TopicMastery[] | null>(null);
  const [foundations, setFoundations] = useState<TopicMastery[] | null>(null);
  const [careerTree, setCareerTree] = useState<CareerTreeOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getDsaSkillsOverview(), getFoundationSkillsOverview(), getCareerTreeOverview()]).then(
      ([d, f, c]) => {
        if (!cancelled) {
          setDsa(d);
          setFoundations(f);
          setCareerTree(c);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <ScreenHeader title="SKILLS" />
      <div className="px-gutter pb-6 pt-4">

      <Section title="DSA">
        {dsa?.map((item) => <TopicRow key={item.topic} item={item} />)}
      </Section>

      <Section title="SE Foundations">
        {foundations?.map((item) => <TopicRow key={item.topic} item={item} />)}
      </Section>

      <Section title="AI / Agentic tiers">
        {AI_TIERS.map((tier) => (
          <div key={tier.title} className="mb-3">
            <div className="mb-1 text-xs text-text-dim">{tier.title}</div>
            <div className="flex flex-wrap gap-1.5">
              {tier.items.map((item) => (
                <span key={item} className="rounded-pill border border-border px-2 py-0.5 text-xxs text-text-faint">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </Section>

      {careerTree && (
        <Section title="Career tree">
          <TreeRow label="Software engineering -> foundations" value={`${foundations?.filter((f) => f.state !== 'unseen').length ?? 0}/9`} />
          <TreeRow label="AI / Agentic -> tiers" value="reference above" />
          <TreeRow
            label="Projects -> artifacts"
            value={Object.entries(careerTree.artifactsByKind)
              .filter(([, n]) => (n ?? 0) > 0)
              .map(([kind, n]) => `${n} ${kind}`)
              .join(' · ') || '0'}
          />
          <TreeRow label="Resume -> versions" value={String(careerTree.resumeVersions)} />
          <TreeRow label="Applications" value={`${careerTree.applications} (${careerTree.qualityApplications} quality)`} />
          <TreeRow label="Interviews" value={String(careerTree.interviews)} />
          <TreeRow label="Offer" value={String(careerTree.offers)} />
        </Section>
      )}

        <Section title="Interview-readiness benchmark">
          <InterviewBenchmarkCard />
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-1 border-b border-border pb-1 text-xxs uppercase tracking-wide text-text-faint">{title}</div>
      {children}
    </div>
  );
}

function TreeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-text-dim">{label}</span>
      <span className="font-mono text-sm text-text">{value}</span>
    </div>
  );
}

/** final/02 §2.2 — "solve 3 randomly-drawn mediums in 90 minutes total,
 * unseen, first-attempt, with a working solution and a stated
 * complexity. Self-administered, logged, repeatable." */
function InterviewBenchmarkCard() {
  const [passed, setPassed] = useState<boolean | null>(null);
  const [history, setHistory] = useState<{ local_date: string; passed: boolean }[]>([]);
  const [arcId, setArcId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const [p, h, arc] = await Promise.all([getInterviewBenchmarkPassed(), getInterviewBenchmarkHistory(), db.arc.toCollection().first()]);
    setPassed(p);
    setHistory(h);
    setArcId(arc?.id ?? null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleLog(didPass: boolean) {
    if (!arcId || submitting) return;
    setSubmitting(true);
    try {
      const today = localDate(realDeps.now(), DEFAULT_CONFIG.arc.timezone, DEFAULT_CONFIG.arc.dayBoundaryHour);
      await logInterviewBenchmark(today, arcId, didPass, DEFAULT_CONFIG, realDeps);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!arcId) return null;

  return (
    <div>
      <p className="text-sm text-text-dim">
        3 randomly-drawn mediums, 90 minutes total, unseen, first-attempt, a working solution, and a stated complexity.
      </p>
      <p className="mt-2 text-sm text-text">{passed ? '✓ Passed.' : 'Not yet passed.'}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleLog(true)}
          className="min-h-[44px] flex-1 rounded-md border border-accent text-sm text-accent disabled:opacity-40"
        >
          Passed
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleLog(false)}
          className="min-h-[44px] flex-1 rounded-md border border-border text-sm text-text-dim disabled:opacity-40"
        >
          Not yet
        </button>
      </div>
      {history.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {history.map((h, i) => (
            <li key={i} className="text-xs text-text-faint">
              {h.local_date} — {h.passed ? 'passed' : 'not yet'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
