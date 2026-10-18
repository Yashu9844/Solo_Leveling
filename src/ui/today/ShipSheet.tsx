import { useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { shipArtifact } from '../../store/build';
import { SingleChipSelect } from '../components/SingleChipSelect';
import { Field, PrimaryButton, Sheet, TextInput } from '../kit';

const KINDS = ['feature', 'project', 'deployment', 'eval', 'writeup'] as const;
type Kind = (typeof KINDS)[number];
const KIND_LABELS: Record<Kind, string> = {
  feature: 'Feature',
  project: 'Project / app',
  deployment: 'Deployment',
  eval: 'Eval',
  writeup: 'Write-up',
};

interface ShipSheetProps {
  today: string;
  arcId: string;
  onClose: () => void;
  /** Called after a successful save, so the caller can re-read progress. */
  onShipped: () => void;
}

/**
 * Say that you shipped something — without logging build time you did not
 * spend. This is what lets the weekly "ship one real unit" quest be marked
 * done; before it, the only route was a 45-minute SHIP build session.
 */
export function ShipSheet({ today, arcId, onClose, onShipped }: ShipSheetProps) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Kind>('project');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length > 0 && !submitting;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    try {
      await shipArtifact(
        today,
        arcId,
        { kind, title, url: url.trim() || undefined },
        DEFAULT_CONFIG,
        realDeps
      );
      onShipped();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Mark as shipped"
      footer={
        <PrimaryButton
          size="md"
          disabled={!canSave}
          onClick={() => void handleSave()}
          data-testid="ship-save"
        >
          {submitting ? 'Saving…' : 'Mark shipped'}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="What did you ship?">
          <TextInput
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Portfolio site, job-tracker app"
            data-testid="ship-title"
          />
        </Field>

        <SingleChipSelect
          label="Kind"
          options={KINDS}
          labelFor={(k) => KIND_LABELS[k]}
          selected={kind}
          onSelect={setKind}
        />

        <Field label="Link (optional)">
          <TextInput
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
          />
        </Field>

        <p className="text-xs text-faint">
          Counts toward this week's ship quest and earns the +{DEFAULT_CONFIG.shipBonusXp} XP ship
          bonus. No build time is logged.
        </p>

        {error && (
          <p role="alert" className="text-xs text-state-alert">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
