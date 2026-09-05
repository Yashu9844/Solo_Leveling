import { useState } from 'react';
import type { ComparisonRow, GateCondition } from '../../engine/rank';

interface CheckpointMomentProps {
  day: number;
  rankBefore: string;
  rankAfter: string;
  rows: ComparisonRow[];
  conditions: GateCondition[];
  verdictText: string;
  onDismiss: () => void;
}

/**
 * final/05 §2.1's CHECKPOINT Moment: "Sequence, self-paced" — the one
 * Moment with no timer anywhere. Every other Moment auto-resolves
 * (700ms-1100ms full-screen, 600ms card); this is deliberately the
 * opposite, since final/06 §5.8 calls the checkpoint report "the most
 * important screen in the product" and that isn't something to read on
 * a clock. Three steps, advanced by tap: the rank line, the vs-previous-
 * checkpoint comparison, then the gate checklist + verdict — tapping
 * the last step dismisses.
 */
export function CheckpointMoment({ day, rankBefore, rankAfter, rows, conditions, verdictText, onDismiss }: CheckpointMomentProps) {
  const [step, setStep] = useState(0);
  const rankAdvanced = rankAfter !== rankBefore;
  const lastStep = 2;

  function advance() {
    if (step >= lastStep) {
      onDismiss();
    } else {
      setStep(step + 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg px-6"
      onClick={advance}
      role="button"
      tabIndex={0}
      aria-label="Checkpoint report. Tap to continue."
      data-testid="checkpoint-moment"
      data-step={step}
    >
      {step === 0 && (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-xxs uppercase tracking-wide text-text-faint">CHECKPOINT · DAY {day}</span>
          {rankAdvanced ? (
            <span className="font-mono text-4xl text-text">
              {rankBefore} → {rankAfter}
            </span>
          ) : (
            <span className="font-mono text-3xl text-text">SEALED</span>
          )}
          <div className="mt-2 h-px w-16 bg-accent" />
        </div>
      )}

      {step === 1 && (
        <div className="w-full max-w-sm">
          <div className="mb-4 text-center text-xxs uppercase tracking-wide text-text-faint">vs previous checkpoint</div>
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-sm text-text-dim">{row.label}</span>
                <span className={`font-mono text-sm ${row.improved ? 'text-accent' : 'text-text'}`}>
                  {row.before} → {row.after}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-sm">
          <p className="mb-4 text-center text-sm text-text">{verdictText}</p>
          <div className="space-y-1">
            {conditions.map((c, i) => (
              <p key={i} className={`text-xs ${c.met ? 'text-text-dim' : 'text-text-faint'}`}>
                {c.met ? '✓' : '✗'} {c.label}
              </p>
            ))}
          </div>
          <p className="mt-6 text-center text-xxs uppercase tracking-wide text-text-faint">tap to continue</p>
        </div>
      )}
    </div>
  );
}
