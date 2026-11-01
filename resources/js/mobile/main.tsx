import { createRoot } from 'react-dom/client';
import '../lib/browser-compat';
import { MobileApp } from './mobile-app';
import './mobile.css';

createRoot(document.getElementById('mobile-root')!).render(<MobileApp />);
