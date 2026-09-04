import { useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { logProblem } from '../../store/dsa';
import type { AttemptOutcome } from '../../engine/srs';
import { SingleChipSelect } from '../components/SingleChipSelect';
import { Stepper } from '../components/Stepper';

const TOPICS = ['Arrays', 'Strings', 'Hashing', 'Two Pointers', 'Sliding Window', 'Stacks', 'Trees', 'Graphs', 'DP'] as const;
const DIFFICULTIES = ['E', 'M', 'H'] as const;
const OUTCOMES: AttemptOutcome[] = ['first_attempt', 'hint', 'editorial', 'unsolved'];
const OUTCOME_LABELS: Record<AttemptOutcome, string> = {
  first_attempt: 'First attempt',
  hint: 'Hint',
  editorial: 'Editorial',
  unsolved: 'Unsolved',
};

interface LogProblemSheetProps {
  today: string;
  arcId: string;
  onClose: () => void;
}

/** final/03 §2.1 — a 7-second logging budget. */
export function LogProblemSheet({ today, arcId, onClose }: LogProblemSheetProps) {
  const [problem, setProblem] = useState('');
  const [topic, setTopic] = useState<(typeof TOPICS)[number] | null>(null);
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number] | null>(null);
  const [outcome, setOutcome] = useState<AttemptOutcome | null>(null);
  const [minutes, setMinutes] = useState(25);
  const [insight, setInsight] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canLog = problem.trim().length > 0 && topic !== null && difficulty !== null && outcome !== null;

  async function handleLog() {
    if (!canLog || submitting) return;
    setSubmitting(true);
    try {
      await logProblem(
        today,
        arcId,
        {
          slug: problem.trim().toLowerCase().replace(/\s+/g, '-'),
          title: problem.trim(),
          topic: topic!,
          difficulty: difficulty!,
          outcome: outcome!,
          minutes,
          insight: insight.trim() || undefined,
        },
        DEFAULT_CONFIG,
        realDeps
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full flex-col gap-3 overflow-y-auto rounded-t-md border-t border-border bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">LOG PROBLEM</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] text-text-dim">
            ✕
          </button>
        </div>

        <label className="block">
          <span className="text-xxs uppercase tracking-wide text-text-dim">Problem</span>
          <input
            type="text"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
          />
        </label>

        <SingleChipSelect label="Topic" options={TOPICS} labelFor={(t) => t} selected={topic} onSelect={setTopic} />
        <SingleChipSelect
          label="Difficulty"
          options={DIFFICULTIES}
          labelFor={(d) => d}
          selected={difficulty}
          onSelect={setDifficulty}
        />
        <SingleChipSelect
          label="Outcome"
          options={OUTCOMES}
          labelFor={(o) => OUTCOME_LABELS[o]}
          selected={outcome}
          onSelect={setOutcome}
        />

        <Stepper label="Minutes" value={minutes} step={5} min={5} onChange={setMinutes} />

        <label className="block">
          <span className="text-xxs uppercase tracking-wide text-text-dim">Insight (optional)</span>
          <input
            type="text"
            value={insight}
            onChange={(e) => setInsight(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
          />
        </label>

        <button
          type="button"
          disabled={!canLog || submitting}
          onClick={() => void handleLog()}
          className="min-h-[44px] rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
        >
          {submitting ? 'Logging…' : 'Log problem'}
        </button>
      </div>
    </div>
  );
}
