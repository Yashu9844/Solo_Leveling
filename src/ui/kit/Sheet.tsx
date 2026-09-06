import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Past this much drag, or this fast a flick, the sheet goes. Tuned so a
 * scroll that starts with a small downward wobble does not dismiss. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 520;

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Rendered as the sheet's heading and used as its accessible name. */
  title: string;
  children: ReactNode;
  /** Pinned below the scroll area — the sheet's primary action. */
  footer?: ReactNode;
  testId?: string;
}

/**
 * The bottom sheet every log surface is built on.
 *
 * Three dismissals, because a phone user will reach for whichever is
 * closest to their thumb: the Close button, the scrim, and a downward
 * drag. `aria-label="Close"` on that button is frozen by the test
 * contract (design/00-DESIGN-SYSTEM.md §10) and is rendered here so all
 * eight sheets inherit it rather than each spelling it out.
 *
 * Back-button dismissal is deliberately NOT handled here — see
 * design/02-NAVIGATION-FLOW.md §5. One app-level owner handles the
 * overlay history stack (task 2.3); a sheet pushing its own entry would
 * double-push whenever a sheet opens from another sheet.
 */
export function Sheet({ open, onClose, title, children, footer, testId }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Scroll lock. The scrim covers the page, but without this the page
  // behind still scrolls under a dragging thumb on iOS.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Focus moves into the sheet on open and returns to wherever it was on
  // close, so a keyboard user is never dropped at the top of the page.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panelRef.current)?.focus();
    return () => previouslyFocused?.focus?.();
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // Trap: Tab past the last focusable wraps to the first, and back
      // past the first wraps to the last.
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onKeyDown={onKeyDown}>
          <motion.div
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{ background: 'var(--scrim)' }}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-testid={testId}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            className="relative flex max-h-[86dvh] w-full max-w-shell flex-col outline-none"
            style={{
              background: 'linear-gradient(180deg, var(--panel-top) 0%, var(--surface) 100%)',
              borderTop: '1px solid var(--hair-strong)',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Grab handle. Decorative, but it is the affordance that
                tells a thumb the sheet can be dragged away. */}
            <div className="flex shrink-0 justify-center pt-3" aria-hidden>
              <span
                className="h-1 w-10 rounded-pill"
                style={{ background: 'var(--hair-strong)' }}
              />
            </div>

            <div className="flex shrink-0 items-start justify-between gap-3 px-gutter pt-3">
              <h2 id={titleId} className="text-lg text-ink-100">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 -mt-2 flex min-h-tap min-w-[44px] items-center justify-center text-ink-700"
              >
                <span aria-hidden className="text-lg">
                  ✕
                </span>
              </button>
            </div>
            <div className="hairline mx-gutter mt-2 shrink-0" aria-hidden />

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-gutter py-4">
              {children}
            </div>

            {footer && (
              <div
                className="shrink-0 px-gutter pt-2"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
              >
                {footer}
              </div>
            )}
            {!footer && (
              <div
                aria-hidden
                className="shrink-0"
                style={{ height: 'max(env(safe-area-inset-bottom), 8px)' }}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
