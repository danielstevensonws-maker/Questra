import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/index.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode><div style={{ padding: 32 }}><h1>Questra scaffold running. See Storybook for primitives.</h1></div></StrictMode>
);
