import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { localDate } from '../../engine/time';
import { realDeps } from '../../store/deps';
import { db } from '../../db/db';
import { getDsaSkillsOverview, getFoundationSkillsOverview, getCareerTreeOverview, type TopicMastery, type CareerTreeOverview } from '../../store/skills';
import { getInterviewBenchmarkHistory, getInterviewBenchmarkPassed, logInterviewBenchmark } from '../../store/training';
import type { MasteryState } from '../../engine/types';
import {
  ArtLayer,
  FramedPanel,
  PrimaryButton,
  ScreenHeader,
  SectionLabel,
  SecondaryButton,
  SegmentBar,
} from '../kit';

// final/03 §1's "5-segment bar, never a percentage" — one segment per
// state, filled cumulatively up to the current one.
const MASTERY_ORDER: MasteryState[] = ['unseen', 'introduced', 'applied', 'fluent', 'retained'];

function TopicRow({ item }: { item: TopicMastery }) {
  const filled = MASTERY_ORDER.indexOf(item.state);
  const touched = filled > 0;

  // NOTE: skills.spec reaches the bar with
  // getByText('Arrays', { exact: true }).locator('..'), so the topic's
  // own element and the aria-labelled bar have to stay siblings under a
  // single parent. Any regrouping here must keep that shape.
  return (
    <div
      className="flex items-center gap-3 py-2"
      style={{ borderBottom: '1px solid var(--hair-faint)' }}
    >
      <span
        className={[
          'min-w-0 flex-1 truncate text-sm',
          touched ? 'text-ink-300' : 'text-ink-700',
        ].join(' ')}
      >
        {item.topic}
      </span>
      {/* The state spelled out, not only encoded in the bar: five levels
          of a two-tone bar are not tellable apart at a glance, and the
          word is the thing someone actually wants to read. Hidden from
          assistive tech because SegmentBar already announces it.

          Printed only once a topic has been touched. Eighteen rows all
          shouting UNSEEN is noise that buries the two lines that matter,
          and the empty bar already says it. Width is intrinsic rather
          than a fixed column — "INTRODUCED" is nearly twice the width of
          "FLUENT", and a column sized for the longest word steals space
          from the topic name on every other row. */}
      {touched && (
        <span className="shrink-0 text-xxs uppercase text-accent-mid" aria-hidden>
          {item.state}
        </span>
      )}
      <SegmentBar filled={filled} label={item.state} className="shrink-0" />
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

  const dsaTouched = dsa?.filter((t) => t.state !== 'unseen').length ?? 0;
  const foundationsTouched = foundations?.filter((t) => t.state !== 'unseen').length ?? 0;

  return (
    <>
      <ScreenHeader title="SKILLS" />
      <div className="pb-6">
        {/* The band. Skills is a long list screen and needs one place to
            look first; two counts on the plate say how far into the two
            tracked trees this arc has actually gone. Counts, not
            percentages — mastery here is ordinal (final/03 §1), and a
            percentage would claim a precision the model does not have. */}
        <div className="relative mt-4 h-[132px] overflow-hidden">
          <ArtLayer slot="skills" scrim="band" focal="50% 35%" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-8 px-gutter pb-4">
            <BandStat value={dsaTouched} total={dsa?.length ?? 0} label="DSA topics" />
            <BandStat value={foundationsTouched} total={foundations?.length ?? 0} label="Foundations" />
          </div>
        </div>

        <div className="px-gutter">
          <Section title="DSA">{dsa?.map((item) => <TopicRow key={item.topic} item={item} />)}</Section>

          <Section title="SE Foundations">
            {foundations?.map((item) => <TopicRow key={item.topic} item={item} />)}
          </Section>

          <Section title="AI / Agentic tiers">
            {/* Reference material, and styled to say so: no bars, no
                counts, nothing that implies these are being measured. */}
            {AI_TIERS.map((tier) => (
              <div key={tier.title} className="mb-4 last:mb-0">
                <div className="mb-2 text-xs text-ink-500">{tier.title}</div>
                <div className="flex flex-wrap gap-1.5">
                  {tier.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-pill px-2.5 py-1 text-xxs text-ink-700"
                      style={{ border: '1px solid var(--hair)', background: 'var(--surface)' }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </Section>

          {careerTree && (
            <Section title="Career tree">
              <TreeRow label="Software engineering → foundations" value={`${foundationsTouched}/9`} />
              <TreeRow label="AI / Agentic → tiers" value="reference above" />
              <TreeRow
                label="Projects → artifacts"
                value={
                  Object.entries(careerTree.artifactsByKind)
                    .filter(([, n]) => (n ?? 0) > 0)
                    .map(([kind, n]) => `${n} ${kind}`)
                    .join(' · ') || '0'
                }
              />
              <TreeRow label="Resume → versions" value={String(careerTree.resumeVersions)} />
              <TreeRow
                label="Applications"
                value={`${careerTree.applications} (${careerTree.qualityApplications} quality)`}
              />
              <TreeRow label="Interviews" value={String(careerTree.interviews)} />
              <TreeRow label="Offer" value={String(careerTree.offers)} />
            </Section>
          )}

          <Section title="Interview-readiness benchmark">
            <InterviewBenchmarkCard />
          </Section>
        </div>
      </div>
    </>
  );
}

function BandStat({ value, total, label }: { value: number; total: number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-lg leading-none tabular-nums text-ink-100">
        <span className="glow-text">{value}</span>
        <span className="text-sm text-ink-700"> / {total}</span>
      </span>
      <span className="text-xxs uppercase text-ink-700">{label}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <SectionLabel rule className="mb-2">
        {title}
      </SectionLabel>
      {children}
    </div>
  );
}

function TreeRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-3 py-2"
      style={{ borderBottom: '1px solid var(--hair-faint)' }}
    >
      <span className="min-w-0 flex-1 truncate text-sm text-ink-500">{label}</span>
      <span className="shrink-0 font-mono text-xs tabular-nums text-ink-300">{value}</span>
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

  // The framed panel is this screen's one piece of ceremony, and it is
  // spent here deliberately: everything above is a readout, and this is
  // the only thing on the screen you can actually do — a self-
  // administered gate whose result is a rank input.
  return (
    <FramedPanel className="px-4 py-4">
      <p className="text-sm leading-[1.55] text-ink-500">
        3 randomly-drawn mediums, 90 minutes total, unseen, first-attempt, a working solution, and a
        stated complexity.
      </p>

      <p className={['mt-3 text-sm', passed ? 'glow-text text-accent-mid' : 'text-ink-700'].join(' ')}>
        {passed ? '✓ Passed.' : 'Not yet passed.'}
      </p>

      <div className="mt-4 flex gap-2">
        <PrimaryButton size="md" disabled={submitting} onClick={() => void handleLog(true)} className="flex-1">
          Passed
        </PrimaryButton>
        <SecondaryButton disabled={submitting} onClick={() => void handleLog(false)} className="flex-1">
          Not yet
        </SecondaryButton>
      </div>

      {history.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1">
          {history.map((h, i) => (
            <li
              key={i}
              className="flex items-center justify-between font-mono text-xxs tabular-nums text-faint"
            >
              <span>{h.local_date}</span>
              <span className={h.passed ? 'text-accent-mid' : undefined}>
                {h.passed ? 'passed' : 'not yet'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </FramedPanel>
  );
}
