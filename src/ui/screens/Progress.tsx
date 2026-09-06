import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { arcDay, localDate } from '../../engine/time';
import { levelFor } from '../../engine/level';
import { realDeps } from '../../store/deps';
import { db } from '../../db/db';
import { getTotalXp } from '../../store/playerState';
import { getStreakState, type LiveStreakState } from '../../store/streak';
import { getRealitySummary, type RealitySummary } from '../../store/reality';
import { AttributeBars } from '../components/AttributeBars';
import { WeeklyReview } from '../review/WeeklyReview';
import { getCurrentRank } from '../../store/checkpoint';
import { ArtLayer, MeterBar, ScreenHeader, SectionLabel, SecondaryButton, Segmented } from '../kit';

type SubTab = 'SYSTEM' | 'REALITY';

// final/06 §5.5 — "REALITY is the default sub-tab from Day 30." Small
// decision, large effect: the app's default answer to "how am I doing?"
// becomes the real one.
const REALITY_DEFAULT_FROM_DAY = 30;

export function Progress() {
  const [day, setDay] = useState<number | null>(null);
  const [tab, setTab] = useState<SubTab | null>(null);

  useEffect(() => {
    void (async () => {
      const arc = await db.arc.toCollection().first();
      if (!arc) return;
      const d = arcDay(realDeps.now(), arc.start_date, arc.timezone, arc.day_boundary_hour);
      setDay(d);
      setTab(d >= REALITY_DEFAULT_FROM_DAY ? 'REALITY' : 'SYSTEM');
    })();
  }, []);

  if (tab === null) return null;

  return (
    <>
      <ScreenHeader
        title="PROGRESS"
        right={
          day != null ? (
            <span className="font-mono text-xs tabular-nums text-faint">DAY {day}</span>
          ) : undefined
        }
      />
      <div className="px-gutter pb-6 pt-4">
        {/* Full width below the header rather than squeezed beside it.
            At 320px a fixed-width switch and the title arrive at the
            same pixel, and neither can shrink: the title must not
            truncate and the two labels must stay legible.

            Plain buttons with aria-pressed, not role="tab" —
            attributes.spec selects these with
            getByRole('button', { name: 'REALITY' }). */}
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'SYSTEM', label: 'SYSTEM' },
            { value: 'REALITY', label: 'REALITY' },
          ]}
        />
        {tab === 'SYSTEM' ? <SystemTab /> : <RealityTab />}
      </div>
    </>
  );
}

function SystemTab() {
  const [totalXp, setTotalXp] = useState<number | null>(null);
  const [rank, setRank] = useState<string | null>(null);
  const [streak, setStreak] = useState<LiveStreakState | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const today = localDate(realDeps.now(), DEFAULT_CONFIG.arc.timezone, DEFAULT_CONFIG.arc.dayBoundaryHour);

  useEffect(() => {
    void (async () => {
      const [xp, streakState, currentRank] = await Promise.all([
        getTotalXp(),
        getStreakState(today, DEFAULT_CONFIG),
        getCurrentRank(),
      ]);
      setTotalXp(xp);
      setStreak(streakState);
      setRank(currentRank);
    })();
  }, [today]);

  if (totalXp === null || rank === null) return null;
  const level = levelFor(totalXp, DEFAULT_CONFIG);

  const pct =
    level.xpForNext > 0 ? Math.min(100, (level.xpIntoLevel / level.xpForNext) * 100) : 0;

  return (
    <div>
      {/* The level card. Level and rank sit together here because this is
          the screen where the difference matters — final/01 §4: level
          measures effort, rank measures evidence, and they are not
          convertible. The plate behind them is Blue Arc: this tab is the
          game's own accounting, not the real-world result. */}
      <div className="relative mt-3 h-[210px] overflow-hidden" style={{ border: '1px solid var(--hair)' }}>
        <ArtLayer slot="progress" scrim="hero" focal="50% 28%" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5">
          <div className="flex items-end justify-between">
            <span className="flex items-baseline gap-2.5">
              <span className="text-xxs uppercase text-ink-700">LV</span>
              <span className="glow-text font-mono text-xl tabular-nums text-ink-100">
                {level.level}
              </span>
            </span>
            <span className="flex items-baseline gap-2.5">
              <span className="text-xxs uppercase text-ink-700">Rank</span>
              <span className="font-display text-title leading-none text-ink-100">{rank}</span>
            </span>
          </div>

          <MeterBar pct={pct} height={8} label="XP to next level" />

          <div className="flex items-baseline justify-between font-mono text-xs tabular-nums text-ink-700">
            <span>
              <span className="text-accent-mid">{level.xpIntoLevel.toLocaleString()}</span> /{' '}
              {level.xpForNext.toLocaleString()}
            </span>
            <span>{level.totalXp.toLocaleString()} total</span>
          </div>
        </div>
      </div>

      {streak && (
        <p className="mt-3 font-mono text-xs tabular-nums text-faint">
          {streak.consistency_7}% (7d) · {streak.consistency_28}% (28d) · streak {streak.arc_streak}
        </p>
      )}

      <div className="mt-4">
        <SecondaryButton onClick={() => setReviewOpen(true)}>Weekly review</SecondaryButton>
      </div>

      <AttributeBars />
      {reviewOpen && <WeeklyReview today={today} onClose={() => setReviewOpen(false)} />}
    </div>
  );
}

/**
 * One measured line: what it was on Day 0, what it is now.
 *
 * The Day-0 column is not stored anywhere and does not need to be. Every
 * number on this tab is a cumulative all-time count of things that did
 * not exist before the arc started, so its Day-0 value is zero by
 * construction — and a rate over zero attempts is not zero, it is
 * undefined, which is what the dash says. Printing that column is the
 * whole point of the screen: final/06 §5.5 makes REALITY the default
 * answer to "how am I doing?" from Day 30, and the honest answer is a
 * distance, not a score.
 */
function Row({ label, day0, now }: { label: string; day0: string; now: string }) {
  const moved = now !== day0;
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--hair)' }}>
      {/* The label is the only thing allowed to truncate. A number cut
          short is a different number; a label cut short is still
          recognisable next to its row. */}
      <span className="min-w-0 flex-1 truncate text-sm text-ink-500">{label}</span>
      <span className="w-[44px] shrink-0 text-right font-mono text-xs tabular-nums text-faint">
        {day0}
      </span>
      <span
        className={[
          'w-[58px] shrink-0 text-right font-mono text-sm tabular-nums',
          moved ? 'text-accent-mid' : 'text-ink-700',
        ].join(' ')}
      >
        {now}
      </span>
    </div>
  );
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function RealityTab() {
  const [summary, setSummary] = useState<RealitySummary | null>(null);

  useEffect(() => {
    void (async () => {
      const today = localDate(realDeps.now(), DEFAULT_CONFIG.arc.timezone, DEFAULT_CONFIG.arc.dayBoundaryHour);
      setSummary(await getRealitySummary(today));
    })();
  }, []);

  if (!summary) return null;

  const rows: { label: string; day0: string; now: string }[] = [
    { label: 'Problems', day0: '0', now: String(summary.problems) },
    {
      label: 'First-attempt M',
      day0: '—',
      now: summary.firstAttemptRateM > 0 ? pct(summary.firstAttemptRateM) : '—',
    },
    { label: 'Public projects', day0: '0', now: String(summary.publicProjects) },
    { label: 'Evals', day0: '0', now: String(summary.evals) },
    { label: 'Applications', day0: '0', now: String(summary.applications) },
    {
      label: 'Quality rate',
      day0: '—',
      now: summary.applications > 0 ? pct(summary.qualityRate) : '—',
    },
    {
      label: 'Follow-through',
      day0: '—',
      now: summary.followThroughRate > 0 ? pct(summary.followThroughRate) : '—',
    },
    { label: 'Foundations Fluent+', day0: '0 / 9', now: `${summary.foundationsFluentOrBetter} / 9` },
  ];

  return (
    <div className="mt-4" data-testid="reality-tab">
      <SectionLabel rule>Controlled</SectionLabel>
      <p className="mt-2 text-xs leading-[1.5] text-faint">
        Cumulative and all-time. Everything here started at zero.
      </p>

      {/* Column heads, not a table header row: two words that have to
          line up with the two number columns below and nothing else. */}
      <div className="mt-4 flex items-center gap-3 pb-1.5">
        <span className="min-w-0 flex-1" />
        <span className="w-[44px] shrink-0 text-right text-xxs uppercase text-faint">Day 0</span>
        <span className="w-[58px] shrink-0 text-right text-xxs uppercase text-ink-700">Now</span>
      </div>

      {rows.map((r) => (
        <Row key={r.label} label={r.label} day0={r.day0} now={r.now} />
      ))}
    </div>
  );
}
