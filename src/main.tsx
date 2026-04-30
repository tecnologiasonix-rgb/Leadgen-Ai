import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('[Diagnostic] Frontend loaded');
// @ts-ignore
console.log('[Diagnostic] GEMINI_API_KEY in browser:', !!process.env?.GEMINI_API_KEY);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
