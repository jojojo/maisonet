import { Button } from '@/components/bootstrap/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/bootstrap/dialog';
import { HouseBuddy } from '@/components/house-buddy';
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
        return this.state.failed ? (
            <p role="status">Le jeu fait une petite pause. Tu peux fermer cette fenêtre et réessayer.</p>
        ) : (
            this.props.children
        );
    }
}

export function KioskMiniGame({
    offer,
    close,
    mode = 'surprise',
}: {
    offer: Pick<KioskMiniGameOffer, 'game'>;
    close: () => void;
    mode?: 'surprise' | 'library';
}) {
    const library = mode === 'library';
    const returnLabel = library ? 'Retour à la bibliothèque' : 'Retour aux missions';
    const Game = games[offer.game];
    const [phase, setPhase] = useState<'invite' | 'playing' | 'finished'>(library ? 'playing' : 'invite');
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
            <DialogContent className="mn-max-h-92svh mn-w-calc-100-1-5rem mn-content-lg overflow-y-auto rounded-5 border-2 border-info p-4 p-sm-4">
                <DialogHeader>
                    <DialogTitle className="d-flex align-items-center justify-content-center gap-2 fs-4 fw-bold justify-content-sm-start">
                        <Gamepad2 />
                        {phase === 'invite' ? 'Une petite surprise !' : phase === 'finished' ? 'Bien joué !' : titles[offer.game]}
                    </DialogTitle>
                    <DialogDescription>
                        {library
                            ? 'Une petite pause en famille, sans gagner ni perdre de points.'
                            : 'Ta mission est enregistrée. Les parents valideront les points.'}
                    </DialogDescription>
                </DialogHeader>
                {phase === 'invite' ? (
                    <div className="d-grid justify-items-center gap-3 text-center">
                        <HouseBuddy className="mn-w-28" />
                        <p className="fs-5 fw-bold">Ton jeu surprise : {titles[offer.game]}</p>
                        <p className="text-body-secondary small">Une petite pause de jeu, juste pour le plaisir. Une partie, 90 secondes maximum.</p>
                        <Button className="mn-h-12 w-100 rounded-4" onClick={() => setPhase('playing')}>
                            <Sparkles />
                            Découvrir le jeu
                        </Button>
                        <Button variant="outline" className="mn-h-12 w-100 rounded-4" onClick={close}>
                            Pas maintenant
                        </Button>
                    </div>
                ) : phase === 'finished' ? (
                    <div className="d-grid justify-items-center gap-3 py-3 text-center">
                        <span className="display-5" aria-hidden>
                            🎉
                        </span>
                        <p className="fs-5 fw-bold">{library ? 'Une jolie pause en famille !' : 'Merci pour ton coup de main !'}</p>
                        <p className="text-body-secondary small">La pause est terminée. On retrouve la famille ?</p>
                        <Button className="mn-h-12 w-100 rounded-4" onClick={close}>
                            {returnLabel}
                        </Button>
                    </div>
                ) : (
                    <>
                        <p className="text-body-secondary text-center small">
                            {deadline === null ? 'Prêt ? Appuie sur Jouer !' : `Encore ${remaining} s de pause`}
                        </p>
                        <GameBoundary>
                            <Suspense
                                fallback={
                                    <p role="status" className="py-5 text-center">
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
                        <Button variant="outline" className="mn-h-12 w-100 rounded-4" onClick={close}>
                            {returnLabel}
                        </Button>
                    </>
                )}
                <p className="text-body-secondary text-center small">Le jeu n’ajoute ni ne retire de points.</p>
            </DialogContent>
        </Dialog>
    );
}
