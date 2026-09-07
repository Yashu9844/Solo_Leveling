import { useEffect, useState } from 'react';
import {
  Brain,
  Code,
  Cpu,
  Crown,
  Lightning,
  Shield,
  Sparkle,
  Sword,
  Target,
  Trophy,
  type Icon,
} from '@phosphor-icons/react';
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
  SecondaryButton,
  SegmentBar,
} from '../kit';

const MASTERY_ORDER: MasteryState[] = ['unseen', 'introduced', 'applied', 'fluent', 'retained'];

function TopicRow({ item }: { item: TopicMastery }) {
  const filled = MASTERY_ORDER.indexOf(item.state);
  const touched = filled > 0;

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-2 rounded-sm transition-all duration-150 hover:bg-accent-deep/15"
      style={{ borderBottom: '1px solid var(--hair-faint)' }}
    >
      <span
        className={[
          'min-w-0 flex-1 truncate text-xs font-semibold tracking-wide transition-colors',
          touched ? 'text-ink-100 glow-text' : 'text-ink-700',
        ].join(' ')}
      >
        {item.topic}
      </span>
      {touched && (
        <span
          className="shrink-0 rounded border border-accent/40 bg-accent-deep/30 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-widest text-accent-mid shadow-[0_0_8px_rgba(77,163,255,0.3)]"
          aria-hidden
        >
          {item.state}
        </span>
      )}
      <SegmentBar filled={filled} label={item.state} className="shrink-0" />
    </div>
  );
}

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
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getDsaSkillsOverview(),
      getFoundationSkillsOverview(),
      getCareerTreeOverview(),
      db.arc.toCollection().first(),
    ]).then(([d, f, c, arc]) => {
      if (!cancelled) {
        setDsa(d);
        setFoundations(f);
        setCareerTree(c);
        if (arc) {
          const dNum = Math.max(1, Math.floor((Date.now() - new Date(arc.start_date).getTime()) / (86400 * 1000)));
          setDay(dNum);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dsaTouched = dsa?.filter((t) => t.state !== 'unseen').length ?? 0;
  const foundationsTouched = foundations?.filter((t) => t.state !== 'unseen').length ?? 0;

  return (
    <>
      <ScreenHeader title="SKILLS" visuallyHidden />
      <div className="px-gutter pb-8 pt-2">
        {/* Header Bar matching Solo Leveling sci-fi aesthetic */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-mid shadow-[0_0_8px_#5fb2ff]" />
              <span className="text-[9px] uppercase font-mono tracking-[0.22em] text-accent-mid font-bold">
                SYSTEM HUD // ABILITY TREE
              </span>
            </div>
            <h1 className="font-display text-2xl leading-none tracking-[0.14em] text-ink-100 glow-text">
              SKILLS
            </h1>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-700 mt-1">
              SYSTEM SKILL TREE · HUNTER MASTERY
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-xs uppercase font-display text-ink-700">DAY</span>
              <span className="font-mono text-sm font-bold text-accent-mid glow-text">
                {day != null ? String(day).padStart(2, '0') : '07'}
              </span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.16em] text-ink-700">
              HUNTER ABILITIES —
            </div>
            <div className="text-[8px] italic text-ink-500 max-w-[130px] mt-0.5">
              &ldquo;THE SYSTEM CHOSE YOU. TRANSCEND YOUR LIMITS.&rdquo;
            </div>
          </div>
        </div>

        {/* Hero Art Banner Card with Solo Leveling Visuals */}
        <div
          className="cut-md relative mb-4 overflow-hidden p-4 transition-all duration-200"
          style={{
            border: '1px solid rgba(77, 163, 255, 0.45)',
            background: 'linear-gradient(180deg, rgba(10, 20, 36, 0.9), rgba(5, 10, 20, 0.96))',
            boxShadow: '0 0 24px rgba(77, 163, 255, 0.2)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{
              mixBlendMode: 'lighten',
              opacity: 0.65,
              maskImage: 'radial-gradient(120% 100% at 50% 30%, #000 45%, transparent 88%)',
              WebkitMaskImage: 'radial-gradient(120% 100% at 50% 30%, #000 45%, transparent 88%)',
            }}
          >
            <ArtLayer slot="skills" scrim="none" focal="50% 35%" priority />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="cut-sm px-2 py-0.5 text-[8px] font-mono font-bold tracking-widest text-accent-mid bg-accent-deep/40 border border-accent/40 shadow-[0_0_8px_rgba(77,163,255,0.3)]">
                  SYSTEM MANDATE
                </span>
              </div>
              <Sparkle size={16} weight="fill" color="#5fb2ff" className="drop-shadow-[0_0_8px_rgba(77,163,255,0.8)] animate-pulse" />
            </div>

            <p className="text-xs italic leading-relaxed text-ink-100 max-w-[95%] font-semibold tracking-wide">
              &ldquo;SKILLS ARE NOT GRANTED — THEY ARE FORGED IN THE DUNGEON OF DISCIPLINE.&rdquo;
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-hair-faint">
              <BandStat value={dsaTouched} total={dsa?.length ?? 0} label="DSA topics" icon={Code} />
              <BandStat value={foundationsTouched} total={foundations?.length ?? 0} label="Foundations" icon={Cpu} />
            </div>
          </div>
        </div>

        {/* Section 1: DSA */}
        <Section title="DSA" tagline="ALGORITHMIC POWER" icon={Code}>
          {dsa?.map((item) => <TopicRow key={item.topic} item={item} />)}
        </Section>

        {/* Section 2: SE Foundations */}
        <Section title="SE Foundations" tagline="SYSTEM ARCHITECTURE" icon={Cpu}>
          {foundations?.map((item) => <TopicRow key={item.topic} item={item} />)}
        </Section>

        {/* Section 3: AI / Agentic Tiers */}
        <Section title="AI / Agentic tiers" tagline="FRONTIER TECH & ENGINE SPELLS" icon={Sparkle}>
          {AI_TIERS.map((tier) => (
            <div key={tier.title} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-accent-mid shadow-[0_0_6px_#5fb2ff]" />
                <div className="text-xs font-bold uppercase tracking-wider text-accent-mid glow-text">
                  {tier.title}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {tier.items.map((item) => (
                  <span
                    key={item}
                    className="cut-sm px-3 py-1.5 text-xs font-medium text-ink-100 transition-all duration-150 hover:border-accent/60 hover:shadow-[0_0_10px_rgba(77,163,255,0.3)] cursor-default"
                    style={{
                      border: '1px solid rgba(77, 163, 255, 0.35)',
                      background: 'linear-gradient(180deg, rgba(12, 22, 38, 0.85), rgba(7, 13, 24, 0.95))',
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* Section 4: Career Tree */}
        {careerTree && (
          <Section title="Career tree" tagline="ARTEFACTS & INTERVIEWS" icon={Trophy}>
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

        {/* Section 5: Dungeon Gate Interview Benchmark */}
        <Section title="Interview-readiness benchmark" tagline="DUNGEON GATE TEST" icon={Sword}>
          <InterviewBenchmarkCard />
        </Section>
      </div>
    </>
  );
}

function BandStat({ value, total, label, icon: Glyph }: { value: number; total: number; label: string; icon: Icon }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-accent/40 bg-accent-deep/40 text-accent-mid shadow-[0_0_10px_rgba(77,163,255,0.35)]">
        <Glyph size={17} weight="fill" color="#5fb2ff" />
      </div>
      <div>
        <div className="font-mono text-base font-bold leading-none tabular-nums text-ink-100">
          <span className="glow-text text-accent-mid">{value}</span>
          <span className="text-xs text-ink-700"> / {total}</span>
        </div>
        <div className="text-[9px] uppercase font-bold tracking-wider text-ink-700 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  tagline,
  icon: Glyph,
  children,
}: {
  title: string;
  tagline?: string;
  icon?: Icon;
  children: React.ReactNode;
}) {
  return (
    <div
      className="cut-sm mb-4 p-4 transition-all duration-200"
      style={{
        border: '1px solid rgba(77, 163, 255, 0.32)',
        background: 'linear-gradient(180deg, rgba(10, 20, 36, 0.85), rgba(5, 10, 20, 0.95))',
        boxShadow: '0 0 16px rgba(77, 163, 255, 0.12)',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-hair-faint">
        <div className="flex items-center gap-3">
          {Glyph && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-accent/40 bg-accent-deep/40 text-accent-mid shadow-[0_0_8px_rgba(77,163,255,0.3)]">
              <Glyph size={15} weight="fill" color="#5fb2ff" />
            </div>
          )}
          <h2 className="font-display text-lg font-bold tracking-[0.14em] text-ink-100">
            {title}
          </h2>
        </div>
        {tagline && (
          <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-accent-mid/80 font-mono">
            {tagline}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function TreeRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-3 py-2.5 px-2 rounded-sm transition-all duration-150 hover:bg-accent-deep/15"
      style={{ borderBottom: '1px solid var(--hair-faint)' }}
    >
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-300">{label}</span>
      <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-accent-mid glow-text">{value}</span>
    </div>
  );
}

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
    <FramedPanel className="px-4 py-4 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          mixBlendMode: 'lighten',
          maskImage: 'radial-gradient(100% 100% at 50% 50%, #000 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(100% 100% at 50% 50%, #000 20%, transparent 80%)',
        }}
      >
        <ArtLayer slot="training" scrim="quiet" focal="50% 40%" />
      </div>

      <div className="relative">
        <p className="text-xs leading-relaxed text-ink-200 font-medium">
          3 randomly-drawn mediums, 90 minutes total, unseen, first-attempt, a working solution, and a
          stated complexity.
        </p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-widest font-mono text-ink-700">BENCHMARK STATUS:</span>
          <p className={['text-xs font-bold tracking-wider uppercase font-mono', passed ? 'glow-text text-accent-mid' : 'text-ink-600'].join(' ')}>
            {passed ? '✓ Passed.' : 'Not yet passed.'}
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <PrimaryButton size="md" disabled={submitting} onClick={() => void handleLog(true)} className="flex-1 shadow-[0_0_12px_rgba(77,163,255,0.3)]">
            Passed
          </PrimaryButton>
          <SecondaryButton disabled={submitting} onClick={() => void handleLog(false)} className="flex-1">
            Not yet
          </SecondaryButton>
        </div>

        {history.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1 border-t border-hair-faint pt-3">
            {history.map((h, i) => (
              <li
                key={i}
                className="flex items-center justify-between font-mono text-xxs tabular-nums text-faint"
              >
                <span>{h.local_date}</span>
                <span className={h.passed ? 'text-accent-mid font-bold glow-text' : undefined}>
                  {h.passed ? 'passed' : 'not yet'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FramedPanel>
  );
}

