import { useState } from 'react';
import type { CoreQuestKey, ReviewBlocker } from '../../engine/types';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { completeEveningReview, getDailyReport, type DailyReport } from '../../store/review';
import { DotPicker } from '../components/DotPicker';
import { SingleChipSelect } from '../components/SingleChipSelect';

const BLOCKER_LABELS: Record<ReviewBlocker, string> = {
  time: 'Time',
  tired: 'Tired',
  wrong_time: 'Wrong time',
  didnt_want_to: "Didn't want to",
  nothing: 'Nothing',
};

const PRIORITY_LABELS: Record<CoreQuestKey, string> = {
  career: 'Career',
  dsa: 'DSA',
  build: 'Build',
  training: 'Train',
  sleep: 'Sleep',
  attention: 'Attention',
};
const PRIORITY_OPTIONS: CoreQuestKey[] = ['career', 'dsa', 'build', 'training'];

interface EveningReviewProps {
  today: string;
  day: number | null;
  arcId: string;
  onClose: () => void;
}

/** final/05 §5 — 25 seconds, 5 taps, no typing. One screen, everything
 * visible at once (not a step wizard) — matches the wireframe and the
 * time budget. Submitting shows the daily report; tap anywhere on the
 * report to finish. */
export function EveningReview({ today, day, arcId, onClose }: EveningReviewProps) {
  const [energy, setEnergy] = useState(3);
  const [focus, setFocus] = useState(3);
  const [blocker, setBlocker] = useState<ReviewBlocker | null>(null);
  const [priority, setPriority] = useState<CoreQuestKey | null>(null);
  const [sleptAt, setSleptAt] = useState('02:00');
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState<DailyReport | null>(null);

  async function handleComplete() {
    if (!blocker || submitting) return;
    setSubmitting(true);
    await completeEveningReview(
      today,
      arcId,
      { energy, focus, blocker, tomorrowPriority: priority ?? undefined, sleptAt },
      DEFAULT_CONFIG,
      realDeps
    );
    const result = await getDailyReport(today, DEFAULT_CONFIG);
    setReport(result);
    setSubmitting(false);
  }

  if (report) {
    return <DailyReportView report={report} day={day} onDismiss={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50">
      <div
        className="flex flex-col gap-4 rounded-t-md border-t border-border bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <div className="text-xxs uppercase tracking-wide text-text-dim">
          {day != null ? `DAY ${day} · ` : ''}EVENING
        </div>

        <DotPicker label="Energy" value={energy} onChange={setEnergy} />
        <DotPicker label="Focus" value={focus} onChange={setFocus} />

        <SingleChipSelect
          label="What got in the way?"
          options={Object.keys(BLOCKER_LABELS) as ReviewBlocker[]}
          labelFor={(k) => BLOCKER_LABELS[k]}
          selected={blocker}
          onSelect={setBlocker}
        />

        <SingleChipSelect
          label="Tomorrow's one priority"
          options={PRIORITY_OPTIONS}
          labelFor={(k) => PRIORITY_LABELS[k]}
          selected={priority}
          onSelect={setPriority}
        />

        <label className="block">
          <span className="text-xxs uppercase tracking-wide text-text-dim">Slept at</span>
          <input
            type="time"
            value={sleptAt}
            onChange={(e) => setSleptAt(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
          />
        </label>

        <button
          type="button"
          disabled={!blocker || submitting}
          onClick={() => void handleComplete()}
          className="min-h-[44px] w-full rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
        >
          {submitting ? 'Saving…' : 'Complete day'}
        </button>
      </div>
    </div>
  );
}

function DailyReportView({
  report,
  day,
  onDismiss,
}: {
  report: DailyReport;
  day: number | null;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg p-6"
      onClick={onDismiss}
      role="button"
      tabIndex={0}
      aria-label="Daily report. Dismiss."
    >
      <div className="text-xxs uppercase tracking-wide text-text-dim">
        DAILY REPORT · DAY {day ?? report.day}
      </div>

      <div className="w-full max-w-xs space-y-2 font-mono text-sm tabular-nums text-text">
        <Row label="XP" value={`${report.xp}`} />
        <Row label="Core quests" value={`${report.coreCompleted} / ${report.coreTotal}`} />
        <Row label="Arc streak" value={`${report.arcStreak} days`} />
        {report.strongest && (
          <Row
            label="Strongest"
            value={`${report.strongest.title} — ${report.strongest.streakDays}${report.strongest.streakDays === 1 ? 'st' : 'th'} consecutive day`}
          />
        )}
        {report.weakest && (
          <Row
            label="Weakest"
            value={`${report.weakest.title} — ${report.weakest.missesInWindow} misses in ${report.weakest.windowDays}`}
          />
        )}
      </div>

      <p className="mt-4 max-w-xs text-center text-sm italic text-text-dim">"{report.message}"</p>

      <div className="mt-8 text-xxs uppercase tracking-wide text-text-faint">tap anywhere</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-1">
      <span className="text-text-dim">{label}</span>
      <span>{value}</span>
    </div>
  );
}
