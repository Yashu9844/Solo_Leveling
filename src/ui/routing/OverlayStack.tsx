import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

interface Entry {
  id: string;
  close: () => void;
}

interface OverlayStackValue {
  push: (entry: Entry) => void;
  remove: (id: string) => void;
}

const OverlayStackContext = createContext<OverlayStackValue | null>(null);

/**
 * One owner for the back gesture's relationship to overlays.
 *
 * In an installed PWA the hardware or gesture back is the primary way
 * out of anything, and the default behaviour is wrong: with a sheet
 * open, back leaves the screen entirely and the sheet is still there
 * when you return. That is the most common installed-PWA navigation
 * bug, and design/02-NAVIGATION-FLOW.md §5 makes fixing it explicit.
 *
 * Every open overlay owns exactly one history entry. Back pops the top
 * overlay instead of the screen; closing an overlay by button or scrim
 * consumes its entry so the stack never drifts.
 *
 * Centralised rather than per-overlay on purpose: a sheet opened from
 * another sheet would otherwise push twice, and the two would race to
 * unwind.
 */
export function OverlayStackProvider({ children }: { children: ReactNode }) {
  const stack = useRef<Entry[]>([]);
  /** Back calls we made ourselves, whose popstate must not close anything. */
  const selfInitiated = useRef(0);

  useEffect(() => {
    function onPop() {
      if (selfInitiated.current > 0) {
        selfInitiated.current -= 1;
        return;
      }
      const top = stack.current.pop();
      top?.close();
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const push = useCallback((entry: Entry) => {
    stack.current.push(entry);
    // The current history state is copied rather than replaced: React
    // Router keeps its own bookkeeping in there, and discarding it would
    // desynchronise the router's index from the browser's.
    window.history.pushState({ ...window.history.state }, '');
  }, []);

  const remove = useCallback((id: string) => {
    const index = stack.current.findIndex((e) => e.id === id);
    // Already gone means back popped it — the entry is spent, so going
    // back again here would eat the screen underneath.
    if (index === -1) return;
    stack.current.splice(index, 1);
    selfInitiated.current += 1;
    window.history.back();
  }, []);

  const value = useMemo<OverlayStackValue>(() => ({ push, remove }), [push, remove]);

  return <OverlayStackContext.Provider value={value}>{children}</OverlayStackContext.Provider>;
}

/**
 * Makes the back gesture close this overlay.
 *
 * Safe to call outside the provider — it simply does nothing, so a
 * component can be rendered in isolation without a router.
 */
export function useBackDismiss(open: boolean, onClose: () => void): void {
  const ctx = useContext(OverlayStackContext);
  const id = useId();

  // Kept in a ref so a caller passing an inline arrow does not re-register
  // the overlay on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || !ctx) return;
    ctx.push({ id, close: () => onCloseRef.current() });
    return () => ctx.remove(id);
  }, [open, ctx, id]);
}
