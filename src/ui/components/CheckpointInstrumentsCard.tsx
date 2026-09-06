import { useEffect, useState } from 'react';
import type { Checkpoint } from '../../engine/rank';
import { getCheckpoint, instrumentsComplete, saveCheckpointInstruments } from '../../store/checkpoint';
import { realDeps } from '../../store/deps';
import {
  InstrumentSliders,
  SELF_EFFICACY_QUESTIONS,
  AUTOMATICITY_QUESTIONS,
  ENJOYMENT_QUESTIONS,
  type SelfEfficacyItems,
  type AutomaticityItems,
  type EnjoymentItems,
} from './InstrumentSliders';

interface CheckpointInstrumentsCardProps {
  day: Checkpoint['day'];
  label: string;
  header?: { title: string; subtitle: string };
  saveLabel?: string;
}

/**
 * docs/04 §5.2-5.3 — self-efficacy, automaticity and enjoyment,
 * administered at Day 0/30/60/90/120. Shared between Profile.tsx's
 * Day-0 catch-up row and CheckpointScreen.tsx's later-checkpoint
 * section: same three instruments, same scales, same save path
 * (store/checkpoint.ts's saveCheckpointInstruments) — only the
 * collapsed-button label and optional intro copy differ per caller.
 * Supplementary self-report, never a gate: visible independent of
 * whether the checkpoint itself is sealed.
 */
export function CheckpointInstrumentsCard({ day, label, header, saveLabel = 'Save' }: CheckpointInstrumentsCardProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selfEfficacy, setSelfEfficacy] = useState<number[]>([50, 50, 50, 50, 50, 50]);
  const [automaticity, setAutomaticity] = useState<number[]>([4, 4, 4, 4]);
  const [enjoyment, setEnjoyment] = useState<number[]>([5, 5, 5]);

  useEffect(() => {
    let cancelled = false;
    getCheckpoint(day).then((checkpoint) => {
      if (!cancelled) setVisible(!instrumentsComplete(checkpoint));
    });
    return () => {
      cancelled = true;
    };
  }, [day]);

  if (!visible) return null;

  async function handleSave() {
    setSaving(true);
    await saveCheckpointInstruments(
      day,
      {
        selfEfficacy: selfEfficacy as SelfEfficacyItems,
        automaticity: automaticity as AutomaticityItems,
        enjoyment: enjoyment as EnjoymentItems,
      },
      realDeps
    );
    setSaving(false);
    setVisible(false);
  }

  return (
    <div className="mt-4 rounded-md border border-border p-3">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="min-h-[44px] w-full text-left text-sm text-accent"
        >
          {label}
        </button>
      ) : (
        <div className="space-y-6">
          {header && (
            <div>
              <div className="text-md text-text">{header.title}</div>
              <p className="text-sm text-text-dim">{header.subtitle}</p>
            </div>
          )}

          <InstrumentSliders
            title="How confident are you, right now, that you could:"
            questions={SELF_EFFICACY_QUESTIONS}
            values={selfEfficacy}
            onChange={setSelfEfficacy}
            min={0}
            max={100}
            step={10}
          />
          <InstrumentSliders
            title={'"I do this without having to consciously remember or decide."'}
            questions={AUTOMATICITY_QUESTIONS}
            values={automaticity}
            onChange={setAutomaticity}
            min={1}
            max={7}
            step={1}
          />
          <InstrumentSliders
            title="How much do you enjoy this, independent of its usefulness?"
            questions={ENJOYMENT_QUESTIONS}
            values={enjoyment}
            onChange={setEnjoyment}
            min={0}
            max={10}
            step={1}
          />

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="min-h-[44px] w-full rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
          >
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      )}
    </div>
  );
}
