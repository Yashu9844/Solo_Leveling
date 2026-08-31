import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/today', label: 'TODAY' },
  { to: '/progress', label: 'PROGRESS' },
  { to: '/skills', label: 'SKILLS' },
  { to: '/profile', label: 'PROFILE' },
] as const;

export function AppShell() {
  return (
    <div className="flex h-full flex-col bg-bg text-text">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
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
