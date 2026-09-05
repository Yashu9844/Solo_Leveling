import { useEffect, useState } from 'react';

interface BossClearedMomentProps {
  bossId: string;
  bossTitle: string;
  onDismiss: () => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

type Phase = 'start' | 'rule' | 'label' | 'title';

/**
 * Full screen, 1100ms — final/05 §2.1: "the heaviest" of the six
 * Moments. Same visual language as LevelUpMoment (monospace, one
 * accent, near-black ground, no gradients/particles/glow/sound) at a
 * longer, weightier timing: rule sweeps L->R (400ms), boss number
 * cross-fades (400ms), title fades in (300ms). Dismissible on any tap;
 * prefers-reduced-motion shows the final state immediately.
 */
export function BossClearedMoment({ bossId, bossTitle, onDismiss }: BossClearedMomentProps) {
  const reduced = prefersReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? 'title' : 'start');

  useEffect(() => {
    if (reduced) return;
    if (navigator.vibrate) navigator.vibrate([16, 60, 16, 60, 32]);
    const t1 = setTimeout(() => setPhase('rule'), 0);
    const t2 = setTimeout(() => setPhase('label'), 400);
    const t3 = setTimeout(() => setPhase('title'), 400 + 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount, by design
  }, []);

  const ruleVisible = reduced || phase !== 'start';
  const labelVisible = reduced || phase === 'label' || phase === 'title';
  const titleVisible = reduced || phase === 'title';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg"
      onClick={onDismiss}
      role="button"
      tabIndex={0}
      aria-label={`Boss ${bossId} cleared. Dismiss.`}
    >
      <div className="text-xxs uppercase tracking-wide text-text-dim">BOSS CLEARED</div>

      <div
        className={[
          'font-mono text-2xl tabular-nums text-text transition-all',
          reduced ? '' : 'duration-[400ms] ease-out',
          labelVisible ? 'translate-y-0 opacity-100' : 'translate-y-[8px] opacity-0',
        ].join(' ')}
      >
        BOSS {bossId}
      </div>

      <div
        className={['h-px bg-accent transition-all', reduced ? '' : 'duration-[400ms] ease-out'].join(' ')}
        style={{ width: ruleVisible ? '16rem' : '0' }}
      />

      <div
        className={[
          'text-sm text-text-dim transition-opacity',
          reduced ? '' : 'duration-[300ms]',
          titleVisible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        {bossTitle}
      </div>

      <div className="mt-8 text-xxs uppercase tracking-wide text-text-faint">tap anywhere</div>
    </div>
  );
}
