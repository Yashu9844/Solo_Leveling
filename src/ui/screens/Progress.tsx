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
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">PROGRESS</h1>
        <div className="flex gap-1 rounded-pill border border-border p-0.5">
          {(['SYSTEM', 'REALITY'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                'min-h-[32px] rounded-pill px-3 text-xs font-medium',
                tab === t ? 'bg-accent text-bg' : 'text-text-dim',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {day != null && <p className="mt-1 text-xxs text-text-faint">Day {day}</p>}

      {tab === 'SYSTEM' ? <SystemTab /> : <RealityTab />}
    </div>
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

  return (
    <div>
      <p className="mt-3 font-mono text-sm tabular-nums text-text-dim">
        LEVEL {level.level} · RANK {rank} · total XP {level.totalXp.toLocaleString()}
      </p>
      {streak && (
        <p className="mt-1 text-xxs text-text-faint">
          {streak.consistency_7}% (7d) · {streak.consistency_28}% (28d) · streak {streak.arc_streak}
        </p>
      )}
      <button
        type="button"
        onClick={() => setReviewOpen(true)}
        className="mt-3 min-h-[44px] w-full rounded-md border border-border text-sm text-accent"
      >
        Weekly review
      </button>
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
