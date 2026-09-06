import { motion, type Transition, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Which edge of the navigation graph was crossed
 * (design/02-NAVIGATION-FLOW.md §4).
 *
 * The grammar, and the whole point of having one:
 *   lateral moves NEVER travel horizontally
 *   hierarchical moves ALWAYS do
 *
 * Switching tabs is a sideways step between peers, so it fades in place;
 * pushing into Settings or a Checkpoint is a step deeper, so it slides.
 * Direction is what tells the user where they are without reading.
 */
export type TransitionEdge = 'lateral' | 'forward' | 'back' | 'boot';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const EDGES: Record<TransitionEdge, { variants: Variants; transition: Transition }> = {
  // Tab to tab. Fade with a small rise; no horizontal travel at all.
  lateral: {
    variants: {
      initial: { opacity: 0, y: 14, scale: 0.985 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -10, scale: 0.99 },
    },
    transition: { duration: 0.2, ease: EASE_OUT },
  },
  // Deeper: into Settings, a Checkpoint, the next onboarding step.
  forward: {
    variants: {
      initial: { opacity: 0, x: '18%' },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: '-12%' },
    },
    transition: { duration: 0.28, ease: EASE_OUT },
  },
  // Back out. Slightly quicker than forward — returning should feel
  // lighter than committing.
  back: {
    variants: {
      initial: { opacity: 0, x: '-18%' },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: '12%' },
    },
    transition: { duration: 0.24, ease: EASE_OUT },
  },
  // Splash handing over to the app. Longer and scale-led, because this
  // is the one moment the app is allowed to feel like it is arriving.
  boot: {
    variants: {
      initial: { opacity: 0, scale: 1.02 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.995 },
    },
    transition: { duration: 0.42, ease: EASE_OUT },
  },
};

interface PageTransitionProps {
  children: ReactNode;
  edge?: TransitionEdge;
  className?: string;
}

/**
 * Wraps one route's content. The parent supplies an `AnimatePresence`
 * keyed on the pathname (task 2.2); this only describes the motion.
 *
 * Reduced motion is handled globally by MotionRoot's `<MotionConfig>`,
 * which strips transforms and leaves the opacity fade — so a screen
 * still reads as changing without anything sliding.
 */
export function PageTransition({ children, edge = 'lateral', className = '' }: PageTransitionProps) {
  const { variants, transition } = EDGES[edge];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
      className={['flex min-h-0 flex-1 flex-col', className].join(' ')}
    >
      {children}
    </motion.div>
  );
}
