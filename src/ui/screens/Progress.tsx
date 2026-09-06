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
import { ArtLayer, MeterBar, ScreenHeader, SecondaryButton, Segmented } from '../kit';

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
      <ScreenHeader title="PROGRESS" />
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
        {day != null && <p className="mt-3 text-xxs text-faint">Day {day}</p>}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm">
      <span className="text-text-dim">{label}</span>
      <span className="font-mono tabular-nums text-text">{value}</span>
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

  return (
    <div className="mt-3" data-testid="reality-tab">
      <div className="mb-1 text-xxs uppercase tracking-wide text-text-faint">Controlled</div>
      <Row label="Problems" value={String(summary.problems)} />
      <Row label="First-attempt M" value={summary.firstAttemptRateM > 0 ? pct(summary.firstAttemptRateM) : '—'} />
      <Row label="Public projects" value={String(summary.publicProjects)} />
      <Row label="Evals" value={String(summary.evals)} />
      <Row label="Applications" value={String(summary.applications)} />
      <Row label="Quality rate" value={summary.applications > 0 ? pct(summary.qualityRate) : '—'} />
      <Row label="Follow-through" value={summary.followThroughRate > 0 ? pct(summary.followThroughRate) : '—'} />
      <Row label="Foundations Fluent+" value={`${summary.foundationsFluentOrBetter} / 9`} />
    </div>
  );
}
