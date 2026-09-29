import { useEffect, useState, useMemo } from 'react';
import {
  Code,
  Cpu,
  Lightning,
  Sparkle,
  Sword,
  Trophy,
  MagnifyingGlass,
  CheckCircle,
  Flame,
  Star,
  Check,
  CaretRight,
  CaretLeft,
  type Icon,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_CONFIG } from '../../engine/config';
import { localDate } from '../../engine/time';
import { realDeps } from '../../store/deps';
import { db } from '../../db/db';
import {
  getDsaSkillsOverview,
  getFoundationSkillsOverview,
  getAiSkillsOverview,
  getCareerTreeOverview,
  logQuickSkillPractice,
  type TopicMastery,
  type CareerTreeOverview,
} from '../../store/skills';
import {
  getInterviewBenchmarkHistory,
  getInterviewBenchmarkPassed,
  logInterviewBenchmark,
} from '../../store/training';
import type { MasteryState, Rank } from '../../engine/types';
import {
  ArtLayer,
  DayMeta,
  FramedPanel,
  PrimaryButton,
  ScreenTitle,
  SecondaryButton,
  SegmentBar,
} from '../kit';

const ARC_LENGTH_DAYS = 120;

const MASTERY_ORDER: MasteryState[] = ['unseen', 'introduced', 'applied', 'fluent', 'retained'];

const MASTERY_BADGE_STYLE: Record<
  MasteryState,
  { label: string; bg: string; border: string; text: string; glow: string }
> = {
  unseen: {
    label: 'UNSEEN',
    bg: 'bg-ink-950/60',
    border: 'border-hair-faint',
    text: 'text-ink-500 font-mono',
    glow: 'none',
  },
  introduced: {
    label: 'AWAKENED',
    bg: 'bg-blue-950/80',
    border: 'border-blue-500/60',
    text: 'text-blue-400 font-mono font-bold',
    glow: '0 0 10px rgba(59, 130, 246, 0.45)',
  },
  applied: {
    label: 'APPLIED',
    bg: 'bg-cyan-950/80',
    border: 'border-cyan-400/60',
    text: 'text-cyan-300 font-mono font-bold',
    glow: '0 0 12px rgba(34, 211, 238, 0.55)',
  },
  fluent: {
    label: 'FLUENT',
    bg: 'bg-indigo-950/90',
    border: 'border-indigo-400/70',
    text: 'text-indigo-300 font-mono font-bold',
    glow: '0 0 14px rgba(129, 140, 248, 0.65)',
  },
  retained: {
    label: 'MONARCH S-RANK',
    bg: 'bg-gradient-to-r from-amber-950/90 to-amber-900/90',
    border: 'border-amber-400/80',
    text: 'text-amber-300 font-mono font-extrabold tracking-wider',
    glow: '0 0 18px rgba(251, 191, 36, 0.85)',
  },
};

function TopicRow({
  item,
  index,
  onPractice,
}: {
  item: TopicMastery;
  index: number;
  onPractice: (topic: string) => void;
}) {
  const filled = MASTERY_ORDER.indexOf(item.state);
  const touched = filled > 0;
  const styleInfo = MASTERY_BADGE_STYLE[item.state] || MASTERY_BADGE_STYLE.unseen;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      whileHover={{ scale: 1.005 }}
      className="group relative flex flex-wrap items-center gap-x-2.5 gap-y-1.5 py-3 px-3 border-b border-hair-faint hover:bg-accent-deep/10 transition-all duration-200"
    >
      {/* Active Glowing Left Mana Spine */}
      {touched && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent-bright via-accent-mid to-accent-deep shadow-[0_0_12px_#5fb2ff]"
        />
      )}

      {/* Index Badge */}
      <div className="flex h-6 w-7 shrink-0 items-center justify-center cut-sm border border-accent/30 bg-surface-2/80 text-accent-mid font-mono text-[11px] font-bold group-hover:border-accent group-hover:bg-accent-deep/40 transition-all">
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Topic Title — Direct child of motion.div so locator('..') reaches the row wrapper */}
      <span
        className={[
          'min-w-0 flex-1 text-sm font-bold tracking-wide transition-colors break-words',
          touched ? 'text-ink-100 glow-text' : 'text-ink-300 group-hover:text-ink-100',
        ].join(' ')}
        style={{ flexBasis: '60%' }}
      >
        {item.topic}
      </span>

      {/* Mastery Badge — hidden on small to save space, topic name is priority */}
      <span
        className={[
          'shrink-0 rounded-sm border px-2 py-0.5 text-[9px] uppercase tracking-widest font-mono hidden sm:inline-flex items-center gap-1',
          styleInfo.bg,
          styleInfo.border,
          styleInfo.text,
        ].join(' ')}
        style={{ boxShadow: styleInfo.glow }}
      >
        {touched && <Sparkle size={9} weight="fill" className="animate-pulse" />}
        {styleInfo.label}
      </span>

      {/* SegmentBar — sibling of topic span, e2e uses aria-label on this */}
      <SegmentBar filled={filled} label={item.state} className="shrink-0" />

      {/* Practice Spell Button */}
      <button
        type="button"
        onClick={() => onPractice(item.topic)}
        className="cut-sm px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-accent-mid bg-accent-deep/30 border border-accent/40 hover:bg-accent-deep/70 hover:border-accent hover:text-white transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(77,163,255,0.25)] active:scale-95 shrink-0"
        title={`Practice ${item.topic}`}
      >
        <Lightning size={11} weight="fill" className="text-accent-bright" />
        <span className="hidden sm:inline">PRACTICE</span>
      </button>
    </motion.div>
  );
}

const AI_TIERS: { title: string; subtitle: string; rank: string; rankColor: string; items: string[] }[] = [
  {
    title: 'Tier 0 — Table Stakes',
    subtitle: 'CORE FOUNDATIONS',
    rank: 'E-RANK',
    rankColor: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/60 shadow-[0_0_10px_rgba(52,211,153,0.3)]',
    items: [
      'LLM Fundamentals',
      'Prompting with Cache-Awareness',
      'Structured Outputs',
      'Tool Calling',
      'Embeddings',
      'RAG Basics',
      'Vector Store Selection',
      'Model Landscape & Pricing',
    ],
  },
  {
    title: 'Tier 1 — Differentiators',
    subtitle: 'ADVANCED CAPABILITIES',
    rank: 'B-RANK',
    rankColor: 'text-blue-400 border-blue-500/50 bg-blue-950/60 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
    items: ['Evaluation Design', 'Agent Orchestration', 'Context Engineering', 'MCP Protocol', 'Cost & Latency Optimization'],
  },
  {
    title: 'Tier 2 — Production Engine',
    subtitle: 'PRODUCTION ARCHITECTURES',
    rank: 'A-RANK',
    rankColor: 'text-purple-400 border-purple-500/50 bg-purple-950/60 shadow-[0_0_10px_rgba(168,85,247,0.3)]',
    items: [
      'Observability & Tracing',
      'Guardrails & OWASP LLM Risks',
      'Sandboxing & Kill-Switches',
      'Production Deployment',
      'Async Job Architecture',
    ],
  },
  {
    title: 'Tier 3 — Frontier Tier',
    subtitle: 'MONARCH ARCHITECTURES',
    rank: 'S-RANK',
    rankColor: 'text-amber-300 border-amber-500/60 bg-amber-950/70 shadow-[0_0_14px_rgba(251,191,36,0.4)]',
    items: ['Multi-Agent Coordination', 'Computer-Use / Vision-Action Loops', 'Custom Fine-Tuning'],
  },
];

type FilterCategory = 'all' | 'dsa' | 'foundations' | 'ai' | 'career' | 'benchmark';

export function Skills() {
  const [dsa, setDsa] = useState<TopicMastery[] | null>(null);
  const [foundations, setFoundations] = useState<TopicMastery[] | null>(null);
  const [aiSkills, setAiSkills] = useState<TopicMastery[] | null>(null);
  const [careerTree, setCareerTree] = useState<CareerTreeOverview | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [arcId, setArcId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [practiceTopic, setPracticeTopic] = useState<string | null>(null);

  const refreshData = async () => {
    const [d, f, ai, c, arc] = await Promise.all([
      getDsaSkillsOverview(),
      getFoundationSkillsOverview(),
      getAiSkillsOverview(),
      getCareerTreeOverview(),
      db.arc.toCollection().first(),
    ]);
    setDsa(d);
    setFoundations(f);
    setAiSkills(ai);
    setCareerTree(c);
    if (arc) {
      setArcId(arc.id);
      const dNum = Math.max(1, Math.floor((Date.now() - new Date(arc.start_date).getTime()) / (86400 * 1000)));
      setDay(dNum);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  const dsaTouched = dsa?.filter((t) => t.state !== 'unseen').length ?? 0;
  const foundationsTouched = foundations?.filter((t) => t.state !== 'unseen').length ?? 0;
  const aiTouched = aiSkills?.filter((t) => t.state !== 'unseen').length ?? 0;

  const totalSkillsCount = (dsa?.length ?? 0) + (foundations?.length ?? 0);
  const totalTouchedCount = dsaTouched + foundationsTouched;
  const masteryPercentage =
    totalSkillsCount > 0 ? Math.round((totalTouchedCount / totalSkillsCount) * 100) : 0;

  const filteredDsa = useMemo(() => {
    if (!dsa) return [];
    if (!searchQuery.trim()) return dsa;
    return dsa.filter((t) => t.topic.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [dsa, searchQuery]);

  const filteredFoundations = useMemo(() => {
    if (!foundations) return [];
    if (!searchQuery.trim()) return foundations;
    return foundations.filter((t) => t.topic.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [foundations, searchQuery]);

  const aiMap = useMemo(() => {
    const map = new Map<string, MasteryState>();
    aiSkills?.forEach((item) => map.set(item.topic, item.state));
    return map;
  }, [aiSkills]);

  return (
    <>
      <div className="px-gutter pb-8 pt-2">
        <ScreenTitle title="SKILLS" meta={<DayMeta day={day} of={ARC_LENGTH_DAYS} />} className="mb-4" />

        {/* Solo Leveling Hunter Status HUD Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="cut-md relative mb-5 overflow-hidden p-3.5 sm:p-5 transition-all duration-300 border border-accent/40 bg-gradient-to-b from-[#0a1424]/95 via-[#070e1a]/98 to-[#04070d] shadow-[0_0_35px_rgba(77,163,255,0.22)]"
        >
          {/* Ambient Background Art Layer */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden opacity-60"
            style={{
              mixBlendMode: 'lighten',
              maskImage: 'radial-gradient(120% 100% at 50% 30%, #000 50%, transparent 92%)',
              WebkitMaskImage: 'radial-gradient(120% 100% at 50% 30%, #000 50%, transparent 92%)',
            }}
          >
            <ArtLayer slot="skills" scrim="none" focal="50% 35%" priority />
          </div>

          {/* Runic Scanline Effect */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(77,163,255,0.04)_50%,transparent_100%)] bg-[length:100%_8px]"
          />

          <div className="relative z-10">
            {/* Header Badge Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hair-faint pb-2.5 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-mid shadow-[0_0_8px_#5fb2ff] animate-pulse shrink-0" />
                <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-accent-mid glow-text">
                  SPELLBOOK MATRIX
                </span>
              </div>
              <span className="cut-sm px-2 py-0.5 font-mono text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest text-amber-300 bg-amber-950/70 border border-amber-500/60 shadow-[0_0_12px_rgba(251,191,36,0.35)] flex items-center gap-1">
                <Sparkle size={9} weight="fill" className="text-amber-300" />
                S-RANK
              </span>
            </div>

            <p className="text-xs italic leading-relaxed text-ink-100 max-w-[98%] font-medium">
              &ldquo;Skills are not granted by favour. They are forged in the dungeon of
              unyielding discipline.&rdquo;
            </p>

            {/* Mana / EXP Progress Gauge Bar */}
            <div className="mt-4 pt-3.5 border-t border-hair-faint">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono font-bold mb-1.5">
                <span className="text-accent-mid uppercase tracking-wider flex items-center gap-1">
                  <Lightning size={13} weight="fill" className="text-accent-bright shrink-0" />
                  SPELL MASTERY
                </span>
                <span className="text-ink-100 glow-text font-extrabold tracking-wider">{masteryPercentage}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-surface-2/90 border border-accent/40 overflow-hidden relative p-0.5 shadow-[inset_0_1px_3px_#000]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${masteryPercentage}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-accent-deep via-accent-mid to-accent-bright shadow-[0_0_14px_#5fb2ff] relative"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer-sweep_2s_infinite]" />
                </motion.div>
              </div>
            </div>

            {/* Matrix Quick Stat Tiles */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
              <BandStat value={dsaTouched} total={dsa?.length ?? 0} label="DSA Power" icon={Code} />
              <BandStat value={foundationsTouched} total={foundations?.length ?? 0} label="SE Architect" icon={Cpu} />
              <BandStat value={aiTouched} total={AI_TIERS.reduce((acc, t) => acc + t.items.length, 0)} label="AI Spells" icon={Sparkle} />
            </div>
          </div>
        </motion.div>

        {/* High-Tech Category Filter Bar */}
        <div className="mb-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 p-1 rounded cut-sm border border-accent/30 bg-surface/90 min-w-max shadow-[0_0_15px_rgba(0,0,0,0.4)]">
            {[
              { id: 'all', label: 'ALL', icon: Star },
              { id: 'dsa', label: 'DSA', icon: Code },
              { id: 'foundations', label: 'SE', icon: Cpu },
              { id: 'ai', label: 'AI', icon: Sparkle },
              { id: 'career', label: 'CAREER', icon: Trophy },
              { id: 'benchmark', label: 'GATE', icon: Sword },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FilterCategory)}
                  className={[
                    'relative min-h-tap px-2.5 sm:px-3.5 py-1.5 text-[10px] font-mono font-bold tracking-wider uppercase rounded transition-all duration-200 flex items-center gap-1.5 select-none',
                    isActive ? 'text-ink-100 glow-text font-extrabold' : 'text-ink-700 hover:text-ink-300',
                  ].join(' ')}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSkillTab"
                      className="absolute inset-0 cut-sm bg-accent-deep/50 border border-accent/70 shadow-[0_0_15px_rgba(77,163,255,0.4)]"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <IconComp size={13} weight={isActive ? 'fill' : 'bold'} color={isActive ? '#5fb2ff' : 'currentColor'} />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cyber Search Bar */}
        {(activeTab === 'all' || activeTab === 'dsa' || activeTab === 'foundations' || activeTab === 'ai') && (
          <div className="mb-5 relative">
            <div className="relative flex items-center">
              <MagnifyingGlass size={16} color="#5fb2ff" className="absolute left-3.5 drop-shadow-[0_0_6px_#5fb2ff]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skills, algorithms, architecture, AI spells..."
                className="w-full min-h-tap cut-sm bg-surface-2/90 border border-accent/40 pl-10 pr-16 text-xs font-mono text-ink-100 placeholder:text-ink-700 focus:outline-none focus:border-accent focus:shadow-[0_0_14px_rgba(77,163,255,0.35)] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 px-2 py-0.5 text-[10px] font-mono font-bold text-accent-mid hover:text-white bg-accent-deep/40 rounded border border-accent/30 uppercase"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Section 1: DSA Power */}
          {(activeTab === 'all' || activeTab === 'dsa') && (
            <motion.div key="dsa-sec" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Section title="DSA Algorithmic Power" tagline="CORE SPELLS" icon={Code} count={filteredDsa.length}>
                {filteredDsa.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {filteredDsa.map((item, i) => (
                      <TopicRow
                        key={item.topic}
                        item={item}
                        index={i}
                        onPractice={(topic) => setPracticeTopic(topic)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-ink-700 py-4 text-center">No matching algorithms found.</p>
                )}
              </Section>
            </motion.div>
          )}

          {/* Section 2: SE Foundations */}
          {(activeTab === 'all' || activeTab === 'foundations') && (
            <motion.div key="foundations-sec" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Section title="SE Foundations" tagline="SYSTEM ARCHITECTURE" icon={Cpu} count={filteredFoundations.length}>
                {filteredFoundations.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {filteredFoundations.map((item, i) => (
                      <TopicRow
                        key={item.topic}
                        item={item}
                        index={i}
                        onPractice={(topic) => setPracticeTopic(topic)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-ink-700 py-4 text-center">No matching architecture topics found.</p>
                )}
              </Section>
            </motion.div>
          )}

          {/* Section 3: AI / Agentic Spells Tier Matrix */}
          {(activeTab === 'all' || activeTab === 'ai') && (
            <motion.div key="ai-sec" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Section title="AI / Agentic Spells" tagline="FRONTIER TECH TIERS" icon={Sparkle}>
                {AI_TIERS.map((tier) => {
                  const matchingItems = searchQuery.trim()
                    ? tier.items.filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase()))
                    : tier.items;

                  if (searchQuery.trim() && matchingItems.length === 0) return null;

                  return (
                    <div
                      key={tier.title}
                      className="mb-4 last:mb-0 p-3.5 rounded cut-sm bg-surface/60 border border-hair-faint hover:border-accent/40 transition-all"
                    >
                      <div className="mb-3 flex items-center justify-between border-b border-hair-faint pb-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-accent-mid shadow-[0_0_8px_#5fb2ff]" />
                          <div>
                            <div className="text-xs font-mono font-bold uppercase tracking-wider text-ink-100 glow-text flex items-center gap-2">
                              {tier.title}
                            </div>
                            <span className="text-[9px] uppercase tracking-widest font-mono text-ink-700 font-semibold">
                              {tier.subtitle}
                            </span>
                          </div>
                        </div>
                        <span
                          className={[
                            'cut-sm px-2.5 py-0.5 text-[9px] font-mono font-bold tracking-widest rounded border',
                            tier.rankColor,
                          ].join(' ')}
                        >
                          {tier.rank}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {matchingItems.map((item) => {
                          const state = aiMap.get(item) || 'unseen';
                          const styleInfo = MASTERY_BADGE_STYLE[state];
                          return (
                            <motion.div
                              key={item}
                              whileHover={{ scale: 1.015, y: -1 }}
                              className="cut-sm p-3 text-xs font-medium text-ink-100 transition-all duration-150 border border-accent/30 bg-surface-2/90 flex items-center justify-between gap-2 shadow-[0_0_12px_rgba(77,163,255,0.08)] hover:border-accent/70 hover:shadow-[0_0_16px_rgba(77,163,255,0.25)]"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Flame size={15} weight="fill" className="text-accent-bright drop-shadow-[0_0_6px_#5fb2ff] shrink-0 animate-pulse" />
                                <span className="truncate font-bold text-ink-100">{item}</span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={[
                                    'text-[8px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border hidden sm:inline-block',
                                    styleInfo.bg,
                                    styleInfo.border,
                                    styleInfo.text,
                                  ].join(' ')}
                                >
                                  {styleInfo.label}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPracticeTopic(item)}
                                  className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-accent-mid bg-accent-deep/40 border border-accent/40 rounded hover:bg-accent-deep hover:text-white transition-all flex items-center gap-1 shadow-[0_0_6px_rgba(77,163,255,0.2)]"
                                  title={`Practice ${item}`}
                                >
                                  <Lightning size={10} weight="fill" className="text-accent-bright" />
                                  <span>PRACTICE</span>
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </Section>
            </motion.div>
          )}

          {/* Section 4: Career Tree */}
          {(activeTab === 'all' || activeTab === 'career') && careerTree && (
            <motion.div key="career-sec" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Section title="Career Tree" tagline="ARTEFACTS & INTERVIEWS" icon={Trophy}>
                <div className="flex flex-col gap-1">
                  <TreeRow label="Software engineering → foundations" value={`${foundationsTouched}/9`} />
                  <TreeRow label="AI / Agentic → tiers unlocked" value={`${aiTouched}/21 Tiers Active`} />
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
                    label="Applications Logged"
                    value={`${careerTree.applications} (${careerTree.qualityApplications} quality)`}
                  />
                  <TreeRow label="Interviews Conducted" value={String(careerTree.interviews)} />
                  <TreeRow label="Offer Secured" value={String(careerTree.offers)} />
                </div>
              </Section>
            </motion.div>
          )}

          {/* Section 5: Dungeon Gate Benchmark */}
          {(activeTab === 'all' || activeTab === 'benchmark') && (
            <motion.div key="benchmark-sec" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Section title="Interview Readiness Benchmark" tagline="DUNGEON GATE PROTOCOL" icon={Sword}>
                <InterviewBenchmarkCard />
              </Section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Skill Practice Modal */}
      {practiceTopic && arcId && (
        <QuickPracticeModal
          topic={practiceTopic}
          arcId={arcId}
          onClose={() => setPracticeTopic(null)}
          onSaved={() => {
            setPracticeTopic(null);
            void refreshData();
          }}
        />
      )}
    </>
  );
}

function BandStat({ value, total, label, icon: Glyph }: { value: number; total: number; label: string; icon: Icon }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 p-2 sm:p-2.5 rounded cut-sm border border-accent/25 bg-surface/60 hover:border-accent/50 transition-all">
      <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded border border-accent/40 bg-accent-deep/30 text-accent-mid shadow-[0_0_10px_rgba(77,163,255,0.35)]">
        <Glyph size={14} weight="fill" className="text-accent-bright" />
      </div>
      <div className="min-w-0 text-center sm:text-left">
        <div className="font-mono text-xs sm:text-sm font-bold leading-none tabular-nums text-ink-100">
          <span className="glow-text text-accent-mid">{value}</span>
          <span className="text-[9px] sm:text-[10px] text-ink-700">/{total}</span>
        </div>
        <div className="text-[7px] sm:text-[9px] uppercase font-mono font-bold tracking-wider text-ink-700 mt-0.5 sm:mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  tagline,
  icon: Glyph,
  count,
  children,
}: {
  title: string;
  tagline?: string;
  icon?: Icon;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="cut-sm mb-5 p-4 sm:p-5 transition-all duration-200 border border-accent/35 bg-gradient-to-b from-[#0a1424]/90 to-[#050a14]/96 shadow-[0_0_22px_rgba(77,163,255,0.15)]"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-hair-faint pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {Glyph && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-accent/40 bg-accent-deep/40 text-accent-mid shadow-[0_0_10px_rgba(77,163,255,0.35)]">
              <Glyph size={15} weight="fill" className="text-accent-bright" />
            </div>
          )}
          <div>
            <h2 className="font-display text-lg font-bold tracking-[0.14em] text-ink-100 flex items-center gap-2">
              {title}
              {count !== undefined && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent-deep/40 border border-accent/30 text-accent-mid">
                  {count}
                </span>
              )}
            </h2>
          </div>
        </div>
        {tagline && (
          <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-accent-mid font-mono glow-text">
            {tagline}
          </span>
        )}
      </div>
      {children}
    </motion.div>
  );
}

function TreeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-sm transition-all duration-150 hover:bg-accent-deep/20 border-b border-hair-faint group">
      <CaretRight size={12} className="text-accent-mid shrink-0 group-hover:translate-x-0.5 transition-transform" />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-300 group-hover:text-ink-100">{label}</span>
      <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-accent-mid glow-text">{value}</span>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════
 * Dungeon Gate ranking
 *
 * The benchmark itself is frozen (final/02 §2.2): three random mediums,
 * ninety minutes, unseen, first attempt, with a stated complexity —
 * self-administered, logged, repeatable, no schema beyond a pass/fail
 * per day. Nothing here changes that contract or what gets written to
 * `metric_sample`.
 *
 * What was missing was a sense of *stakes*. Every attempt looked
 * identical whether it was your first ever try or your fiftieth, which
 * is the opposite of how a Solo Leveling gate works — a Hunter's first
 * gate is E-Rank, and gates only get harder as more of them fall. That
 * escalation is derived here, entirely on the client, from nothing but
 * the ordered pass/fail history the store already returns: count the
 * clears that happened before an attempt, and that count — capped at
 * S, because nothing sits above it — is the rank of the gate that
 * attempt was actually facing. A retry does not advance the count: the
 * Hunter re-enters the *same* gate until it falls, not a fresh one.
 *
 * This is flavour, not evidence. It never touches engine/rank.ts's real
 * Hunter Rank (final/01 §4), which is checkpoint-gated across dozens of
 * signals and never regresses — conflating the two would let a display
 * choice make a claim the evidence system is built specifically not to
 * make.
 * ══════════════════════════════════════════════════════════════════════ */

const GATE_RANK_ORDER: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

const GATE_RANK_STYLE: Record<Rank, { bg: string; border: string; text: string; glow: string }> = {
  E: { bg: 'bg-emerald-950/70', border: 'border-emerald-500/50', text: 'text-emerald-400', glow: '0 0 8px rgba(52,211,153,0.3)' },
  D: { bg: 'bg-blue-950/70', border: 'border-blue-500/50', text: 'text-blue-400', glow: '0 0 8px rgba(59,130,246,0.35)' },
  C: { bg: 'bg-cyan-950/70', border: 'border-cyan-400/55', text: 'text-cyan-300', glow: '0 0 10px rgba(34,211,238,0.4)' },
  B: { bg: 'bg-indigo-950/75', border: 'border-indigo-400/60', text: 'text-indigo-300', glow: '0 0 10px rgba(129,140,248,0.45)' },
  A: { bg: 'bg-purple-950/80', border: 'border-purple-500/60', text: 'text-purple-300', glow: '0 0 12px rgba(168,85,247,0.5)' },
  S: {
    bg: 'bg-gradient-to-r from-amber-950/90 to-amber-900/90',
    border: 'border-amber-400/75',
    text: 'text-amber-300',
    glow: '0 0 14px rgba(251,191,36,0.6)',
  },
};

/** The rank of the gate a Hunter faces after `clearsBefore` clears.
 * `?? 'S'` is unreachable in practice — the index is clamped to the
 * array's own length — but `noUncheckedIndexedAccess` can't see that,
 * and the true fallback if it ever were reached is the cap, not a
 * crash. */
function gateRankFor(clearsBefore: number): Rank {
  const index = Math.min(Math.max(clearsBefore, 0), GATE_RANK_ORDER.length - 1);
  return GATE_RANK_ORDER[index] ?? 'S';
}

interface GateAttempt {
  local_date: string;
  passed: boolean;
  rank: Rank;
}

/** Walks the history in the order it happened, assigning each attempt
 * the rank of the gate it was actually facing. */
function annotateGateHistory(history: { local_date: string; passed: boolean }[]): GateAttempt[] {
  let clears = 0;
  return history.map((h) => {
    const rank = gateRankFor(clears);
    if (h.passed) clears += 1;
    return { ...h, rank };
  });
}

function GateRankChip({ rank, className = '' }: { rank: Rank; className?: string }) {
  const style = GATE_RANK_STYLE[rank];
  return (
    <span
      className={[
        'shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider',
        style.bg,
        style.border,
        style.text,
        className,
      ].join(' ')}
      style={{ boxShadow: style.glow }}
    >
      {rank}
    </span>
  );
}

/** Entries per page once the log is long enough to need one. Five is
 * enough to read a run of attempts at a glance without scrolling a list
 * inside a list. */
const GATE_PAGE_SIZE = 5;

function InterviewBenchmarkCard() {
  const [passed, setPassed] = useState<boolean | null>(null);
  const [history, setHistory] = useState<{ local_date: string; passed: boolean }[]>([]);
  const [arcId, setArcId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);

  async function refresh() {
    const [p, h, arc] = await Promise.all([getInterviewBenchmarkPassed(), getInterviewBenchmarkHistory(), db.arc.toCollection().first()]);
    setPassed(p);
    setHistory(h);
    setArcId(arc?.id ?? null);
    // A fresh attempt is always news, so it always lands on page 1 —
    // the "latest one" is exactly the entry that just changed.
    setPage(0);
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

  // `getInterviewBenchmarkHistory` returns oldest-first — the natural
  // order for computing which gate each attempt actually faced. Display
  // wants the opposite: newest first, so the gate you just walked out of
  // is the one at the top of the list.
  const annotated = useMemo(() => annotateGateHistory(history), [history]);
  const clearsTotal = useMemo(() => annotated.filter((a) => a.passed).length, [annotated]);
  const currentGateRank = gateRankFor(clearsTotal);
  const newestFirst = useMemo(() => [...annotated].reverse(), [annotated]);

  const pageCount = Math.max(1, Math.ceil(newestFirst.length / GATE_PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageStart = clampedPage * GATE_PAGE_SIZE;
  const pageItems = newestFirst.slice(pageStart, pageStart + GATE_PAGE_SIZE);

  if (!arcId) return null;

  return (
    <FramedPanel className="px-4 py-4 relative overflow-hidden cut-sm border border-accent/45 bg-surface-2/95 shadow-[0_0_24px_rgba(77,163,255,0.22)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          mixBlendMode: 'lighten',
          maskImage: 'radial-gradient(100% 100% at 50% 50%, #000 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(100% 100% at 50% 50%, #000 20%, transparent 80%)',
        }}
      >
        <ArtLayer slot="training" scrim="quiet" focal="50% 40%" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Sword size={18} weight="fill" className="text-accent-bright animate-bounce drop-shadow-[0_0_8px_#5fb2ff]" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-100 glow-text">
            DUNGEON GATE PROTOCOL RULES
          </span>
        </div>

        <p className="text-xs leading-relaxed text-ink-200 font-medium">
          3 randomly-drawn medium DSA challenges · 90 minutes total duration · unseen test cases · first-attempt working solution with full space-time complexity analysis.
        </p>

        {/* The gate you are actually facing right now — the one fact the
            card used to fake. It always read "S-RANK", whether this was
            your first attempt or your fiftieth. This rises with real
            clears and starts, like every Hunter does, at E. */}
        <div className="mt-3 flex items-center justify-between gap-2 rounded cut-sm border border-accent/35 bg-accent-deep/15 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <GateRankChip rank={currentGateRank} />
            <span className="min-w-0 truncate text-[10px] font-mono font-bold uppercase tracking-widest text-ink-300">
              Gate Active
            </span>
          </div>
          <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-ink-700">
            {clearsTotal} Cleared
          </span>
        </div>

        <div className="mt-3 p-3 rounded cut-sm border border-accent/40 bg-accent-deep/20 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest font-mono text-ink-500 font-bold">BENCHMARK GATE STATUS:</span>
          <div className="flex items-center gap-2">
            <CheckCircle size={16} weight="fill" color={passed ? '#5fb2ff' : '#90a8c2'} />
            <p className={['text-xs font-bold tracking-wider uppercase font-mono', passed ? 'glow-text text-accent-mid font-extrabold' : 'text-ink-500'].join(' ')}>
              {passed ? '✓ GATE CLEARED' : 'UNCLEARED GATE'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2.5">
          <PrimaryButton size="md" disabled={submitting} onClick={() => void handleLog(true)} className="flex-1 shadow-[0_0_18px_rgba(77,163,255,0.45)] font-mono uppercase font-bold tracking-wider">
            {submitting ? 'RECORDING...' : 'GATE CLEARED'}
          </PrimaryButton>
          <SecondaryButton disabled={submitting} onClick={() => void handleLog(false)} className="flex-1 font-mono uppercase tracking-wider">
            RETRIED / FAILED
          </SecondaryButton>
        </div>

        {newestFirst.length > 0 && (
          <div className="mt-4 border-t border-hair-faint pt-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[9px] uppercase font-mono font-bold text-ink-700 tracking-wider">
                DUNGEON ENTRY LOGS ({newestFirst.length})
              </span>
              {pageCount > 1 && (
                <span className="shrink-0 text-[9px] font-mono font-bold uppercase tracking-wider text-ink-700">
                  PAGE {clampedPage + 1}/{pageCount}
                </span>
              )}
            </div>

            <ul className="flex flex-col gap-1.5">
              {pageItems.map((h, i) => {
                // The newest entry is marked by a lit left spine rather
                // than an inline "LATEST" label — a text badge competing
                // with the date and rank chip for room on a 320px row
                // was what pushed the date into `truncate`. The spine is
                // the same "something changed here" motif TopicRow
                // already uses above, and it costs no horizontal space.
                const isLatest = clampedPage === 0 && i === 0;
                return (
                  <li
                    key={`${h.local_date}-${pageStart + i}`}
                    className={[
                      'relative flex items-center justify-between gap-2 overflow-hidden font-mono text-xxs tabular-nums px-2.5 py-1.5 rounded bg-surface/60 border',
                      isLatest ? 'border-accent/50' : 'border-hair-faint',
                    ].join(' ')}
                  >
                    {isLatest && (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-accent-bright via-accent-mid to-accent-deep shadow-[0_0_10px_#5fb2ff]"
                      />
                    )}
                    <div className={['flex min-w-0 items-center gap-2', isLatest ? 'pl-1.5' : ''].join(' ')}>
                      <GateRankChip rank={h.rank} />
                      <span className="min-w-0 truncate text-ink-500">{h.local_date}</span>
                    </div>
                    <span className={['shrink-0 uppercase', h.passed ? 'text-accent-mid font-bold glow-text' : 'text-ink-700'].join(' ')}>
                      {h.passed ? '✓ CLEARED' : 'RETRIED'}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Pagination only exists once it is needed — a log of five
                or fewer never grows a control nobody asked for. */}
            {pageCount > 1 && (
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={clampedPage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="flex min-h-tap items-center gap-1 rounded cut-sm border border-accent/30 bg-surface-2/80 px-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-accent-mid transition-all hover:border-accent hover:bg-accent-deep/30 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-accent/30 disabled:hover:bg-surface-2/80"
                >
                  <CaretLeft size={11} weight="bold" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={clampedPage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  className="flex min-h-tap items-center gap-1 rounded cut-sm border border-accent/30 bg-surface-2/80 px-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-accent-mid transition-all hover:border-accent hover:bg-accent-deep/30 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-accent/30 disabled:hover:bg-surface-2/80"
                >
                  Next
                  <CaretRight size={11} weight="bold" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </FramedPanel>
  );
}

function QuickPracticeModal({
  topic,
  arcId,
  onClose,
  onSaved,
}: {
  topic: string;
  arcId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [minutes, setMinutes] = useState(30);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const todayStr = localDate(realDeps.now(), DEFAULT_CONFIG.arc.timezone, DEFAULT_CONFIG.arc.dayBoundaryHour);
      await logQuickSkillPractice(todayStr, arcId, topic, minutes, DEFAULT_CONFIG, realDeps, note || undefined);
      onSaved();
    } catch {
      alert('Could not save practice trial.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(4, 7, 13, 0.95)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-md rounded-lg p-6 border border-accent/60 shadow-[0_0_40px_rgba(77,163,255,0.4),0_0_80px_rgba(77,163,255,0.15)] relative overflow-hidden"
        style={{ background: '#0a1424' }}
      >
        {/* Corner bracket decorations */}
        <div aria-hidden className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-accent/70 pointer-events-none" />
        <div aria-hidden className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent/70 pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-accent/70 pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-accent/70 pointer-events-none" />
        {/* Scanline overlay */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_2px,rgba(77,163,255,0.03)_2px,rgba(77,163,255,0.03)_4px)]" />
        <div className="flex items-center justify-between mb-4 border-b border-hair-faint pb-3">
          <div className="flex items-center gap-2">
            <Lightning size={20} weight="fill" className="text-accent-bright animate-pulse drop-shadow-[0_0_8px_#5fb2ff]" />
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-ink-100 glow-text">
              PRACTICE SPELL // {topic}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-mono font-bold text-ink-700 hover:text-white uppercase transition-colors"
          >
            CANCEL
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="mb-4">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-accent-mid mb-2">
              PRACTICE DURATION (MINUTES)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={[
                    'min-h-tap cut-sm text-xs font-mono font-bold border transition-all',
                    minutes === m
                      ? 'bg-accent-deep border-accent text-ink-100 shadow-[0_0_14px_rgba(77,163,255,0.5)] glow-text'
                      : 'bg-[#0c1626] border-hair-faint text-ink-500 hover:border-accent/40 hover:text-ink-300',
                  ].join(' ')}
                >
                  {m} MIN
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-accent-mid mb-2">
              TRIAL NOTES / INSIGHTS (OPTIONAL)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="E.g., Mastered sliding window pointers, solved 2 medium problems..."
              className="w-full rounded-md bg-[#070e1a] border border-accent/40 p-3 text-xs font-mono text-ink-100 placeholder:text-ink-700 focus:outline-none focus:border-accent focus:shadow-[0_0_12px_rgba(77,163,255,0.3)] min-h-[85px]"
            />
          </div>

          <div className="p-3 mb-5 rounded-md border border-emerald-500/40 bg-[#051a12] text-[11px] font-mono text-emerald-300 flex items-center gap-2 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span>This practice will auto-fill your Skill level and sync with Today&rsquo;s Learning log!</span>
          </div>

          <div className="flex gap-2">
            <PrimaryButton
              type="submit"
              disabled={submitting}
              className="flex-1 font-mono uppercase font-bold tracking-wider shadow-[0_0_20px_rgba(77,163,255,0.5)]"
            >
              {submitting ? 'LOGGING...' : '⚡ RECORD PRACTICE & ADVANCE'}
            </PrimaryButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
