import { elapsedAt, parseTimers, pauseTaskTimer, removeTaskTimer, resumeTaskTimer, startTaskTimer, type KioskTimer } from '@/lib/kiosk-timer';
import { useCallback, useEffect, useState } from 'react';

export function useKioskTimers(userId: number) {
    const key = `maisonet:kiosk-timer:${userId}`;
    const [timers, setTimers] = useState<KioskTimer[]>(() => {
        try {
            return parseTimers(localStorage.getItem(key));
        } catch {
            return [];
        }
    });
    const [now, setNow] = useState(Date.now());
    const [storageError, setStorageError] = useState(false);

    useEffect(() => {
        try {
            if (timers.length) localStorage.setItem(key, JSON.stringify(timers));
            else localStorage.removeItem(key);
            setStorageError(false);
        } catch {
            setStorageError(true);
        }
    }, [key, timers]);

    useEffect(() => {
        if (!timers.some((timer) => timer.startedAt !== null)) return;
        const tick = () => setNow(Date.now());
        const interval = window.setInterval(tick, 1000);
        document.addEventListener('visibilitychange', tick);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [timers]);

    useEffect(() => {
        const sync = (event: StorageEvent) => {
            if (event.key === key || event.key === null) {
                setTimers(event.key === null ? [] : parseTimers(event.newValue));
                setNow(Date.now());
            }
        };
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, [key]);

    const start = (taskId: number, memberId: number | null, completionId: number | null) => {
        const date = Date.now();
        setNow(date);
        setTimers((values) => startTaskTimer(values, { taskId, memberId, completionId, startedAt: date, elapsedMs: 0 }));
    };
    const pause = (taskId: number) => {
        const date = Date.now();
        setNow(date);
        setTimers((values) => pauseTaskTimer(values, taskId, date));
    };
    const resume = (taskId: number) => {
        const date = Date.now();
        setNow(date);
        setTimers((values) => resumeTaskTimer(values, taskId, date));
    };
    const clear = useCallback((taskId: number) => setTimers((values) => removeTaskTimer(values, taskId)), []);

    return { timers, elapsedMs: (timer: KioskTimer) => elapsedAt(timer, now), storageError, start, pause, resume, clear };
}
