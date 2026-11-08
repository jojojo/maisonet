/*! GameKit UI, MIT License. Copyright (c) 2026 gamekitui contributors.
 * Source: https://github.com/slarity/gamekit-ui/tree/90c2a8d454f2cb237277337d391b245d2c22714f
 * Adapted for Maiso’net: French labels, touch controls and six-pair memory board.
 * Full license: /licenses/gamekit-ui.txt
 */
'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

/* -------------------------------------------------------------------------- */
/*                               Shared helpers                                */
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
/*                               Game constants                                */
/* -------------------------------------------------------------------------- */

// Six familiar household symbols, each appearing twice.
const SYMBOLS = ['🧽', '🧦', '🪴', '🧸', '🧺', '⭐'] as const;
type Symbol = (typeof SYMBOLS)[number];

const GRID_SIZE = 12; // 4×3

interface Card {
    id: number;
    symbol: Symbol;
    state: 'face-down' | 'flipped' | 'matched';
}

/* -------------------------------------------------------------------------- */
/*                                Shuffle util                                 */
/* -------------------------------------------------------------------------- */

function buildDeck(): Card[] {
    // Duplicate each symbol to form pairs, then shuffle.
    const pairs: Symbol[] = [...SYMBOLS, ...SYMBOLS];
    // Fisher-Yates shuffle with Math.random
    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = pairs[i];
        const src = pairs[j];
        if (tmp !== undefined && src !== undefined) {
            pairs[i] = src;
            pairs[j] = tmp;
        }
    }
    return pairs.map((symbol, id) => ({ id, symbol, state: 'face-down' as const }));
}

// Deterministic face-down deck for the idle screen so the board reserves its
// full size before the game starts (and matches SSR markup — no random tiles).
function placeholderDeck(): Card[] {
    return Array.from({ length: GRID_SIZE }, (_, id) => ({
        id,
        symbol: SYMBOLS[id % SYMBOLS.length] as Symbol,
        state: 'face-down' as const,
    }));
}

/* -------------------------------------------------------------------------- */
/*                                  Props                                      */
/* -------------------------------------------------------------------------- */

export interface MemoryMatchProps {
    className?: string;
    autoFocus?: boolean;
    persistHighScore?: boolean | string;
    onScoreChange?: (score: number) => void;
    onGameOver?: (r: { score: number; won: boolean }) => void;
    onStart?: () => void;
    width?: number;
}

/* -------------------------------------------------------------------------- */
/*                                 Component                                   */
/* -------------------------------------------------------------------------- */

export function MemoryMatch({ className, autoFocus = true, persistHighScore = true, onScoreChange, onGameOver, onStart, width }: MemoryMatchProps) {
    const wrapperRef = React.useRef<HTMLDivElement | null>(null);
    const reduce = usePrefersReducedMotion();

    const storageKey = typeof persistHighScore === 'string' ? persistHighScore : persistHighScore === false ? null : 'gamekitui:memory-match:hi';

    // ── game state ──────────────────────────────────────────────────────────────
    const [status, setStatus] = React.useState<'idle' | 'playing' | 'won'>('idle');
    const [cards, setCards] = React.useState<Card[]>(placeholderDeck);
    const [moves, setMoves] = React.useState(0);
    const [best, setBest] = React.useState(0);
    const [announcement, setAnnouncement] = React.useState('');

    // flipped indices (at most 2 during a turn)
    const [flipped, setFlipped] = React.useState<[number, number] | [number] | []>([]);
    // locked while mismatch timeout is running
    const [locked, setLocked] = React.useState(false);

    // ── load persisted best ─────────────────────────────────────────────────────
    React.useEffect(() => {
        if (!storageKey) return;
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) {
                const parsed = Number(raw);
                if (parsed > 0) setBest(parsed);
            }
        } catch {
            /* ignore */
        }
    }, [storageKey]);

    // ── submit best (lower = better) ────────────────────────────────────────────
    const submitBest = React.useCallback(
        (m: number) => {
            setBest((prev) => {
                const isNewBest = prev === 0 || m < prev;
                if (!isNewBest) return prev;
                if (storageKey) {
                    try {
                        window.localStorage.setItem(storageKey, String(m));
                    } catch {
                        /* ignore */
                    }
                }
                return m;
            });
        },
        [storageKey],
    );

    // ── start / restart ─────────────────────────────────────────────────────────
    const start = React.useCallback(() => {
        setCards(buildDeck());
        setMoves(0);
        setFlipped([]);
        setLocked(false);
        setStatus('playing');
        setAnnouncement('Retrouve les paires en retournant les cartes.');
        onStart?.();
        onScoreChange?.(0);
        wrapperRef.current?.focus();
    }, [onStart, onScoreChange]);

    // auto-focus
    React.useEffect(() => {
        if (autoFocus) wrapperRef.current?.focus();
    }, [autoFocus]);

    // ── flip logic ──────────────────────────────────────────────────────────────
    const handleFlip = React.useCallback(
        (index: number) => {
            if (locked || status !== 'playing') return;

            setCards((prev) => {
                const card = prev[index];
                if (!card || card.state !== 'face-down') return prev;
                return prev.map((c, i) => (i === index ? { ...c, state: 'flipped' as const } : c));
            });

            setFlipped((prev) => {
                if (prev.length === 0) {
                    return [index];
                }
                if (prev.length === 1) {
                    const firstIdx = prev[0];
                    if (firstIdx === undefined || firstIdx === index) return prev;

                    // We need to check outside of this setter; use a ref trick below.
                    return [firstIdx, index] as [number, number];
                }
                return prev;
            });
        },
        [locked, status],
    );

    // ── check for match whenever flipped has 2 entries ──────────────────────────
    React.useEffect(() => {
        if (flipped.length !== 2) return;

        const [a, b] = flipped as [number, number];
        const cardA = cards[a];
        const cardB = cards[b];

        if (!cardA || !cardB) return;

        const newMoves = moves + 1;
        setMoves(newMoves);
        onScoreChange?.(newMoves);

        if (cardA.symbol === cardB.symbol) {
            // Match!
            const nextCards = cards.map((c, i) => (i === a || i === b ? { ...c, state: 'matched' as const } : c));
            setCards(nextCards);
            setFlipped([]);

            const allMatched = nextCards.every((c) => c.state === 'matched');
            if (allMatched) {
                setStatus('won');
                submitBest(newMoves);
                const isNewBest = best === 0 || newMoves < best;
                setAnnouncement(`Bravo, ${newMoves} essais !${isNewBest ? ' Nouveau record !' : ''}`);
                onGameOver?.({ score: newMoves, won: true });
            } else {
                setAnnouncement(`Une paire ! ${newMoves} essais.`);
            }
        } else {
            // No match — lock and flip back after delay.
            setLocked(true);
            setAnnouncement(`Essaie encore. ${newMoves} essais.`);
            const delay = reduce ? 0 : 700;
            const timer = setTimeout(() => {
                setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, state: 'face-down' as const } : c)));
                setFlipped([]);
                setLocked(false);
            }, delay);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flipped]);
    // NOTE: intentionally not including `cards`, `moves`, `best`, etc. in deps
    // to avoid double-firing; this effect is keyed entirely on the `flipped` pair.

    // ── keyboard: wrapper handles Enter/Space on idle/won ───────────────────────
    const handleWrapperKey = React.useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            if ((e.key === 'Enter' || e.key === ' ') && status !== 'playing') {
                e.preventDefault();
                start();
            }
        },
        [status, start],
    );

    // ── card bg / text classes ──────────────────────────────────────────────────
    function cardClasses(state: Card['state']): string {
        if (state === 'face-down') {
            return 'bg-primary text-dark';
        }
        if (state === 'flipped') {
            return 'bg-warning-subtle text-warning-emphasis';
        }
        // matched
        return 'bg-primary-subtle text-primary-emphasis opacity-75';
    }

    // ── flip animation class ────────────────────────────────────────────────────
    // We use a simple scale trick when not reduce. CSS-only via Tailwind.
    function transitionClass(state: Card['state']): string {
        if (reduce) return '';
        if (state === 'face-down') return 'transition-transform duration-200';
        return 'transition-transform duration-200 scale-95';
    }

    const isNewBestOnWin = status === 'won' && (best === 0 || moves <= best);

    return (
        <div
            ref={wrapperRef}
            tabIndex={0}
            role="application"
            aria-label="Jeu de mémoire"
            onKeyDown={handleWrapperKey}
            style={width ? { maxWidth: width } : undefined}
            className={cn('position-relative d-flex w-100 mn-content-sm flex-column gap-2 user-select-none', '', className)}
        >
            {/* ── score bar ─────────────────────────────────────────────────────── */}
            <div className="d-flex align-items-center justify-content-between gap-3 small">
                <span
                    className="bg-warning-subtle text-warning-emphasis d-inline-flex align-items-center rounded-2 border px-2 py-1 fw-medium numeric"
                    aria-live="polite"
                >
                    Essais {moves}
                </span>
                <span className="text-body-secondary numeric">Record {best === 0 ? '—' : best}</span>
            </div>

            {/* ── board ─────────────────────────────────────────────────────────── */}
            <div className="bg-body-tertiary position-relative overflow-hidden rounded-3 border p-2">
                <div className="d-grid mn-aspect-1-1 w-100 mn-columns-4 mn-rows-3 mn-gutter-3">
                    {cards.map((card, index) => (
                        <button
                            key={card.id}
                            type="button"
                            disabled={card.state !== 'face-down' || locked || status !== 'playing'}
                            aria-label={
                                card.state === 'face-down'
                                    ? `Carte ${index + 1}, face cachée`
                                    : card.state === 'matched'
                                      ? `Carte ${index + 1}, paire trouvée : ${card.symbol}`
                                      : `Carte ${index + 1}, ${card.symbol}`
                            }
                            onClick={() => handleFlip(index)}
                            className={cn(
                                'd-flex w-100 h-100 align-items-center justify-content-center rounded-2',
                                'mn-type-1-5rem fw-bold',
                                '',
                                '',
                                cardClasses(card.state),
                                transitionClass(card.state),
                            )}
                        >
                            {card.state !== 'face-down' ? card.symbol : null}
                        </button>
                    ))}
                </div>

                {/* ── overlay ─────────────────────────────────────────────────────── */}
                {status !== 'playing' && (
                    <div className="bg-body bg-opacity-75 position-absolute top-0 bottom-0 start-0 end-0 d-grid place-center rounded-3">
                        <div className="d-flex flex-column align-items-center gap-3 px-4 text-center">
                            {status === 'won' ? (
                                <>
                                    <p className="fs-5 fw-semibold">Bravo !</p>
                                    <p className="text-body-secondary small">
                                        {moves} essais
                                        {isNewBestOnWin ? ' — nouveau record !' : ''}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="fs-5 fw-semibold">Les paires de la maison</p>
                                    <p className="text-body-secondary small">Retrouve les 6 paires de la maison.</p>
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
                                {status === 'won' ? 'Rejouer' : 'Jouer'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── aria-live region for screen readers ──────────────────────────── */}
            <div aria-live="polite" aria-atomic="true" className="visually-hidden">
                {announcement}
            </div>
        </div>
    );
}

export default MemoryMatch;
