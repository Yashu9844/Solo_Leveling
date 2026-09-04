import { useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { logSleep } from '../../store/lifestyle';

interface LogSleepSheetProps {
  today: string;
  arcId: string;
  onClose: () => void;
}

/** final/04 §4 — wake time is the whole criterion; no sleep-duration
 * scoring, no "did you sleep enough" judgment anywhere in this sheet. */
export function LogSleepSheet({ today, arcId, onClose }: LogSleepSheetProps) {
  const [wakeTime, setWakeTime] = useState(DEFAULT_CONFIG.wakeTargetTime);
  const [sleepTime, setSleepTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLog() {
    if (submitting || !wakeTime) return;
    setSubmitting(true);
    try {
      await logSleep(today, arcId, wakeTime, DEFAULT_CONFIG, realDeps, sleepTime || undefined);
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
          <h2 className="text-lg font-semibold text-text">LOG SLEEP</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] text-text-dim">
            ✕
          </button>
        </div>

        <label className="block">
          <span className="text-xxs uppercase tracking-wide text-text-dim">Wake time</span>
          <input
            type="time"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
          />
        </label>

        <label className="block">
          <span className="text-xxs uppercase tracking-wide text-text-dim">Sleep time (optional)</span>
          <input
            type="time"
            value={sleepTime}
            onChange={(e) => setSleepTime(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
          />
        </label>

        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleLog()}
          className="min-h-[44px] rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
        >
          {submitting ? 'Logging…' : 'Log wake time'}
        </button>
      </div>
    </div>
  );
}
