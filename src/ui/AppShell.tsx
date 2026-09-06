import { useLayoutEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { PageTransition } from './kit';
import { useTransitionEdge } from './routing/useTransitionEdge';

const TABS = [
  { to: '/today', label: 'TODAY' },
  { to: '/progress', label: 'PROGRESS' },
  { to: '/skills', label: 'SKILLS' },
  { to: '/profile', label: 'PROFILE' },
] as const;

export function AppShell() {
  const { pathname } = useLocation();
  const edge = useTransitionEdge();
  const scroller = useRef<HTMLElement>(null);

  // Each tab keeps its own scroll position. Without this, switching from
  // a scrolled Profile to Today would land mid-page on a screen the user
  // has not scrolled — the container persists across route changes, so
  // its scrollTop has to be managed explicitly.
  const positions = useRef<Record<string, number>>({});
  const currentPath = useRef(pathname);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = positions.current[pathname] ?? 0;
    currentPath.current = pathname;
  }, [pathname]);

  function rememberScroll() {
    const el = scroller.current;
    if (el) positions.current[currentPath.current] = el.scrollTop;
  }

  /** Tapping the tab you are already on returns you to the top — the
   * convention every phone app shares, and the fastest way back to the
   * quest list from the bottom of Today. */
  function handleTabClick(to: string) {
    if (to !== pathname) return;
    positions.current[to] = 0;
    scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="flex h-full flex-col bg-bg text-text">
      <main ref={scroller} onScroll={rememberScroll} className="flex-1 overflow-y-auto">
        {/*
          Keyed on pathname so the entering screen re-mounts and plays its
          own animation. Deliberately NOT wrapped in AnimatePresence with
          mode="wait": that makes mounting the next screen wait on the
          previous screen's exit animation finishing, which would put a
          navigation behind an animation. final/06 §4.3 requires that
          nothing functional depend on animation, and a dropped frame or
          an interrupted transition should never be able to strand the
          user on a blank screen. Entering-only reads almost identically
          at 200-280ms and cannot fail that way.
        */}
        <PageTransition key={pathname} edge={edge}>
          <Outlet />
        </PageTransition>
      </main>

      <nav
        className="flex shrink-0 border-t border-border bg-surface"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            onClick={() => handleTabClick(tab.to)}
            className={({ isActive }) =>
              [
                'flex flex-1 items-center justify-center py-3 text-xs font-medium tracking-wide',
                'min-h-[44px]',
                isActive ? 'text-accent' : 'text-text-dim',
              ].join(' ')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
