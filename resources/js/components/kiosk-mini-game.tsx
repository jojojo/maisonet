import { HouseBuddy } from '@/components/house-buddy';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { kioskGameTitles as titles, type KioskGameId } from '@/lib/kiosk-games';
import { type KioskMiniGameOffer } from '@/types';
import { Gamepad2, Sparkles } from 'lucide-react';
import { Component, lazy, Suspense, useCallback, useEffect, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';

type GameProps = {
    className?: string;
    autoFocus?: boolean;
    captureGlobalKeys?: boolean;
    persistHighScore?: boolean;
    onStart?: () => void;
    onGameOver?: (result: { score: number; won: boolean }) => void;
};
const games: Record<KioskGameId, LazyExoticComponent<ComponentType<GameProps>>> = {
    'memory-match': lazy(() => import('@/components/games/memory-match')),
    'whack-a-mole': lazy(() => import('@/components/games/whack-a-mole')),
    'tic-tac-toe': lazy(() => import('@/components/games/tic-tac-toe')),
    '2048': lazy(() => import('@/components/games/2048')),
    pong: lazy(() => import('@/components/games/pong')),
    breakout: lazy(() => import('@/components/games/breakout')),
    'dino-runner': lazy(() => import('@/components/games/dino-runner')),
    flappy: lazy(() => import('@/components/games/flappy')),
    'fruit-ninja': lazy(() => import('@/components/games/fruit-ninja')),
    stack: lazy(() => import('@/components/games/stack')),
};

class GameBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    render() {
        return this.state.failed ? <p role="status">Le jeu fait une petite pause. Ta mission est bien enregistrée !</p> : this.props.children;
    }
}

export function KioskMiniGame({ offer, close }: { offer: KioskMiniGameOffer; close: () => void }) {
    const Game = games[offer.game];
    const [phase, setPhase] = useState<'invite' | 'playing' | 'finished'>('invite');
    const [deadline, setDeadline] = useState<number | null>(null);
    const [remaining, setRemaining] = useState(90);
    const finish = useCallback(() => setPhase('finished'), []);
    const started = useCallback(() => setDeadline(Date.now() + 90000), []);
    useEffect(() => {
        if (phase !== 'playing' || deadline === null) return;
        const tick = () => {
            const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setRemaining(seconds);
            if (seconds === 0) finish();
        };
        tick();
        const interval = window.setInterval(tick, 1000);
        document.addEventListener('visibilitychange', tick);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [phase, deadline, finish]);
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) close();
            }}
        >
            <DialogContent className="max-h-[92svh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-3xl border-2 border-cyan-500 p-5 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-center gap-2 text-xl font-extrabold sm:justify-start">
                        <Gamepad2 />
                        {phase === 'invite' ? 'Une petite surprise !' : phase === 'finished' ? 'Bien joué !' : titles[offer.game]}
                    </DialogTitle>
                    <DialogDescription>Ta mission est enregistrée. Les parents valideront les points.</DialogDescription>
                </DialogHeader>
                {phase === 'invite' ? (
                    <div className="grid justify-items-center gap-4 text-center">
                        <HouseBuddy className="w-28" />
                        <p className="text-lg font-bold">Ton jeu surprise : {titles[offer.game]}</p>
                        <p className="text-muted-foreground text-sm">
                            Une petite pause de jeu, juste pour le plaisir. Une partie, 90 secondes maximum.
                        </p>
                        <Button className="h-12 w-full rounded-2xl" onClick={() => setPhase('playing')}>
                            <Sparkles />
                            Découvrir le jeu
                        </Button>
                        <Button variant="outline" className="h-12 w-full rounded-2xl" onClick={close}>
                            Pas maintenant
                        </Button>
                    </div>
                ) : phase === 'finished' ? (
                    <div className="grid justify-items-center gap-4 py-3 text-center">
                        <span className="text-5xl" aria-hidden>
                            🎉
                        </span>
                        <p className="text-lg font-bold">Merci pour ton coup de main !</p>
                        <p className="text-muted-foreground text-sm">La pause est terminée. On retrouve la famille ?</p>
                        <Button className="h-12 w-full rounded-2xl" onClick={close}>
                            Retour aux missions
                        </Button>
                    </div>
                ) : (
                    <>
                        <p className="text-muted-foreground text-center text-xs">
                            {deadline === null ? 'Prêt ? Appuie sur Jouer !' : `Encore ${remaining} s de pause`}
                        </p>
                        <GameBoundary>
                            <Suspense
                                fallback={
                                    <p role="status" className="py-12 text-center">
                                        On prépare le jeu…
                                    </p>
                                }
                            >
                                <Game
                                    className="mx-auto"
                                    persistHighScore={false}
                                    autoFocus={false}
                                    captureGlobalKeys={false}
                                    onStart={started}
                                    onGameOver={finish}
                                />
                            </Suspense>
                        </GameBoundary>
                        <Button variant="outline" className="h-12 w-full rounded-2xl" onClick={close}>
                            Retour aux missions
                        </Button>
                    </>
                )}
                <p className="text-muted-foreground text-center text-xs">Le jeu n’ajoute ni ne retire de points.</p>
            </DialogContent>
        </Dialog>
    );
}
