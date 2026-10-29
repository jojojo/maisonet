import { KioskMiniGame } from '@/components/kiosk-mini-game';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { kioskGameTitles, type KioskGameId } from '@/lib/kiosk-games';
import { Head, Link } from '@inertiajs/react';
import { Gamepad2, Play } from 'lucide-react';
import { useState } from 'react';

const details: Record<KioskGameId, { emoji: string; description: string }> = {
    'memory-match': { emoji: '🧩', description: 'Retrouve les paires cachées dans la maison.' },
    'whack-a-mole': { emoji: '🐹', description: 'Touche les taupes avant qu’elles se cachent !' },
    'tic-tac-toe': { emoji: '⭕', description: 'Aligne trois symboles pour gagner.' },
    '2048': { emoji: '🔢', description: 'Fais glisser et fusionne les nombres.' },
    pong: { emoji: '🏓', description: 'Renvoie la balle avec ta raquette.' },
    breakout: { emoji: '🧱', description: 'Vise les briques et garde la balle en jeu.' },
    'dino-runner': { emoji: '🦖', description: 'Saute par-dessus les obstacles.' },
    flappy: { emoji: '🐤', description: 'Tapote pour faire voler le petit oiseau.' },
    'fruit-ninja': { emoji: '🍉', description: 'Découpe les fruits d’un geste du doigt.' },
    stack: { emoji: '🏗️', description: 'Empile les étages au bon moment.' },
};
const tints = [
    'bg-amber-100 dark:bg-amber-950/40',
    'bg-rose-100 dark:bg-rose-950/40',
    'bg-sky-100 dark:bg-sky-950/40',
    'bg-emerald-100 dark:bg-emerald-950/40',
];

export default function ParentGames() {
    const [selected, setSelected] = useState<KioskGameId | null>(null);

    return (
        <AppLayout breadcrumbs={[{ title: 'Espace parents', href: '/parents/games' }]}>
            <Head title="Espace parents · Jeux" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
                <div className="rounded-3xl border-2 border-cyan-500 bg-cyan-50 p-5 sm:p-7 dark:bg-cyan-950/30">
                    <p className="text-sm font-bold text-cyan-700 dark:text-cyan-300">Espace parents</p>
                    <h1 className="mt-2 flex items-center gap-3 text-2xl font-extrabold">
                        <Gamepad2 className="shrink-0" />
                        La bibliothèque de jeux
                    </h1>
                    <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
                        Choisissez un jeu pour le découvrir ou partager une petite pause en famille. Une partie dure au maximum 90 secondes et ne
                        modifie pas les points.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/goals">Valider les missions</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/rewards">Récompenses</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/kiosk">Mode kiosque</Link>
                        </Button>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(Object.keys(kioskGameTitles) as KioskGameId[]).map((id, index) => (
                        <Card key={id} className="rounded-3xl">
                            <CardContent className="flex h-full flex-col items-start gap-3 p-5">
                                <span
                                    aria-hidden
                                    className={`flex size-16 items-center justify-center rounded-2xl text-4xl ${tints[index % tints.length]}`}
                                >
                                    {details[id].emoji}
                                </span>
                                <h2 className="text-lg font-extrabold">{kioskGameTitles[id]}</h2>
                                <p className="text-muted-foreground flex-1 text-sm">{details[id].description}</p>
                                <Button
                                    className="mt-1 h-12 w-full rounded-2xl"
                                    onClick={() => setSelected(id)}
                                    aria-label={`Jouer à ${kioskGameTitles[id]}`}
                                >
                                    <Play />
                                    Jouer
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <p className="text-muted-foreground text-sm">
                    En mode kiosque, les jeux restent des surprises proposées après certaines missions. Cet accès libre est réservé aux parents.
                </p>
            </div>
            {selected && <KioskMiniGame key={selected} offer={{ game: selected }} close={() => setSelected(null)} mode="library" />}
        </AppLayout>
    );
}
