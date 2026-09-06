import type { ReactNode } from 'react';
import type { ArtSlot } from '../../assets/art';
import { useBackDismiss } from '../routing/OverlayStack';
import { ArtLayer } from './ArtLayer';
import { FramedPanel } from './Panel';

interface MomentProps {
  /**
   * The accessible name, and the dismissal instruction.
   *
   * Frozen by the test contract: xp.spec.ts selects the level-up Moment
   * with `getByRole('button', { name: /Level up/ })`, so the root stays
   * a button and this label keeps its wording.
   */
  label: string;
  onDismiss: () => void;
  children: ReactNode;
  /** Gold for evidence (rank, checkpoint), boss for a cleared boss. */
  tone?: 'accent' | 'dawn' | 'boss';
  slot?: ArtSlot;
  /** Shown at the foot. Omitted when a Moment has its own instruction. */
  hint?: string;
}

/**
 * The full-screen ceremony layer.
 *
 * `final/05` §2.3 governs what these may do, and the constraints are
 * severe on purpose: dismissible on any tap, never blocking input, no
 * sound. This is the frame; each Moment supplies its own phased reveal
 * and haptics, which is why timing lives in the individual components
 * rather than here.
 *
 * The root is a button rather than a dialog because the entire surface
 * is one dismissal target — there is nothing inside to tab to, and a
 * modal that traps focus for a 700ms celebration would be hostile.
 */
export function Moment({
  label,
  onDismiss,
  children,
  tone = 'accent',
  slot,
  hint = 'tap anywhere',
}: MomentProps) {
  // Back dismisses the Moment rather than leaving the screen behind it.
  useBackDismiss(true, onDismiss);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onDismiss}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onDismiss();
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-void px-gutter"
    >
      {slot && <ArtLayer slot={slot} scrim="moment" priority />}

      <FramedPanel tone={tone} className="relative w-full max-w-shell px-5 py-8">
        {children}
      </FramedPanel>

      {hint && (
        <p className="relative mt-8 text-xxs uppercase text-faint" aria-hidden>
          {hint}
        </p>
      )}
    </div>
  );
}
