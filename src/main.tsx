import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Self-hosted so the app still renders correctly offline — it makes no
// network requests by design. Latin subsets only, and only the weights
// design/00-DESIGN-SYSTEM.md §4 actually names: eight files, not the
// ~90 a bare `@fontsource/inter` import would pull in.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/cormorant-garamond/latin-300.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';

import './index.css';
import { App } from './App';
import { ArcStatusProvider } from './store/ArcStatusContext';
import { SettingsProvider } from './store/SettingsContext';
import { MotionRoot } from './ui/MotionRoot';

if ('storage' in navigator && 'persist' in navigator.storage) {
  void navigator.storage.persist();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <MotionRoot>
        <BrowserRouter>
          <ArcStatusProvider>
            <App />
          </ArcStatusProvider>
        </BrowserRouter>
      </MotionRoot>
    </SettingsProvider>
  </StrictMode>
);
