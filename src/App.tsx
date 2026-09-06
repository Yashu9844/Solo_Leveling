import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useArcStatus } from './store/ArcStatusContext';
import { Onboarding } from './ui/onboarding/Onboarding';
import { AppShell } from './ui/AppShell';
import { Today } from './ui/screens/Today';
import { Progress } from './ui/screens/Progress';
import { Skills } from './ui/screens/Skills';
import { Profile } from './ui/screens/Profile';
import { SHORTCUT_ROUTES, OPEN_PARAM, type OpenTarget } from './ui/routing/shortcuts';

function RequireArc({ arcExists }: { arcExists: boolean }) {
  if (!arcExists) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

/**
 * Resolves a PWA app-shortcut to Today with the right surface requested.
 *
 * `replace` matters here: the shortcut URL is a launcher entry point,
 * not somewhere the user navigated, so it must not sit in the history
 * stack waiting for a back gesture to return to it.
 */
function Shortcut({ target, arcExists }: { target: OpenTarget; arcExists: boolean }) {
  if (!arcExists) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Navigate to={`/today?${OPEN_PARAM}=${target}`} replace />;
}

export function App() {
  const { status, markArcCreated } = useArcStatus();

  if (status === 'loading') {
    return <div className="flex h-full items-center justify-center bg-bg text-text-dim" />;
  }

  const arcExists = status === 'yes';

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={
          arcExists ? <Navigate to="/today" replace /> : <Onboarding onComplete={markArcCreated} />
        }
      />

      {/* Declared in the manifest since Slice 1; unhandled until now. */}
      {SHORTCUT_ROUTES.map(({ path, target }) => (
        <Route key={path} path={path} element={<Shortcut target={target} arcExists={arcExists} />} />
      ))}

      <Route element={<RequireArc arcExists={arcExists} />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="today" element={<Today />} />
          <Route path="progress" element={<Progress />} />
          <Route path="skills" element={<Skills />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={arcExists ? '/today' : '/onboarding'} replace />} />
    </Routes>
  );
}
