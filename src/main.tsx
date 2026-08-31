import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { ArcStatusProvider } from './store/ArcStatusContext';

if ('storage' in navigator && 'persist' in navigator.storage) {
  void navigator.storage.persist();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ArcStatusProvider>
        <App />
      </ArcStatusProvider>
    </BrowserRouter>
  </StrictMode>
);
