import { useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { logTrainingSession, logSteps } from '../../store/training';
import { SingleChipSelect } from '../components/SingleChipSelect';
import { Stepper } from '../components/Stepper';

const MODES = ['Session', 'Steps'] as const;
const TYPES = ['Push', 'Pull', 'Legs', 'Full', 'Conditioning'] as const;

interface LogTrainingSheetProps {
  today: string;
  arcId: string;
  onClose: () => void;
}

/** final/04 §1-3 — TRAINING completes on either a logged session or
 * >= 8,000 steps; this sheet is one entry point for both, picked via the
 * Session/Steps toggle (same "mode toggle" shape as BUILD's LEARN/SHIP). */
export function LogTrainingSheet({ today, arcId, onClose }: LogTrainingSheetProps) {
  const [mode, setMode] = useState<(typeof MODES)[number]>('Session');
  const [type, setType] = useState<(typeof TYPES)[number] | null>(null);
  const [minutes, setMinutes] = useState(45);
  const [rpe, setRpe] = useState(6);
  const [steps, setSteps] = useState(8000);
  const [submitting, setSubmitting] = useState(false);

  const canLog = mode === 'Steps' ? steps > 0 : type !== null;

  async function handleLog() {
    if (!canLog || submitting) return;
    setSubmitting(true);
    try {
      if (mode === 'Session') {
        await logTrainingSession(today, arcId, { type: type!, minutes, rpe }, DEFAULT_CONFIG, realDeps);
      } else {
        await logSteps(today, arcId, steps, DEFAULT_CONFIG, realDeps);
      }
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
          <h2 className="text-lg font-semibold text-text">LOG TRAINING</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] text-text-dim">
            ✕
          </button>
        </div>

        <SingleChipSelect label="Mode" options={MODES} labelFor={(m) => m} selected={mode} onSelect={setMode} />

        {mode === 'Session' ? (
          <>
            <SingleChipSelect label="Type" options={TYPES} labelFor={(t) => t} selected={type} onSelect={setType} />
            <Stepper label="Minutes" value={minutes} step={5} min={5} onChange={setMinutes} />
            <Stepper label="RPE" value={rpe} step={1} min={1} onChange={(v) => setRpe(Math.min(10, v))} />
          </>
        ) : (
          <Stepper label="Steps" value={steps} step={500} min={0} onChange={setSteps} />
        )}

        <button
          type="button"
          disabled={!canLog || submitting}
          onClick={() => void handleLog()}
          className="min-h-[44px] rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
        >
          {submitting ? 'Logging…' : mode === 'Session' ? 'Log session' : 'Log steps'}
        </button>
      </div>
    </div>
  );
}
