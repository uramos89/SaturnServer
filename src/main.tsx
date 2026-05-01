import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── Splash Screen Manager ──────────────────────────────────────────────
const splash = document.getElementById('splash');
const root = document.getElementById('root');

// Show splash for minimum 2.5s, then fade out
const startTime = Date.now();
const MIN_SPLASH_MS = 2500;

function hideSplash() {
  if (!splash) return;
  splash.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
  splash.style.opacity = '0';
  splash.style.transform = 'scale(1.1)';
  
  setTimeout(() => {
    if (splash) splash.style.display = 'none';
    if (root) root.style.display = 'block';
    document.body.style.overflow = 'auto';
  }, 600);
}

// Ensure minimum splash time
const elapsed = Date.now() - startTime;
const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);

setTimeout(() => {
  hideSplash();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}, remaining);
