import { useEffect, useState } from 'react';

interface RankAdvancedMomentProps {
  fromRank: string;
  toRank: string;
  onDismiss: () => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

type Phase = 'start' | 'rule' | 'rank';

/**
 * Full screen, 1100ms — final/05 §2.1. "Level measures effort. Rank
 * measures evidence" (final/01 §4) is the whole reason this Moment
 * exists separately from LEVEL UP: a rank letter changing is real,
 * externally-verifiable evidence clearing a gate, not an XP threshold.
 * Same visual language as every other Moment: monospace, one accent,
 * near-black ground, no gradients/particles/glow/sound.
 */
export function RankAdvancedMoment({ fromRank, toRank, onDismiss }: RankAdvancedMomentProps) {
  const reduced = prefersReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? 'rank' : 'start');

  useEffect(() => {
    if (reduced) return;
    if (navigator.vibrate) navigator.vibrate([16, 60, 16, 60, 32]);
    const t1 = setTimeout(() => setPhase('rule'), 0);
    const t2 = setTimeout(() => setPhase('rank'), 450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount, by design
  }, []);

  const ruleVisible = reduced || phase !== 'start';
  const rankVisible = reduced || phase === 'rank';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg"
      onClick={onDismiss}
      role="button"
      tabIndex={0}
      aria-label={`Rank advanced to ${toRank}. Dismiss.`}
    >
      <div className="text-xxs uppercase tracking-wide text-text-dim">RANK ADVANCED</div>

      <div
        className={[
          'font-mono text-3xl tabular-nums text-text transition-all',
          reduced ? '' : 'duration-[450ms] ease-out',
          rankVisible ? 'translate-y-0 opacity-100' : 'translate-y-[8px] opacity-0',
        ].join(' ')}
      >
        {fromRank} → {toRank}
      </div>

      <div
        className={['h-px bg-accent transition-all', reduced ? '' : 'duration-[450ms] ease-out'].join(' ')}
        style={{ width: ruleVisible ? '16rem' : '0' }}
      />

      <div className="mt-8 text-xxs uppercase tracking-wide text-text-faint">tap anywhere</div>
    </div>
  );
}
