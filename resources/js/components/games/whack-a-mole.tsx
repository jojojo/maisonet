/*! GameKit UI, MIT License. Copyright (c) 2026 gamekitui contributors.
 * Source: https://github.com/slarity/gamekit-ui/tree/90c2a8d454f2cb237277337d391b245d2c22714f
 * Adapted for Maiso’net: French labels, touch controls and six-pair memory board.
 * Full license: /licenses/gamekit-ui.txt
 */
'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

/* -------------------------------------------------------------------------- */
/*                              Shared primitives                              */
/* -------------------------------------------------------------------------- */

function usePrefersReducedMotion(): boolean {
    const [reduce, setReduce] = React.useState(false);
    React.useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduce(mq.matches);
        const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return reduce;
}

/* -------------------------------------------------------------------------- */
/*                                  Game types                                 */
/* -------------------------------------------------------------------------- */

type GameStatus = 'idle' | 'playing' | 'gameover';

interface HoleState {
    active: boolean; // mole is up
    hit: boolean; // brief accent burst after whack
}

const HOLE_COUNT = 9;
const GAME_DURATION = 30; // seconds

/* -------------------------------------------------------------------------- */
/*                                   Props                                     */
/* -------------------------------------------------------------------------- */

export interface WhackAMoleProps {
    className?: string;
    width?: number;
    autoFocus?: boolean;
    /**
     * When true (the default), the game listens for keys on `window` so it works
     * without being focused first — ideal for single-game pages (404s, loading /
     * empty states). Set false when multiple games share a page, or the game sits
     * in scrollable content, so it only responds while focused. Ignores keys aimed
     * at form fields.
     */
    captureGlobalKeys?: boolean;
    persistHighScore?: boolean | string;
    onScoreChange?: (score: number) => void;
    onGameOver?: (r: { score: number; won: boolean }) => void;
    onStart?: () => void;
}

/* -------------------------------------------------------------------------- */
/*                                 Component                                   */
/* -------------------------------------------------------------------------- */

export function WhackAMole({
    className,
    width,
    autoFocus = true,
    captureGlobalKeys = true,
    persistHighScore = true,
    onScoreChange,
    onGameOver,
    onStart,
}: WhackAMoleProps) {
    const wrapperRef = React.useRef<HTMLDivElement | null>(null);
    const reduce = usePrefersReducedMotion();

    const storageKey = typeof persistHighScore === 'string' ? persistHighScore : persistHighScore === false ? null : 'gamekitui:whack-a-mole:hi';

    const [status, setStatus] = React.useState<GameStatus>('idle');
    const [score, setScore] = React.useState(0);
    const [high, setHigh] = React.useState(0);
    const [timeLeft, setTimeLeft] = React.useState(GAME_DURATION);
    const [holes, setHoles] = React.useState<HoleState[]>(() => Array.from({ length: HOLE_COUNT }, () => ({ active: false, hit: false })));
    const [offscreen, setOffscreen] = React.useState(false);

    // Mutable refs so interval callbacks don't go stale.
    const statusRef = React.useRef<GameStatus>('idle');
    const offscreenRef = React.useRef(false);
    const scoreRef = React.useRef(0);
    const timeLeftRef = React.useRef(GAME_DURATION);
    const holesRef = React.useRef<HoleState[]>(Array.from({ length: HOLE_COUNT }, () => ({ active: false, hit: false })));
    statusRef.current = status;
    offscreenRef.current = offscreen;

    // Timer refs.
    const tickRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const spawnRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const moleTimersRef = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
    const hitTimersRef = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    // Load high score.
    React.useEffect(() => {
        if (!storageKey) return;
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) setHigh(Number(raw) || 0);
        } catch {
            /* ignore */
        }
    }, [storageKey]);

    const submitHigh = React.useCallback(
        (s: number) => {
            setHigh((prev) => {
                if (s <= prev) return prev;
                if (storageKey) {
                    try {
                        window.localStorage.setItem(storageKey, String(s));
                    } catch {
                        /* ignore */
                    }
                }
                return s;
            });
        },
        [storageKey],
    );

    // Pause when scrolled offscreen or tab hidden.
    React.useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => {
            if (e) setOffscreen(!e.isIntersecting);
        });
        io.observe(el);
        const onVis = () => setOffscreen(document.hidden);
        document.addEventListener('visibilitychange', onVis);
        return () => {
            io.disconnect();
            document.removeEventListener('visibilitychange', onVis);
        };
    }, []);

    // Clear all active timers.
    const clearAllTimers = React.useCallback(() => {
        if (tickRef.current) clearInterval(tickRef.current);
        if (spawnRef.current) clearInterval(spawnRef.current);
        tickRef.current = null;
        spawnRef.current = null;
        for (const id of moleTimersRef.current.values()) clearTimeout(id);
        moleTimersRef.current.clear();
        for (const id of hitTimersRef.current.values()) clearTimeout(id);
        hitTimersRef.current.clear();
    }, []);

    // Pop a mole up at index i, then auto-retract after durationMs.
    const popMole = React.useCallback((i: number) => {
        // Don't pop if already active.
        if (holesRef.current[i]?.active) return;

        const next = holesRef.current.map((h, idx) => (idx === i ? { active: true, hit: false } : h));
        holesRef.current = next;
        setHoles([...next]);

        // Stay up for 700–1100ms.
        const stayMs = 700 + Math.random() * 400;
        const existingTimer = moleTimersRef.current.get(i);
        if (existingTimer !== undefined) clearTimeout(existingTimer);

        const timer = setTimeout(() => {
            moleTimersRef.current.delete(i);
            const retracted = holesRef.current.map((h, idx) => (idx === i ? { ...h, active: false } : h));
            holesRef.current = retracted;
            setHoles([...retracted]);
        }, stayMs);
        moleTimersRef.current.set(i, timer);
    }, []);

    const endGame = React.useCallback(() => {
        clearAllTimers();
        const finalScore = scoreRef.current;
        setStatus('gameover');
        statusRef.current = 'gameover';
        // Retract all moles.
        const cleared = holesRef.current.map(() => ({ active: false, hit: false }));
        holesRef.current = cleared;
        setHoles([...cleared]);
        submitHigh(finalScore);
        onGameOver?.({ score: finalScore, won: false });
    }, [clearAllTimers, submitHigh, onGameOver]);

    // Start spawning and tick intervals.
    const startIntervals = React.useCallback(() => {
        // Countdown tick every second.
        tickRef.current = setInterval(() => {
            if (offscreenRef.current) return;
            timeLeftRef.current -= 1;
            setTimeLeft(timeLeftRef.current);
            if (timeLeftRef.current <= 0) {
                endGame();
            }
        }, 1000);

        // Spawn moles every 600–900ms.
        const spawnTick = () => {
            if (offscreenRef.current || statusRef.current !== 'playing') return;
            // Pick 1–2 random holes to pop.
            const count = Math.random() < 0.3 ? 2 : 1;
            const indices = Array.from({ length: HOLE_COUNT }, (_, idx) => idx);
            for (let c = 0; c < count; c++) {
                const remaining = indices.filter((idx) => !holesRef.current[idx]?.active);
                if (remaining.length === 0) break;
                const pick = Math.floor(Math.random() * remaining.length);
                const chosen = remaining[pick];
                if (chosen !== undefined) popMole(chosen);
            }
        };

        const baseInterval = 750;
        spawnRef.current = setInterval(spawnTick, baseInterval);
    }, [endGame, popMole]);

    const start = React.useCallback(() => {
        clearAllTimers();
        scoreRef.current = 0;
        timeLeftRef.current = GAME_DURATION;
        const fresh = Array.from({ length: HOLE_COUNT }, () => ({ active: false, hit: false }));
        holesRef.current = fresh;
        setScore(0);
        setTimeLeft(GAME_DURATION);
        setHoles([...fresh]);
        setStatus('playing');
        statusRef.current = 'playing';
        onStart?.();
        onScoreChange?.(0);
        startIntervals();
    }, [clearAllTimers, startIntervals, onStart, onScoreChange]);

    // Cleanup on unmount.
    React.useEffect(() => {
        return () => clearAllTimers();
    }, [clearAllTimers]);

    const handleHoleClick = React.useCallback(
        (i: number) => {
            if (statusRef.current !== 'playing') return;
            const hole = holesRef.current[i];
            if (!hole?.active || hole.hit) return;

            // Cancel auto-retract.
            const moleTimer = moleTimersRef.current.get(i);
            if (moleTimer !== undefined) {
                clearTimeout(moleTimer);
                moleTimersRef.current.delete(i);
            }

            // Apply hit burst.
            const withHit = holesRef.current.map((h, idx) => (idx === i ? { active: true, hit: true } : h));
            holesRef.current = withHit;
            setHoles([...withHit]);

            // Update score.
            scoreRef.current += 1;
            const newScore = scoreRef.current;
            setScore(newScore);
            onScoreChange?.(newScore);

            // Retract after hit flash.
            const flashMs = reduce ? 0 : 150;
            const existingHit = hitTimersRef.current.get(i);
            if (existingHit !== undefined) clearTimeout(existingHit);
            const hitTimer = setTimeout(() => {
                hitTimersRef.current.delete(i);
                const retracted = holesRef.current.map((h, idx) => (idx === i ? { active: false, hit: false } : h));
                holesRef.current = retracted;
                setHoles([...retracted]);
            }, flashMs);
            hitTimersRef.current.set(i, hitTimer);
        },
        [onScoreChange, reduce],
    );

    React.useEffect(() => {
        if (autoFocus) wrapperRef.current?.focus();
    }, [autoFocus]);

    // Keyboard: Enter/Space to start/restart.
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // In global mode, ignore keys aimed at form fields / editable content.
            const t = e.target as HTMLElement | null;
            if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
            if (e.key === ' ' || e.key === 'Enter') {
                if (statusRef.current !== 'playing') {
                    e.preventDefault();
                    start();
                }
            }
        };
        // Single-game pages can opt into window-level capture so keys work without
        // focusing the game; otherwise listen on the wrapper (focus-scoped).
        const target: Window | HTMLElement | null = captureGlobalKeys ? window : wrapperRef.current;
        target?.addEventListener('keydown', onKey as EventListener);
        return () => {
            target?.removeEventListener('keydown', onKey as EventListener);
        };
    }, [start, captureGlobalKeys]);

    const isNewBest = score >= high && score > 0 && status === 'gameover';

    return (
        <div
            ref={wrapperRef}
            tabIndex={0}
            role="application"
            aria-label="Jeu de tape-taupe"
            style={width ? { maxWidth: width } : undefined}
            className={cn(
                'position-relative d-flex w-100 mn-content-sm flex-column gap-2 user-select-none',
                // Focus ring only matters when keys are focus-scoped; global capture hides it.
                !captureGlobalKeys && '',
                className,
            )}
        >
            {/* Score / timer bar */}
            <div className="d-flex align-items-center justify-content-between gap-3 small">
                <span
                    className="bg-warning-subtle text-warning-emphasis d-inline-flex align-items-center rounded-2 border px-2 py-1 fw-medium numeric"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    Score {score}
                </span>
                <span
                    className="bg-warning-subtle text-warning-emphasis d-inline-flex align-items-center rounded-2 border px-2 py-1 fw-medium numeric"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {timeLeft}s
                </span>
                <span className="text-body-secondary numeric">Record {high}</span>
            </div>

            {/* Hidden live region for accessibility announcements */}
            <div aria-live="polite" aria-atomic="true" className="visually-hidden">
                {status === 'gameover'
                    ? `Partie terminée. Tu as touché ${score} taupes.${isNewBest ? ' Nouveau record !' : ''}`
                    : status === 'playing'
                      ? `${score} taupes, encore ${timeLeft} secondes`
                      : 'Tape-taupe. Appuie sur Jouer.'}
            </div>

            {/* Game grid */}
            <div className="bg-body position-relative overflow-hidden rounded-3 border p-3">
                <div className="d-grid mn-aspect-1-1 w-100 mn-columns-3 mn-rows-3 mn-gutter-4">
                    {holes.map((hole, i) => (
                        <HoleButton key={i} index={i} hole={hole} reduce={reduce} onClick={handleHoleClick} disabled={status !== 'playing'} />
                    ))}
                </div>

                {/* Overlay for idle / game over */}
                {status !== 'playing' && (
                    <div className="bg-body bg-opacity-75 position-absolute top-0 bottom-0 start-0 end-0 d-grid place-center">
                        <div className="d-flex flex-column align-items-center gap-3 px-4 text-center">
                            {status === 'gameover' ? (
                                <>
                                    <p className="fs-5 fw-semibold">Partie terminée</p>
                                    <p className="text-body-secondary small">
                                        Tu as touché {score} taupes
                                        {isNewBest ? ' — nouveau record !' : ''}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="fs-5 fw-semibold">Tape-taupe</p>
                                    <p className="text-body-secondary small">Touche les taupes avant leur disparition !</p>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={start}
                                className={cn(
                                    'border-primary bg-primary text-dark d-inline-flex mn-h-12 align-items-center justify-content-center rounded-3 border-2 px-4 fs-6 fw-bold',
                                    '',
                                )}
                            >
                                {status === 'gameover' ? 'Rejouer' : 'Jouer'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*                              HoleButton sub-component                       */
/* -------------------------------------------------------------------------- */

interface HoleButtonProps {
    index: number;
    hole: HoleState;
    reduce: boolean;
    onClick: (i: number) => void;
    disabled: boolean;
}

function HoleButton({ index, hole, reduce, onClick, disabled }: HoleButtonProps) {
    const handleClick = React.useCallback(() => {
        onClick(index);
    }, [index, onClick]);

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            aria-label={hole.active ? `Trou ${index + 1}, touche la taupe` : `Trou ${index + 1}, vide`}
            className={cn(
                // Hole container: aspect-square fills its grid cell, full width
                'border bg-body-tertiary position-relative w-100 h-100 overflow-hidden rounded-pill border-2',
                '',
                !disabled && 'cursor-pointer',
                disabled && 'cursor-default',
            )}
        >
            {/* Mole — sized relative to the hole; slides up from the bottom when active */}
            <span
                aria-hidden="true"
                className={cn(
                    'position-absolute start-0 end-0 bottom-0 d-flex justify-content-center',
                    hole.active || hole.hit ? 'mn-translate-14' : 'mn-translate-full',
                    !reduce && '',
                )}
            >
                {/* Mole head — 62% of the hole width, square */}
                <span
                    className={cn(
                        'position-relative d-block mn-aspect-1-1 mn-w-62 rounded-arch rounded-hill',
                        hole.hit ? 'bg-primary-subtle border border-primary' : 'bg-primary',
                    )}
                >
                    {/* Eyes */}
                    <span className="position-absolute mn-top-28 start-50 d-flex translate-middle-x mn-gutter-22">
                        <span className={cn('d-block mn-icon-3px rounded-pill mn-sm-icon-4px', hole.hit ? 'bg-dark' : 'bg-dark')} />
                        <span className={cn('d-block mn-icon-3px rounded-pill mn-sm-icon-4px', hole.hit ? 'bg-dark' : 'bg-dark')} />
                    </span>
                    {/* Snout */}
                    <span
                        className={cn(
                            'position-absolute mn-bottom-18 start-50 d-block mn-h-22 mn-w-46 translate-middle-x rounded-pill',
                            hole.hit ? 'bg-dark' : 'bg-dark',
                        )}
                    />
                </span>
            </span>
        </button>
    );
}

export default WhackAMole;
