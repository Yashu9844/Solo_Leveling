import { useLayoutEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { House, ChartLineUp, TreeStructure, UserCircle, type Icon } from '@phosphor-icons/react';
import { PageTransition, SafeTop, ScreenShell } from './kit';
import { useTransitionEdge } from './routing/useTransitionEdge';

/**
 * The four peers.
 *
 * Labels and order are frozen by the test contract
 * (design/00-DESIGN-SYSTEM.md §10): smoke.spec.ts asserts a link and a
 * matching heading for each. Icons are chosen for what the screen holds
 * rather than for theme — TODAY is home, SKILLS is a tree because that
 * is literally what the data is.
 */
const TABS: { to: string; label: string; icon: Icon }[] = [
  { to: '/today', label: 'TODAY', icon: House },
  { to: '/progress', label: 'PROGRESS', icon: ChartLineUp },
  { to: '/skills', label: 'SKILLS', icon: TreeStructure },
  { to: '/profile', label: 'PROFILE', icon: UserCircle },
];

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
  /** Suppresses saving while we are the ones moving the scroller. */
  const restoring = useRef(false);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;

    const target = positions.current[pathname] ?? 0;
    currentPath.current = pathname;
    restoring.current = true;
    el.scrollTop = target;

    if (target === 0 || el.scrollTop === target) {
      restoring.current = false;
      return;
    }

    // Every screen here loads from IndexedDB, so on mount it is short and
    // a restore clamps to 0 — the position is only reachable once the
    // content has arrived. Re-apply as the screen grows, and give up
    // after a second rather than fighting a page that never gets tall
    // enough (which is the correct outcome when data has shrunk).
    const observed = el.firstElementChild ?? el;
    const settle = new ResizeObserver(() => {
      el.scrollTop = target;
      if (el.scrollTop === target) {
        restoring.current = false;
        settle.disconnect();
      }
    });
    settle.observe(observed);

    const giveUp = setTimeout(() => {
      restoring.current = false;
      settle.disconnect();
    }, 1000);

    return () => {
      clearTimeout(giveUp);
      settle.disconnect();
      restoring.current = false;
    };
  }, [pathname]);

  function rememberScroll() {
    if (restoring.current) return;
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
    <ScreenShell>
      {/* Outside <main> so it never scrolls away — a notch does not
          move when the content does. */}
      <SafeTop />

      {/*
        `relative z-10` on main and `z-0` on the nav is what keeps a
        full-screen overlay — a log sheet, the evening review, a Moment —
        above the bottom navigation.

        Those overlays are `position: fixed` and render inside whichever
        screen opened them, so they sit inside main's subtree. The route
        wrapper carries a CSS animation, which creates a stacking
        context, so a fixed child cannot escape main's paint order no
        matter how high its own z-index goes. Without an explicit order
        the nav, being a later sibling, paints on top and silently
        swallows taps on the overlay's buttons.
        (Portalling overlays to the body would fix this more thoroughly;
        that is a Phase 7 change, and this is the correct ordering
        regardless.)
      */}
      <main
        ref={scroller}
        onScroll={rememberScroll}
        className="no-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto"
      >
        {/*
          Keyed on pathname so the entering screen re-mounts and plays its
          own animation. Deliberately NOT wrapped in AnimatePresence with
          mode="wait": that makes mounting the next screen wait on the
          previous screen's exit animation finishing, which would put a
          navigation behind an animation. final/06 §4.3 requires that
          nothing functional depend on animation.
        */}
        <PageTransition key={pathname} edge={edge}>
          <Outlet />
        </PageTransition>
      </main>

      <nav
        aria-label="Primary"
        className="relative z-0 flex shrink-0"
        style={{
          borderTop: '1px solid var(--hair)',
          background: 'color-mix(in srgb, var(--panel-bot) 92%, transparent)',
          paddingTop: 10,
          paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
        }}
      >
        {TABS.map((tab) => {
          // Prefix match, not equality: /profile/settings is a child
          // route of the profile tab (design/02 §3.2), and the tab it
          // lives under has to stay lit while you are down there.
          const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
          const Glyph = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              onClick={() => handleTabClick(tab.to)}
              className="flex min-h-tap flex-1 flex-col items-center justify-center gap-1.5"
              style={{ color: active ? 'var(--accent-mid)' : 'var(--ink-900)' }}
            >
              <motion.span
                // Scales harder than a button (0.88 vs 0.97) because the
                // target is an icon, not a slab — a subtle press would be
                // invisible at this size.
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                className="flex flex-col items-center gap-1.5"
              >
                <Glyph
                  size={20}
                  weight={active ? 'fill' : 'regular'}
                  // Through a token, not a literal: the contrast and
                  // daylight themes turn every glow off, and a hardcoded
                  // drop-shadow here would have been the one that ignored
                  // them — a blue halo floating on a white nav bar.
                  style={active ? { filter: 'var(--glow-icon, none)' } : undefined}
                  aria-hidden
                />
                <span
                  className="text-micro uppercase"
                  style={{ fontWeight: active ? 600 : 500 }}
                >
                  {tab.label}
                </span>
              </motion.span>
            </NavLink>
          );
        })}
      </nav>
    </ScreenShell>
  );
}
