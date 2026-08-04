import React from 'react';
import { createRoot } from 'react-dom/client';
import { Buffer } from 'buffer';

const g = globalThis as unknown as { Buffer?: typeof Buffer };
if (!g.Buffer) g.Buffer = Buffer;

import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
