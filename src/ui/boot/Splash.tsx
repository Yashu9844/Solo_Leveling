import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArtLayer, ScreenShell } from '../kit';

/**
 * How long the boot screen stays up at minimum.
 *
 * Not padding for its own sake. Reading the arc out of IndexedDB takes
 * a few milliseconds on a warm device, and a splash that appears and
 * vanishes inside 50ms is a flash, not a boot — it reads as a glitch.
 * Holding it briefly makes starting the system feel like starting
 * something. It is paid once per launch, never per interaction, and
 * this app is opened twice a day.
 */
export const SPLASH_MIN_MS = 900;

/** True once `ms` has passed since mount. */
export function useMinimumElapsed(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return elapsed;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The boot screen.
 *
 * Replaces the blank div App.tsx used to render while the arc status
 * resolved. A four-beat reveal — plate, wordmark, rule, creed — each
 * beat overlapping the last so it reads as one movement rather than a
 * list of things appearing.
 *
 * Under reduced motion `MotionConfig` strips the transforms and leaves
 * the opacity fades, so the sequence still resolves in order without
 * anything moving.
 */
export function Splash() {
  return (
    <ScreenShell>
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
        <ArtLayer slot="boot" scrim="moment" priority />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5, ease: EASE }}
          className="relative flex flex-col items-center"
        >
          {/* The +0.34em tracking needs the matching left padding or the
              word sits visually off-centre — the trailing letter-space
              is real width the eye does not see. */}
          <h1
            className="glow-text pl-[0.34em] font-display text-display tracking-wordmark text-ink-100"
            style={{ fontWeight: 300 }}
          >
            SYSTEM
          </h1>
        </motion.div>

        <motion.div
          aria-hidden
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 210, opacity: 1 }}
          transition={{ delay: 0.38, duration: 0.42, ease: EASE }}
          className="relative my-6 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, var(--accent), transparent)',
          }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.45 }}
          className="relative text-xxs uppercase text-ink-700"
        >
          Discipline creates freedom
        </motion.p>
      </div>
    </ScreenShell>
  );
}
