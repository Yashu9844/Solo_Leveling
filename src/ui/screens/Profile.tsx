import { useNavigate } from 'react-router-dom';
import { resetArc } from '../../store/onboarding';
import { useArcStatus } from '../../store/ArcStatusContext';

export function Profile() {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">PROFILE</h1>
      <p className="mt-2 text-sm text-text-dim">Phase 0 — not implemented</p>
      {import.meta.env.DEV && <DevResetArc />}
    </div>
  );
}

/**
 * DEV-only. Deletes all events and projections, clears the arc, and
 * returns to /onboarding — for re-running onboarding while stopwatching
 * it, without uninstalling the PWA each time. Never renders in production:
 * `import.meta.env.DEV` is false in a built app.
 */
function DevResetArc() {
  const navigate = useNavigate();
  const { markArcReset } = useArcStatus();

  async function handleReset() {
    await resetArc();
    markArcReset();
    navigate('/onboarding', { replace: true });
  }

  return (
    <div className="mt-8 rounded-md border border-state-alert p-3">
      <div className="text-xxs uppercase tracking-wide text-state-alert">Dev only</div>
      <button
        type="button"
        onClick={handleReset}
        className="mt-2 min-h-[44px] w-full rounded-md border border-state-alert text-sm text-state-alert"
      >
        Reset arc
      </button>
      <p className="mt-2 text-xs text-text-faint">
        Deletes all events and projections, clears the arc, returns to onboarding.
      </p>
    </div>
  );
}
