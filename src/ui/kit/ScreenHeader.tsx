import { CaretLeft } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

interface ScreenHeaderProps {
  /**
   * The screen's name. Rendered as the page's `h1`.
   *
   * For the four tabs this string is frozen by the test contract
   * (design/00-DESIGN-SYSTEM.md §10): smoke.spec.ts asserts a heading
   * named TODAY / PROGRESS / SKILLS / PROFILE matching each nav link.
   */
  title: string;
  /** Optional trailing control — an icon button, a segmented switch. */
  right?: ReactNode;
  /** Renders a leading back button. Child routes (Settings and its
   * pickers) need a visible way up that is not the system gesture —
   * design/02 §5 keeps back working, but a route the user pushed by
   * tapping should also be leavable by tapping. */
  onBack?: () => void;
  /** Hide the title visually but keep it for assistive tech and tests.
   * For screens where art carries the name (Splash, Start, Moments). */
  visuallyHidden?: boolean;
  className?: string;
}

/**
 * Every screen's top bar: the name in accent, an optional control, and a
 * rule that fades to transparent at both ends.
 *
 * That fading rule is doing real work — a full-width 1px line would box
 * the content in and fight the full-bleed art behind it. Fading at the
 * ends lets the header sit *on* the screen rather than on a strip.
 */
export function ScreenHeader({
  title,
  right,
  onBack,
  visuallyHidden = false,
  className = '',
}: ScreenHeaderProps) {
  // A hidden title with nothing beside it means the screen has no header
  // chrome at all — rendering the padding and rule anyway would cost
  // vertical space for an invisible element. Today depends on this:
  // final/06 §5.2 requires all six core quests above the fold on a 6"
  // Android screen, and that is the constraint capping the core set at
  // six. Its identity line (DAY n · LEVEL n · RANK X) is the header.
  if (visuallyHidden && !right && !onBack) {
    return <h1 className="sr-only">{title}</h1>;
  }

  return (
    <div className={['relative shrink-0', className].join(' ')}>
      <div className="flex items-center gap-2 px-gutter pt-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-2 flex min-h-tap min-w-[44px] items-center justify-center text-ink-500"
          >
            <CaretLeft size={18} aria-hidden />
          </button>
        )}
        <h1 className={visuallyHidden ? 'sr-only' : 'min-w-0 flex-1 truncate text-h1 text-accent-mid'}>
          {title}
        </h1>
        {right}
      </div>
      <div className="hairline mx-gutter mt-3" aria-hidden />
    </div>
  );
}

interface SectionLabelProps {
  children: ReactNode;
  /** Extends a hairline from the label to the right edge. */
  rule?: boolean;
  className?: string;
}

/**
 * The uppercase, wide-tracked label that opens a block — TODAY'S QUESTS,
 * MIND, THIS WEEK. Tracking is the signature of this design; at 0.16em
 * these read as system labels rather than as headings.
 */
export function SectionLabel({ children, rule = false, className = '' }: SectionLabelProps) {
  return (
    <div className={['flex items-center gap-3', className].join(' ')}>
      <span className="shrink-0 text-xxs uppercase text-ink-700">{children}</span>
      {rule && <span className="hairline min-w-0 flex-1" aria-hidden />}
    </div>
  );
}
