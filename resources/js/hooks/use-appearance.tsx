import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (appearance: Appearance) => {
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
};

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function savedAppearance(): Appearance {
    try {
        const value = localStorage.getItem('appearance');
        return value === 'dark' || value === 'light' ? value : 'system';
    } catch {
        return 'system';
    }
}

const handleSystemThemeChange = () => {
    applyTheme(savedAppearance());
};

export function initializeTheme() {
    applyTheme(savedAppearance());

    // Add the event listener for system theme changes...
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', handleSystemThemeChange);
    else mediaQuery.addListener(handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>('system');

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        try {
            localStorage.setItem('appearance', mode);
        } catch {
            // Keep the selected appearance for this page when storage is unavailable.
        }
        applyTheme(mode);
    };

    useEffect(() => {
        setAppearance(savedAppearance());
    }, []);

    return { appearance, updateAppearance };
}
