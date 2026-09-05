import { useEffect, useState } from 'react';

interface EvidenceAcceptedMomentProps {
  kind: string;
  title: string;
  onDismiss: () => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Card overlay, 600ms — final/05 §2.1. Fires when a public artefact
 * (repo, deploy, write-up) is logged (engine/xp.ts's ARTIFACT_SHIPPED —
 * the same event that grants the SHIP bonus). Same quiet, non-blocking
 * treatment as MasteryMoment: this happens inline with logging a BUILD
 * session, not as a standalone celebration.
 */
export function EvidenceAcceptedMoment({ kind, title, onDismiss }: EvidenceAcceptedMomentProps) {
  const reduced = prefersReducedMotion();
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(onDismiss, 2000);
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
      aria-label={`Evidence accepted: ${title}. Dismiss.`}
    >
      <div
        className={[
          'flex items-center gap-3 rounded-md border border-accent bg-surface px-4 py-3 shadow-lg transition-all',
          reduced ? '' : 'duration-300 ease-out',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        ].join(' ')}
      >
        <span className="text-xxs uppercase tracking-wide text-text-faint">EVIDENCE ACCEPTED</span>
        <span className="font-mono text-sm text-text">
          {kind} · {title}
        </span>
      </div>
    </div>
  );
}
