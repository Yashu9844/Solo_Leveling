import { useState } from 'react';
import type { CoreQuestKey, ReviewBlocker } from '../../engine/types';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { completeEveningReview, getDailyReport, type DailyReport } from '../../store/review';
import { DotPicker } from '../components/DotPicker';
import { SingleChipSelect } from '../components/SingleChipSelect';
import { ArtLayer, Field, Panel, Portal, PrimaryButton, QuoteCard, Sheet, TextInput } from '../kit';

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
    <Sheet
      open
      onClose={onClose}
      title={day != null ? `Day ${day} · Evening` : 'Evening'}
      footer={
        <PrimaryButton
          size="md"
          disabled={!blocker || submitting}
          onClick={() => void handleComplete()}
        >
          {submitting ? 'Saving…' : 'Complete day'}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-6">
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

        <Field label="Slept at">
          <TextInput type="time" value={sleptAt} onChange={(e) => setSleptAt(e.target.value)} />
        </Field>
      </div>
    </Sheet>
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
    // The day's closing surface. It is a full-screen report rather than
    // a toast because the day is over — final/05 §5 ends the loop with
    // something to read, not something to acknowledge.
    <Portal>
      <div
        className="fixed inset-0 z-[55] flex flex-col justify-center overflow-y-auto px-gutter py-10"
        style={{ background: 'var(--void)' }}
        onClick={onDismiss}
        role="button"
        tabIndex={0}
        aria-label="Daily report. Dismiss."
      >
        <ArtLayer slot="review" scrim="quiet" focal="50% 35%" />

        <div className="relative">
          <p className="text-center text-xxs uppercase tracking-wide text-ink-700">
            DAILY REPORT · DAY {day ?? report.day}
          </p>

          <Panel cut="md" className="mx-auto mt-5 w-full max-w-[380px]" bodyClassName="px-4 py-4">
            <Row label="XP" value={`${report.xp}`} />
            <Row label="Core quests" value={`${report.coreCompleted} / ${report.coreTotal}`} />
            <Row label="Arc streak" value={`${report.arcStreak} ${report.arcStreak === 1 ? 'day' : 'days'}`} />
            {report.strongest && (
              <Row
                stacked
                label="Strongest"
                value={`${report.strongest.title} — ${report.strongest.streakDays}${report.strongest.streakDays === 1 ? 'st' : 'th'} consecutive day`}
              />
            )}
            {report.weakest && (
              <Row
                stacked
                label="Weakest"
                value={`${report.weakest.title} — ${report.weakest.missesInWindow} misses in ${report.weakest.windowDays}`}
              />
            )}
          </Panel>

          {/* The one sanctioned quote surface. design/00 §7 bans these at
              the point of action and on any failure screen; the evening
              report is neither — the day is already done, and this is
              the app's closing line rather than encouragement to act. */}
          <QuoteCard attributed className="mx-auto mt-5 w-full max-w-[380px]">
            {report.message}
          </QuoteCard>

          <p className="mt-8 text-center text-xxs uppercase tracking-wide text-faint">tap anywhere</p>
        </div>
      </div>
    </Portal>
  );
}

/**
 * A labelled figure in the report.
 *
 * The label holds a fixed column and the value takes the rest, wrapping
 * rather than truncating: "Strongest" carries a whole sentence, and the
 * numbers ("1 / 6") are read verbatim by review.spec, so neither side
 * may be cut.
 */
function Row({ label, value, stacked = false }: { label: string; value: string; stacked?: boolean }) {
  // Numbers sit on one line opposite their label. Sentences ("CAREER —
  // 1st consecutive day") get their own line underneath and are set in
  // sans: right-aligned wrapped mono broke them into ragged fragments
  // with two words orphaned on the last line.
  if (stacked) {
    return (
      <div className="py-2.5" style={{ borderBottom: '1px solid var(--hair-faint)' }}>
        <span className="text-xs text-ink-700">{label}</span>
        <p className="mt-1 text-sm leading-[1.45] text-ink-100">{value}</p>
      </div>
    );
  }

  return (
    <div
      className="flex items-baseline gap-4 py-2.5"
      style={{ borderBottom: '1px solid var(--hair-faint)' }}
    >
      <span className="w-[86px] shrink-0 text-xs text-ink-700">{label}</span>
      <span className="min-w-0 flex-1 text-right font-mono text-sm tabular-nums text-ink-100">
        {value}
      </span>
    </div>
  );
}
