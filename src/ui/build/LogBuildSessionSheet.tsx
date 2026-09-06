import { useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { logBuildSession } from '../../store/build';
import { SingleChipSelect } from '../components/SingleChipSelect';
import { Stepper } from '../components/Stepper';
import { EvidenceAcceptedMoment } from '../moments/EvidenceAcceptedMoment';
import { DeepWorkTimer } from '../components/DeepWorkTimer';

const MODES = ['LEARN', 'SHIP'] as const;

interface LogBuildSessionSheetProps {
  today: string;
  arcId: string;
  onClose: () => void;
}

/** final/03 §4.1 — every BUILD log requires a mode. LEARN feeds
 * FOUNDATIONS/tier mastery; SHIP feeds an artifact row + 50 XP bonus. */
export function LogBuildSessionSheet({ today, arcId, onClose }: LogBuildSessionSheetProps) {
  const [mode, setMode] = useState<(typeof MODES)[number] | null>(null);
  const [minutes, setMinutes] = useState(45);
  const [projectKey, setProjectKey] = useState('');
  const [shippedTitle, setShippedTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evidenceMoment, setEvidenceMoment] = useState<{ kind: string; title: string } | null>(null);

  const canLog = mode !== null && projectKey.trim().length > 0;

  async function handleLog() {
    if (!canLog || submitting) return;
    setSubmitting(true);
    try {
      const shippedArtifact = mode === 'SHIP' && shippedTitle.trim() ? { kind: 'feature' as const, title: shippedTitle.trim() } : undefined;
      await logBuildSession(today, arcId, { mode: mode!, minutes, projectKey: projectKey.trim(), shippedArtifact }, DEFAULT_CONFIG, realDeps);
      // final/05 §2.1's EVIDENCE ACCEPTED Moment — fires only when a
      // public artefact was actually logged this session, not on every
      // BUILD log.
      if (shippedArtifact) {
        setEvidenceMoment(shippedArtifact);
      } else {
        onClose();
      }
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
          <h2 className="text-lg font-semibold text-text">LOG BUILD SESSION</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] text-text-dim">
            ✕
          </button>
        </div>

        <SingleChipSelect label="Mode — required" options={MODES} labelFor={(m) => m} selected={mode} onSelect={setMode} />

        <label className="block">
          <span className="text-xxs uppercase tracking-wide text-text-dim">Project</span>
          <input
            type="text"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
          />
        </label>

        <Stepper label="Minutes" value={minutes} step={5} min={5} onChange={setMinutes} />
        <DeepWorkTimer onStop={setMinutes} />

        {mode === 'SHIP' && (
          <label className="block">
            <span className="text-xxs uppercase tracking-wide text-text-dim">
              Shipped this session? (optional — +{DEFAULT_CONFIG.shipBonusXp} XP)
            </span>
            <input
              type="text"
              value={shippedTitle}
              onChange={(e) => setShippedTitle(e.target.value)}
              placeholder="e.g. Tool-calling retry logic"
              className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
            />
          </label>
        )}

        <button
          type="button"
          disabled={!canLog || submitting}
          onClick={() => void handleLog()}
          className="min-h-[44px] rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
        >
          {submitting ? 'Logging…' : 'Log session'}
        </button>
      </div>

      {evidenceMoment && (
        <EvidenceAcceptedMoment kind={evidenceMoment.kind} title={evidenceMoment.title} onDismiss={onClose} />
      )}
    </div>
  );
}
