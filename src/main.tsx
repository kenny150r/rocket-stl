import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthGate } from './auth/AuthGate';
import { Builder } from './ui/Builder';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <Builder />
    </AuthGate>
  </StrictMode>,
);
