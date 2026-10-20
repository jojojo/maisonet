import { elapsedAt, parseTimer, pauseTimer, resumeTimer, type KioskTimer } from '@/lib/kiosk-timer';
import { useCallback, useEffect, useState } from 'react';

export function useKioskTimer(userId: number) {
    const key = `maisonet:kiosk-timer:${userId}`;
    const [timer, setTimer] = useState<KioskTimer | null>(() => {
        try {
            return parseTimer(localStorage.getItem(key));
        } catch {
            return null;
        }
    });
    const [now, setNow] = useState(Date.now());
    const [storageError, setStorageError] = useState(false);

    useEffect(() => {
        try {
            if (timer) localStorage.setItem(key, JSON.stringify(timer));
            else localStorage.removeItem(key);
            setStorageError(false);
        } catch {
            setStorageError(true);
        }
    }, [key, timer]);

    useEffect(() => {
        if (timer?.startedAt === null || !timer) return;
        const tick = () => setNow(Date.now());
        const interval = window.setInterval(tick, 1000);
        document.addEventListener('visibilitychange', tick);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [timer]);

    useEffect(() => {
        const sync = (event: StorageEvent) => {
            if (event.key === key || event.key === null) {
                setTimer(event.key === null ? null : parseTimer(event.newValue));
                setNow(Date.now());
            }
        };
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, [key]);

    const start = (taskId: number, memberId: number | null, completionId: number | null) => {
        const date = Date.now();
        setNow(date);
        setTimer({ taskId, memberId, completionId, startedAt: date, elapsedMs: 0 });
    };
    const pause = () => {
        const date = Date.now();
        setNow(date);
        setTimer((value) => (value ? pauseTimer(value, date) : null));
    };
    const resume = () => {
        const date = Date.now();
        setNow(date);
        setTimer((value) => (value ? resumeTimer(value, date) : null));
    };
    const clear = useCallback(() => setTimer(null), []);

    return { timer, elapsedMs: timer ? elapsedAt(timer, now) : 0, storageError, start, pause, resume, clear };
}
