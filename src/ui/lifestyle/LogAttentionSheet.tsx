import { useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { logScreentime } from '../../store/lifestyle';
import { Stepper } from '../components/Stepper';

interface LogAttentionSheetProps {
  today: string;
  arcId: string;
  onClose: () => void;
}

/** final/04 §5 — numeric entry only, straight from Digital Wellbeing.
 * Never a yes/no, never an estimate. */
export function LogAttentionSheet({ today, arcId, onClose }: LogAttentionSheetProps) {
  const [minutes, setMinutes] = useState(45);
  const [submitting, setSubmitting] = useState(false);

  async function handleLog() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await logScreentime(today, arcId, minutes, DEFAULT_CONFIG, realDeps);
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
          <h2 className="text-lg font-semibold text-text">LOG SCREEN TIME</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] text-text-dim">
            ✕
          </button>
        </div>

        <p className="text-sm text-text-dim">Minutes from Digital Wellbeing, named apps.</p>
        <Stepper label="Minutes" value={minutes} step={5} min={0} onChange={setMinutes} />

        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleLog()}
          className="min-h-[44px] rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
        >
          {submitting ? 'Logging…' : 'Log screen time'}
        </button>
      </div>
    </div>
  );
}
