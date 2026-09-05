import { useEffect, useState } from 'react';

interface MasteryMomentProps {
  topic: string;
  state: 'introduced' | 'applied' | 'fluent' | 'retained';
  onDismiss: () => void;
}

const STATE_LABELS: Record<MasteryMomentProps['state'], string> = {
  introduced: 'Introduced',
  applied: 'Applied',
  fluent: 'Fluent',
  retained: 'Retained',
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Card overlay, 600ms — final/05 §2.1. Quieter than a full-screen
 * Moment by design: a mastery transition happens mid-session, often
 * right after logging a problem or a block, and shouldn't stop what
 * you were doing the way LEVEL UP or BOSS CLEARED do. Auto-dismisses
 * after its 600ms unless tapped sooner; never blocks input underneath.
 */
export function MasteryMoment({ topic, state, onDismiss }: MasteryMomentProps) {
  const reduced = prefersReducedMotion();
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(onDismiss, 2000); // still self-clears; just skips the fade
      return () => clearTimeout(t);
    }
    const showTimer = setTimeout(() => setVisible(true), 0);
    const hideTimer = setTimeout(() => setVisible(false), 600);
    const dismissTimer = setTimeout(onDismiss, 900);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(dismissTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount, by design
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4"
      onClick={onDismiss}
      role="button"
      tabIndex={0}
      aria-label={`${topic} advanced to ${STATE_LABELS[state]}. Dismiss.`}
    >
      <div
        className={[
          'flex items-center gap-3 rounded-md border border-accent bg-surface px-4 py-3 shadow-lg transition-all',
          reduced ? '' : 'duration-300 ease-out',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        ].join(' ')}
      >
        <span className="text-xxs uppercase tracking-wide text-text-faint">MASTERY</span>
        <span className="font-mono text-sm text-text">
          {topic} → {STATE_LABELS[state]}
        </span>
      </div>
    </div>
  );
}
