import { useCallback, useEffect, useRef, useState } from 'react';

export function useKioskScreen() {
    const [awake, setAwake] = useState(false);
    const [message, setMessage] = useState('');
    const wanted = useRef(false);
    const sentinel = useRef<WakeLockSentinel | null>(null);
    const mounted = useRef(true);
    const pending = useRef(false);

    const acquire = useCallback(async () => {
        if (!wanted.current || pending.current || sentinel.current || document.visibilityState !== 'visible') return;
        if (!('wakeLock' in navigator)) {
            setMessage('Ce navigateur ne peut pas garder l’écran éveillé. Utilise les réglages de l’iPad.');
            return;
        }
        pending.current = true;
        try {
            const lock = await navigator.wakeLock.request('screen');
            if (!mounted.current || !wanted.current) {
                await lock.release();
                return;
            }
            sentinel.current = lock;
            setAwake(true);
            setMessage('');
            lock.addEventListener('release', () => {
                if (sentinel.current === lock) sentinel.current = null;
                if (mounted.current) setAwake(false);
            });
        } catch {
            if (mounted.current) {
                setAwake(false);
                setMessage('Écran éveillé indisponible : vérifie la batterie et les réglages de l’iPad.');
            }
        } finally {
            pending.current = false;
        }
    }, []);

    useEffect(() => {
        mounted.current = true;
        const resume = () => {
            if (document.visibilityState === 'visible') void acquire();
        };
        document.addEventListener('visibilitychange', resume);
        return () => {
            mounted.current = false;
            wanted.current = false;
            document.removeEventListener('visibilitychange', resume);
            void sentinel.current?.release();
            sentinel.current = null;
        };
    }, [acquire]);

    const toggleAwake = async () => {
        if (awake) {
            wanted.current = false;
            await sentinel.current?.release();
        } else {
            wanted.current = true;
            await acquire();
        }
    };
    const fullscreen = async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
            else setMessage('Sur iPad, ajoute Maiso’net à l’écran d’accueil depuis le menu Partager de Safari.');
        } catch {
            setMessage('Pour une vue sans barre de navigateur, ouvre Maiso’net depuis l’écran d’accueil.');
        }
    };

    return { awake, message, toggleAwake, fullscreen };
}
