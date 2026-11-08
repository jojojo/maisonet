import { Button } from '@/components/bootstrap/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/bootstrap/dialog';
import { formatElapsed } from '@/lib/kiosk-timer';
import { type Member, type Task } from '@/types';
import { ArrowLeft, Check, Pause, Play, Square, Sun, Timer } from 'lucide-react';
import { useState } from 'react';

interface Props {
    task: Task;
    member?: Member;
    elapsedMs: number;
    paused: boolean;
    awake: boolean;
    storageError: boolean;
    screenMessage: string;
    onPause: () => void;
    onResume: () => void;
    onFinish: () => void;
    onCancel: () => void;
    onBack: () => void;
    onAwake: () => void;
}

export function KioskMissionTimer(props: Props) {
    const [cancel, setCancel] = useState(false);
    return (
        <section className="d-grid gap-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <Button variant="ghost" onClick={props.onBack}>
                    <ArrowLeft />
                    Voir le tableau
                </Button>
                <p role="status" className="bg-warning-subtle d-flex align-items-center gap-2 rounded-pill px-3 py-2 small fw-bold">
                    <Timer />
                    {props.paused ? 'Petite pause' : 'Mission en cours'}
                </p>
            </div>
            <div className="family-card bg-body mx-auto d-grid w-100 mn-content-5xl justify-items-center gap-3 mn-round-2rem border-2 border-info px-3 py-4 text-center px-sm-5 py-sm-4">
                <span className="bg-primary-subtle d-flex mn-icon-20 align-items-center justify-content-center rounded-5 display-5" aria-hidden>
                    {props.task.room?.icon ?? '🧽'}
                </span>
                <div>
                    <p className="text-body-secondary mb-2 small fw-semibold">
                        {props.task.room?.name}
                        {props.member ? ` · À toi de jouer, ${props.member.name} !` : ''}
                    </p>
                    <h2 className="fs-2 fw-bold mn-sm-heading-4xl">{props.task.title}</h2>
                </div>
                <div
                    role="timer"
                    aria-live="off"
                    aria-label={`Temps écoulé : ${formatElapsed(props.elapsedMs)}`}
                    className="text-dark w-100 mn-type-clamp-3-25rem-13vw-9rem lh-sm fw-bold numeric"
                >
                    {formatElapsed(props.elapsedMs)}
                </div>
                <p className="text-body-secondary small">
                    {props.paused ? 'Le chrono attend. Reprends quand tu es prêt.' : 'Prends ton temps, chaque coup de main compte.'}
                </p>
                <div className="mt-3 d-grid w-100 mn-content-2xl gap-3 mn-sm-columns-2">
                    <Button variant="outline" className="mn-h-16 rounded-4 fs-5" onClick={props.paused ? props.onResume : props.onPause}>
                        {props.paused ? (
                            <>
                                <Play />
                                Reprendre
                            </>
                        ) : (
                            <>
                                <Pause />
                                Pause
                            </>
                        )}
                    </Button>
                    <Button className="mn-h-16 rounded-4 fs-5" onClick={props.onFinish}>
                        <Check />
                        C’est terminé !
                    </Button>
                </div>
                <p className="text-body-secondary small">La réalisation sera envoyée aux parents pour validation.</p>
                {props.storageError && (
                    <p role="status" className="small text-warning-emphasis">
                        Le chrono fonctionne ici, mais sa sauvegarde sur cet appareil est indisponible.
                    </p>
                )}
            </div>
            <div className="d-flex flex-wrap align-items-center justify-content-center gap-3">
                <Button variant="outline" aria-pressed={props.awake} onClick={props.onAwake}>
                    <Sun />
                    {props.awake ? 'Écran maintenu éveillé' : 'Garder l’écran éveillé'}
                </Button>
                <Button variant="ghost" onClick={() => setCancel(true)}>
                    <Square />
                    Arrêter sans valider
                </Button>
            </div>
            {props.screenMessage && (
                <p role="status" className="text-center small">
                    {props.screenMessage}
                </p>
            )}
            <Dialog open={cancel} onOpenChange={setCancel}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Arrêter cette mission ?</DialogTitle>
                        <DialogDescription>Le chrono sera effacé. La tâche restera à faire et aucun point ne sera attribué.</DialogDescription>
                    </DialogHeader>
                    <div className="d-flex flex-wrap justify-content-end gap-3">
                        <Button variant="outline" onClick={() => setCancel(false)}>
                            Garder le chrono
                        </Button>
                        <Button onClick={props.onCancel}>Arrêter sans valider</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </section>
    );
}
