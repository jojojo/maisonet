import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (appearance: Appearance) => {
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.classList.toggle('dark', isDark);
};

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const readAppearance = (): Appearance => {
    try {
        const value = localStorage.getItem('appearance');
        return value === 'dark' || value === 'light' ? value : 'system';
    } catch {
        return 'system';
    }
};

const handleSystemThemeChange = () => {
    const currentAppearance = readAppearance();
    applyTheme(currentAppearance || 'system');
};

export function initializeTheme() {
    const savedAppearance = readAppearance();

    applyTheme(savedAppearance);

    // Add the event listener for system theme changes...
    mediaQuery.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>('system');

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        try {
            localStorage.setItem('appearance', mode);
        } catch {
            /* Some private sessions disable storage. */
        }
        applyTheme(mode);
    };

    useEffect(() => {
        const savedAppearance = readAppearance();
        updateAppearance(savedAppearance || 'system');
    }, []);

    return { appearance, updateAppearance };
}
