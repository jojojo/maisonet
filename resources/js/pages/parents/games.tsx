import { Button } from '@/components/bootstrap/button';
import { Card, CardContent } from '@/components/bootstrap/card';
import { KioskMiniGame } from '@/components/kiosk-mini-game';
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
const tints = ['bg-warning-subtle', 'bg-danger-subtle', 'bg-info-subtle', 'bg-success-subtle'];

export default function ParentGames() {
    const [selected, setSelected] = useState<KioskGameId | null>(null);

    return (
        <AppLayout breadcrumbs={[{ title: 'Espace parents', href: '/parents/games' }]}>
            <Head title="Espace parents · Jeux" />
            <div className="mx-auto d-flex w-100 mn-content-5xl flex-column gap-4 p-3 p-sm-4">
                <div className="rounded-5 border-2 border-info bg-info-subtle p-4 p-sm-4">
                    <p className="small fw-bold text-info-emphasis">Espace parents</p>
                    <h1 className="mt-2 d-flex align-items-center gap-3 fs-3 fw-bold">
                        <Gamepad2 className="flex-shrink-0" />
                        La bibliothèque de jeux
                    </h1>
                    <p className="text-body-secondary mt-3 mn-content-2xl small">
                        Choisissez un jeu pour le découvrir ou partager une petite pause en famille. Une partie dure au maximum 90 secondes et ne
                        modifie pas les points.
                    </p>
                    <div className="mt-3 d-flex flex-wrap gap-2">
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
                <div className="d-grid gap-3 mn-sm-columns-2 mn-lg-columns-3">
                    {(Object.keys(kioskGameTitles) as KioskGameId[]).map((id, index) => (
                        <Card key={id} className="rounded-5">
                            <CardContent className="d-flex h-100 flex-column align-items-start gap-3 p-4">
                                <span
                                    aria-hidden
                                    className={`d-flex mn-icon-16 align-items-center justify-content-center rounded-4 fs-1 ${tints[index % tints.length]}`}
                                >
                                    {details[id].emoji}
                                </span>
                                <h2 className="fs-5 fw-bold">{kioskGameTitles[id]}</h2>
                                <p className="text-body-secondary flex-fill small">{details[id].description}</p>
                                <Button
                                    className="mt-1 mn-h-12 w-100 rounded-4"
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
                <p className="text-body-secondary small">
                    En mode kiosque, les jeux restent des surprises proposées après certaines missions. Cet accès libre est réservé aux parents.
                </p>
            </div>
            {selected && <KioskMiniGame key={selected} offer={{ game: selected }} close={() => setSelected(null)} mode="library" />}
        </AppLayout>
    );
}
