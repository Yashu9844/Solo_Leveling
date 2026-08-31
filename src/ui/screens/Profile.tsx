import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetArc } from '../../store/onboarding';
import { useArcStatus } from '../../store/ArcStatusContext';
import { getDayZeroCheckpoint, saveSelfEfficacy, selfEfficacyIsComplete } from '../../store/checkpoint';

export function Profile() {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">PROFILE</h1>
      <p className="mt-2 text-sm text-text-dim">Phase 0 — not implemented</p>
      <DayZeroBaselineRow />
      {import.meta.env.DEV && <DevResetArc />}
    </div>
  );
}

const SELF_EFFICACY_QUESTIONS = [
  'Solve an unseen medium DSA problem in 25 minutes, in front of an interviewer?',
  "Explain your last project's architecture to a senior engineer for 10 minutes?",
  'Design an evaluation suite for an agent from a blank file?',
  "Complete your planned training session on a day you don't feel like it?",
  'Hold your wake time within 30 minutes for the next 14 days?',
  'Apply to 5 roles above your current level this week?',
] as const;

/**
 * Not a new onboarding step — onboarding is already at its 90-second
 * budget. This is a one-time catch-up for an arc that already exists,
 * shown only while checkpoint(day: 0).self_efficacy is empty
 * (final/11-SLICE-2-PROMPT.md Step 1).
 */
function DayZeroBaselineRow() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<number[]>([50, 50, 50, 50, 50, 50]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDayZeroCheckpoint().then((checkpoint) => {
      if (!cancelled) {
        setVisible(!selfEfficacyIsComplete(checkpoint));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  async function handleSave() {
    setSaving(true);
    const items = values as [number, number, number, number, number, number];
    await saveSelfEfficacy(items);
    setSaving(false);
    setVisible(false);
  }

  return (
    <div className="mt-6 rounded-md border border-border p-3">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="min-h-[44px] w-full text-left text-sm text-accent"
        >
          Complete Day-0 baseline
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="text-md text-text">Baseline.</div>
            <p className="text-sm text-text-dim">
              There is no good or bad answer — this is the number we compare against in December.
            </p>
          </div>
          <p className="text-xs text-text-faint">How confident are you, right now, that you could:</p>
          {SELF_EFFICACY_QUESTIONS.map((question, idx) => (
            <label key={question} className="block">
              <span className="text-sm text-text">
                {idx + 1}. {question}
              </span>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={values[idx]}
                  onChange={(e) =>
                    setValues((prev) => prev.map((v, i) => (i === idx ? Number(e.target.value) : v)))
                  }
                  className="flex-1"
                />
                <span className="w-10 text-right font-mono text-sm tabular-nums text-text">
                  {values[idx]}
                </span>
              </div>
            </label>
          ))}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="min-h-[44px] w-full rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
          >
            Save baseline
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * DEV-only. Deletes all events and projections, clears the arc, and
 * returns to /onboarding — for re-running onboarding while stopwatching
 * it, without uninstalling the PWA each time. Never renders in production:
 * `import.meta.env.DEV` is false in a built app.
 */
function DevResetArc() {
  const navigate = useNavigate();
  const { markArcReset } = useArcStatus();

  async function handleReset() {
    await resetArc();
    markArcReset();
    navigate('/onboarding', { replace: true });
  }

  return (
    <div className="mt-8 rounded-md border border-state-alert p-3">
      <div className="text-xxs uppercase tracking-wide text-state-alert">Dev only</div>
      <button
        type="button"
        onClick={handleReset}
        className="mt-2 min-h-[44px] w-full rounded-md border border-state-alert text-sm text-state-alert"
      >
        Reset arc
      </button>
      <p className="mt-2 text-xs text-text-faint">
        Deletes all events and projections, clears the arc, returns to onboarding.
      </p>
    </div>
  );
}
