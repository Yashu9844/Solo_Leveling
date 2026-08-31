import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useArcStatus } from './store/ArcStatusContext';
import { Onboarding } from './ui/onboarding/Onboarding';
import { AppShell } from './ui/AppShell';
import { Today } from './ui/screens/Today';
import { Progress } from './ui/screens/Progress';
import { Skills } from './ui/screens/Skills';
import { Profile } from './ui/screens/Profile';

function RequireArc({ arcExists }: { arcExists: boolean }) {
  if (!arcExists) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
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
