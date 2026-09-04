import { useEffect, useState } from 'react';

interface LevelUpMomentProps {
  fromLevel: number;
  toLevel: number;
  unlockText?: string;
  onDismiss: () => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

type Phase = 'start' | 'rule' | 'number' | 'unlock';

/**
 * Full screen, 700ms total: rule sweeps L->R (260ms), number cross-fades
 * with a 6px rise (240ms), unlock line fades in (200ms). final/05 §2.2,
 * §2.3. Monospace numerals, one accent, near-black ground — no gradient,
 * no particles, no glow, no sound. Dismissible on any tap, never blocks
 * input. prefers-reduced-motion disables motion and haptics but keeps
 * the content, shown immediately at its final state.
 */
export function LevelUpMoment({ fromLevel, toLevel, unlockText, onDismiss }: LevelUpMomentProps) {
  const reduced = prefersReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? 'unlock' : 'start');

  useEffect(() => {
    if (reduced) {
      return;
    }
    if (navigator.vibrate) {
      navigator.vibrate([12, 40, 24]);
    }
    const t1 = setTimeout(() => setPhase('rule'), 0);
    const t2 = setTimeout(() => setPhase('number'), 260);
    const t3 = setTimeout(() => setPhase('unlock'), 260 + 240);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount, by design
  }, []);

  const ruleVisible = reduced || phase === 'rule' || phase === 'number' || phase === 'unlock';
  const numberVisible = reduced || phase === 'number' || phase === 'unlock';
  const unlockVisible = reduced || phase === 'unlock';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg"
      onClick={onDismiss}
      role="button"
      tabIndex={0}
      aria-label="Level up. Dismiss."
    >
      <div className="text-xxs uppercase tracking-wide text-text-dim">LEVEL</div>

      <div
        className={[
          'font-mono text-xl tabular-nums text-text transition-all',
          reduced ? '' : 'duration-[240ms] ease-out',
          numberVisible ? 'translate-y-0 opacity-100' : 'translate-y-[6px] opacity-0',
        ].join(' ')}
      >
        {String(fromLevel).padStart(2, '0')} → {String(toLevel).padStart(2, '0')}
      </div>

      <div
        className={['h-px bg-accent transition-all', reduced ? '' : 'duration-[260ms] ease-out'].join(' ')}
        style={{ width: ruleVisible ? '12rem' : '0' }}
      />

      {unlockText && (
        <div
          className={[
            'text-xs text-text-dim transition-opacity',
            reduced ? '' : 'duration-[200ms]',
            unlockVisible ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          UNLOCKED · {unlockText}
        </div>
      )}

      <div className="mt-8 text-xxs uppercase tracking-wide text-text-faint">tap anywhere</div>
    </div>
  );
}
