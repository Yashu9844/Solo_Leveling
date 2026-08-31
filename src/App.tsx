import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './ui/AppShell';
import { Today } from './ui/screens/Today';
import { Progress } from './ui/screens/Progress';
import { Skills } from './ui/screens/Skills';
import { Profile } from './ui/screens/Profile';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={<Today />} />
        <Route path="progress" element={<Progress />} />
        <Route path="skills" element={<Skills />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
