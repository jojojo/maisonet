import '../css/app.css';
import './lib/browser-compat';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof routeFn;
    interface Window {
        maisonetShowError?: (error: unknown, kind?: 'runtime' | 'module' | 'render' | 'promise') => void;
    }
}

Object.assign(window, { route: routeFn });

const appName = import.meta.env.VITE_APP_NAME || "Maiso'net";

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => {
        const pages = import.meta.glob('./pages/**/*.tsx');
        return pages[`./pages/${name}.tsx`]() as Promise<never>;
    },
    setup({ el, App, props }) {
        const root = createRoot(el, {
            onUncaughtError: (error) => {
                console.error(error);
                window.maisonetShowError?.(error, 'render');
            },
        });

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
}).catch((error) => {
    console.error(error);
    window.maisonetShowError?.(error, 'module');
});

// This will set light / dark mode on load...
initializeTheme();
