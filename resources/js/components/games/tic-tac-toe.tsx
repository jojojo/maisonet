/*! GameKit UI, MIT License. Copyright (c) 2026 gamekitui contributors.
 * Source: https://github.com/slarity/gamekit-ui/tree/90c2a8d454f2cb237277337d391b245d2c22714f
 * Adapted for Maiso’net: French labels, touch controls and six-pair memory board.
 * Full license: /licenses/gamekit-ui.txt
 */
'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

/* -------------------------------------------------------------------------- */
/*                                   Engine                                    */
/* -------------------------------------------------------------------------- */

type Player = 'X' | 'O';
type Cell = Player | null;
type Board = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

const WIN_LINES: [number, number, number][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

function checkWinner(board: Board): { winner: Player; line: [number, number, number] } | null {
    for (const line of WIN_LINES) {
        const [a, b, c] = line;
        const va = board[a!];
        const vb = board[b!];
        const vc = board[c!];
        if (va && va === vb && va === vc) {
            return { winner: va, line };
        }
    }
    return null;
}

function isDraw(board: Board): boolean {
    return board.every((c) => c !== null) && checkWinner(board) === null;
}

/** Minimax — returns best score from the perspective of `player`. */
function minimax(board: Board, player: Player, depth: number): number {
    const result = checkWinner(board);
    if (result) return result.winner === 'O' ? 10 - depth : depth - 10;
    if (isDraw(board)) return 0;

    const next: Player = player === 'X' ? 'O' : 'X';
    let best = player === 'O' ? -Infinity : Infinity;

    for (let i = 0; i < 9; i++) {
        if (board[i] !== null) continue;
        const copy = board.slice() as Board;
        copy[i] = player;
        const score = minimax(copy, next, depth + 1);
        if (player === 'O') {
            if (score > best) best = score;
        } else {
            if (score < best) best = score;
        }
    }
    return best;
}

/**
 * Chance the CPU plays a random legal move instead of the optimal one.
 * Keeps the game beatable for a human ("medium" difficulty) while still
 * usually blocking and taking wins.
 */
const CPU_RANDOM_MOVE_CHANCE = 0.35;

function legalMoves(board: Board): number[] {
    const moves: number[] = [];
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) moves.push(i);
    }
    return moves;
}

function bestMove(board: Board): number {
    const legal = legalMoves(board);
    if (legal.length === 0) return -1;

    // Imperfection: sometimes the CPU just plays a random legal move so a human
    // can win. Uses Math.random — the AI does not need to be reproducible.
    if (Math.random() < CPU_RANDOM_MOVE_CHANCE) {
        return legal[Math.floor(Math.random() * legal.length)]!;
    }

    // Otherwise play optimally, but pick RANDOMLY among all equally-best moves so
    // the opening (and any tie) varies instead of always taking the first cell.
    let best = -Infinity;
    let bestMoves: number[] = [];
    for (const i of legal) {
        const copy = board.slice() as Board;
        copy[i] = 'O';
        const score = minimax(copy, 'X', 0);
        if (score > best) {
            best = score;
            bestMoves = [i];
        } else if (score === best) {
            bestMoves.push(i);
        }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)]!;
}

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
/*                                  Component                                  */
/* -------------------------------------------------------------------------- */

export interface TicTacToeProps {
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

function emptyBoard(): Board {
    return [null, null, null, null, null, null, null, null, null];
}

export function TicTacToe({ className, width, autoFocus = true, captureGlobalKeys = true, onGameOver, onStart }: TicTacToeProps) {
    const wrapperRef = React.useRef<HTMLDivElement | null>(null);
    const reduce = usePrefersReducedMotion();

    const [board, setBoard] = React.useState<Board>(emptyBoard);
    const [started, setStarted] = React.useState(false);
    const [turn, setTurn] = React.useState<Player>('X');
    const [winResult, setWinResult] = React.useState<{
        winner: Player;
        line: [number, number, number];
    } | null>(null);
    const [draw, setDraw] = React.useState(false);
    const [cursor, setCursor] = React.useState(0);

    // Session tally
    const [wins, setWins] = React.useState(0);
    const [losses, setLosses] = React.useState(0);
    const [draws, setDraws] = React.useState(0);

    const gameOver = winResult !== null || draw;

    const resetBoard = React.useCallback(() => {
        setBoard(emptyBoard());
        setTurn('X');
        setWinResult(null);
        setDraw(false);
        setCursor(0);
        setStarted(true);
    }, []);

    const handleStart = React.useCallback(() => {
        resetBoard();
        wrapperRef.current?.focus();
        onStart?.();
    }, [resetBoard, onStart]);

    // After human (X) places, run CPU (O).
    const cpuMoveRef = React.useRef<Board | null>(null);

    const placeAt = React.useCallback(
        (index: number, currentBoard: Board, currentTurn: Player): void => {
            if (currentBoard[index] !== null) return;
            if (gameOver) return;

            const next = currentBoard.slice() as Board;
            next[index] = currentTurn;

            const result = checkWinner(next);
            if (result) {
                setBoard(next);
                setWinResult(result);
                if (result.winner === 'X') {
                    setWins((w) => w + 1);
                    onGameOver?.({ score: 0, won: true });
                } else {
                    setLosses((l) => l + 1);
                    onGameOver?.({ score: 0, won: false });
                }
                return;
            }
            if (isDraw(next)) {
                setBoard(next);
                setDraw(true);
                setDraws((d) => d + 1);
                onGameOver?.({ score: 0, won: false });
                return;
            }

            setBoard(next);
            setTurn(currentTurn === 'X' ? 'O' : 'X');
            if (currentTurn === 'X') {
                cpuMoveRef.current = next;
            }
        },
        [gameOver, onGameOver],
    );

    // CPU plays O — triggered when turn flips to O.
    React.useEffect(() => {
        if (turn !== 'O' || gameOver || !started) return;
        const pending = cpuMoveRef.current;
        if (!pending) return;
        cpuMoveRef.current = null;

        const delay = reduce ? 0 : 300;
        const id = setTimeout(() => {
            const move = bestMove(pending);
            if (move === -1) return;
            placeAt(move, pending, 'O');
        }, delay);
        return () => clearTimeout(id);
    }, [turn, gameOver, started, reduce, placeAt]);

    // Keyboard navigation.
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // In global mode, ignore keys aimed at form fields / editable content.
            const t = e.target as HTMLElement | null;
            if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
            if (!started || gameOver) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleStart();
                }
                return;
            }
            if (turn !== 'X') return; // block input during CPU turn

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    setCursor((c) => (c % 3 === 0 ? c + 2 : c - 1));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setCursor((c) => (c % 3 === 2 ? c - 2 : c + 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setCursor((c) => (c < 3 ? c + 6 : c - 3));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setCursor((c) => (c >= 6 ? c - 6 : c + 3));
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    placeAt(cursor, board, turn);
                    break;
                default:
                    break;
            }
        };
        // Single-game pages can opt into window-level capture so keys work without
        // focusing the game; otherwise listen on the wrapper (focus-scoped).
        const target: Window | HTMLElement | null = captureGlobalKeys ? window : wrapperRef.current;
        target?.addEventListener('keydown', onKey as EventListener);
        return () => {
            target?.removeEventListener('keydown', onKey as EventListener);
        };
    }, [started, gameOver, turn, cursor, board, placeAt, handleStart, captureGlobalKeys]);

    React.useEffect(() => {
        if (autoFocus) wrapperRef.current?.focus();
    }, [autoFocus]);

    const winLine = winResult?.line ?? null;

    const statusText = React.useMemo(() => {
        if (!started) return 'Appuie sur Jouer';
        if (winResult) return winResult.winner === 'X' ? 'Bravo !' : 'La maison gagne !';
        if (draw) return 'Égalité !';
        if (turn === 'X') return 'À toi de jouer (X)';
        return 'La maison réfléchit…';
    }, [started, winResult, draw, turn]);

    return (
        <div
            ref={wrapperRef}
            tabIndex={0}
            role="application"
            aria-label="Jeu de morpion"
            style={width ? { maxWidth: width } : undefined}
            className={cn(
                'relative flex w-full max-w-sm flex-col gap-3 outline-none select-none',
                // Focus ring only matters when keys are focus-scoped; global capture hides it.
                !captureGlobalKeys && 'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
                className,
            )}
        >
            {/* Session tally */}
            <div className="flex items-center justify-between gap-2 text-sm">
                <span className="bg-primary text-primary-foreground inline-flex items-center rounded-md border px-2 py-0.5 font-medium tabular-nums">
                    Victoires {wins}
                </span>
                <span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-md border px-2 py-0.5 font-medium tabular-nums">
                    Défaites {losses}
                </span>
                <span className="bg-muted text-muted-foreground inline-flex items-center rounded-md border px-2 py-0.5 font-medium tabular-nums">
                    Égalités {draws}
                </span>
            </div>

            {/* Board */}
            <div className="bg-muted relative overflow-hidden rounded-lg border">
                <div className="@container grid aspect-square w-full grid-cols-3 grid-rows-3 gap-[2%]" role="grid" aria-label="Grille du morpion">
                    {board.map((cell, i) => {
                        const isWinCell = winLine !== null && winLine.includes(i);
                        const isCursor = cursor === i && started && !gameOver && turn === 'X';
                        const isLastRow = i >= 6;
                        const isLastCol = i % 3 === 2;

                        return (
                            <button
                                key={i}
                                type="button"
                                role="gridcell"
                                aria-label={`Case ${i + 1}${cell ? `, ${cell}` : ', vide'}`}
                                aria-pressed={cell !== null}
                                disabled={cell !== null || gameOver || turn !== 'X' || !started}
                                onClick={() => {
                                    if (!started) {
                                        handleStart();
                                        return;
                                    }
                                    setCursor(i);
                                    placeAt(i, board, turn);
                                }}
                                className={cn(
                                    'relative flex size-full items-center justify-center',
                                    'text-[clamp(1.5rem,22cqi,4rem)] leading-none font-bold',
                                    'border-border bg-background',
                                    !isLastRow && 'border-b',
                                    !isLastCol && 'border-r',
                                    // hover accent when empty and playable
                                    cell === null && !gameOver && turn === 'X' && started && 'hover:bg-accent cursor-pointer',
                                    // cursor highlight
                                    isCursor && 'bg-accent',
                                    // win cell highlight
                                    isWinCell && 'bg-primary/10',
                                    // transition unless reduced motion
                                    !reduce && 'transition-colors duration-150',
                                    // disabled cursor
                                    (cell !== null || gameOver || turn !== 'X' || !started) && 'cursor-default',
                                )}
                            >
                                {cell === 'X' && (
                                    <span className={cn('leading-none', isWinCell ? 'text-primary' : 'text-primary')} aria-hidden="true">
                                        X
                                    </span>
                                )}
                                {cell === 'O' && (
                                    <span
                                        className={cn('leading-none', isWinCell ? 'text-secondary-foreground' : 'text-secondary-foreground')}
                                        aria-hidden="true"
                                    >
                                        O
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Game-over / idle overlay */}
                {(!started || gameOver) && (
                    <div className="bg-background/80 absolute inset-0 grid place-items-center backdrop-blur-[1px]">
                        <div className="flex flex-col items-center gap-3 px-6 text-center">
                            {!started ? (
                                <>
                                    <p className="text-lg font-semibold">Morpion</p>
                                    <p className="text-muted-foreground text-sm">Tu joues les X. Aligne trois symboles !</p>
                                </>
                            ) : winResult ? (
                                <>
                                    <p className="text-lg font-semibold">{winResult.winner === 'X' ? 'Bravo !' : 'La maison gagne !'}</p>
                                    <p className="text-muted-foreground text-sm">{winResult.winner === 'X' ? 'Bien joué !' : 'Bien essayé !'}</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-lg font-semibold">Égalité !</p>
                                    <p className="text-muted-foreground text-sm">Vous avez bien défendu !</p>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={handleStart}
                                className={cn(
                                    'border-primary bg-primary text-primary-foreground inline-flex h-12 items-center justify-center rounded-xl border-2 px-6 text-base font-bold',
                                    'hover:bg-primary/90 focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none',
                                )}
                            >
                                {!started ? 'Jouer' : 'Rejouer'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Status / aria-live region */}
            <p className="text-muted-foreground text-center text-sm" aria-live="polite" aria-atomic="true">
                {statusText}
            </p>
        </div>
    );
}

export default TicTacToe;
