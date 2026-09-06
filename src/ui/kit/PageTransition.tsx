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

/**
 * Route content animates OPACITY ONLY — no translate, no scale.
 *
 * This was learned the hard way. The first version slid and scaled the
 * entering screen, which reads beautifully and cost 597ms against the
 * app's hard 300ms tap-to-XP budget: while a screen is moving, its
 * buttons are moving, so the first tap after arriving has to wait out
 * the animation before it can land. That is exactly what `final/06`
 * §4.3 forbids — nothing functional may depend on animation, and the
 * core loop's primary action is as functional as it gets.
 *
 * Direction still carries hierarchy, just not on the tab content: sheets
 * spring up from below, and pushed screens (Settings, Checkpoint) slide
 * as overlays, where nothing time-critical sits underneath. The edges
 * survive here because they still set the *pace*, and a cross-fade at
 * 200ms genuinely reads as lateral where 320ms reads as arrival.
 */
const EDGES: Record<TransitionEdge, { variants: Variants; transition: Transition }> = {
  lateral: {
    variants: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    transition: { duration: 0.18, ease: EASE_OUT },
  },
  forward: {
    variants: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    transition: { duration: 0.22, ease: EASE_OUT },
  },
  back: {
    variants: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    transition: { duration: 0.18, ease: EASE_OUT },
  },
  // The one arrival moment, and still the slowest — but a fade, so the
  // first tap never queues behind it.
  boot: {
    variants: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    transition: { duration: 0.32, ease: EASE_OUT },
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
