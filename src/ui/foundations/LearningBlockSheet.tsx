import { useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { logLearningBlock, logSystemDesignStudy } from '../../store/build';
import { getFoundationTopicMastery } from '../../store/mastery';
import { FOUNDATION_TOPICS, type FoundationTopic } from '../../engine/foundations';
import type { MasteryState } from '../../engine/types';
import { SingleChipSelect } from '../components/SingleChipSelect';
import { Stepper } from '../components/Stepper';
import { MasteryMoment } from '../moments/MasteryMoment';

const SYSTEM_DESIGN_MODES = ['studied', 'written_up', 'explained_aloud'] as const;
type SystemDesignMode = (typeof SYSTEM_DESIGN_MODES)[number];
const SYSTEM_DESIGN_MODE_LABELS: Record<SystemDesignMode, string> = {
  studied: 'Studied',
  written_up: 'Written up',
  explained_aloud: 'Explained aloud',
};

const MASTERY_ORDER: MasteryState[] = ['unseen', 'introduced', 'applied', 'fluent', 'retained'];

interface LearningBlockSheetProps {
  today: string;
  arcId: string;
  onClose: () => void;
}

/** final/03 §3.1 — "4 seconds": topic chip, minutes, optional note, log
 * +25 XP (flat per block regardless of minutes — engine/xp.ts's LEARN
 * category rate, capped at 3/day by the 75 LEARN cap alone). Not a
 * seventh core quest, so this has no quest gate — it's always available.
 * System Design carries "extra structure" (final/03 §3.3): selecting it
 * reveals the system_design_study fields instead of logging a plain
 * block, since its studied/written-up/explained-aloud counts are what
 * the arc's rank gates and Boss IV actually reference. */
export function LearningBlockSheet({ today, arcId, onClose }: LearningBlockSheetProps) {
  const [topic, setTopic] = useState<FoundationTopic | null>(null);
  const [minutes, setMinutes] = useState(15);
  const [note, setNote] = useState('');
  const [system, setSystem] = useState('');
  const [mode, setMode] = useState<SystemDesignMode | null>(null);
  const [artifactUrl, setArtifactUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [masteryMoment, setMasteryMoment] = useState<{ topic: string; state: 'introduced' | 'applied' | 'fluent' | 'retained' } | null>(
    null
  );

  const isSystemDesign = topic === 'System Design';
  const canLog = topic !== null && (!isSystemDesign || (system.trim().length > 0 && mode !== null));

  async function handleLog() {
    if (!canLog || submitting || !topic) return;
    setSubmitting(true);
    try {
      const before = await getFoundationTopicMastery(topic);
      if (isSystemDesign) {
        await logSystemDesignStudy(
          today,
          arcId,
          system.trim(),
          mode!,
          minutes,
          DEFAULT_CONFIG,
          realDeps,
          artifactUrl.trim() || undefined,
          note.trim() || undefined
        );
      } else {
        await logLearningBlock(today, arcId, topic, minutes, DEFAULT_CONFIG, realDeps, note.trim() || undefined);
      }
      const after = await getFoundationTopicMastery(topic);
      if (MASTERY_ORDER.indexOf(after) > MASTERY_ORDER.indexOf(before) && after !== 'unseen') {
        setMasteryMoment({ topic, state: after });
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
          <h2 className="text-lg font-semibold text-text">LEARNING BLOCK</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] text-text-dim">
            ✕
          </button>
        </div>

        <SingleChipSelect label="Topic" options={FOUNDATION_TOPICS} labelFor={(t) => t} selected={topic} onSelect={setTopic} />

        {isSystemDesign && (
          <>
            <label className="block">
              <span className="text-xxs uppercase tracking-wide text-text-dim">System</span>
              <input
                type="text"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder="e.g. URL shortener"
                className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
              />
            </label>
            <SingleChipSelect
              label="Mode"
              options={SYSTEM_DESIGN_MODES}
              labelFor={(m) => SYSTEM_DESIGN_MODE_LABELS[m]}
              selected={mode}
              onSelect={setMode}
            />
            <label className="block">
              <span className="text-xxs uppercase tracking-wide text-text-dim">Artifact URL (optional)</span>
              <input
                type="text"
                value={artifactUrl}
                onChange={(e) => setArtifactUrl(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
              />
            </label>
          </>
        )}

        <Stepper label="Minutes" value={minutes} step={5} min={5} suffix="min" onChange={setMinutes} />

        <label className="block">
          <span className="text-xxs uppercase tracking-wide text-text-dim">Note (optional)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
          />
        </label>

        <button
          type="button"
          disabled={!canLog || submitting}
          onClick={() => void handleLog()}
          className="min-h-[44px] rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
        >
          {submitting ? 'Logging…' : `Log · +${DEFAULT_CONFIG.learningBlockXp} XP`}
        </button>
      </div>

      {masteryMoment && (
        <MasteryMoment topic={masteryMoment.topic} state={masteryMoment.state} onDismiss={onClose} />
      )}
    </div>
  );
}
