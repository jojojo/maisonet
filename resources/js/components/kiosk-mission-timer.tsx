import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
        <section className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" onClick={props.onBack}>
                    <ArrowLeft />
                    Voir le tableau
                </Button>
                <p role="status" className="bg-secondary flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold">
                    <Timer />
                    {props.paused ? 'Petite pause' : 'Mission en cours'}
                </p>
            </div>
            <div className="family-card bg-card mx-auto grid w-full max-w-5xl justify-items-center gap-4 rounded-[2rem] border-2 border-cyan-500 px-4 py-6 text-center sm:px-8 sm:py-7">
                <span className="bg-accent flex size-20 -rotate-3 items-center justify-center rounded-3xl text-5xl" aria-hidden>
                    {props.task.room?.icon ?? '🧽'}
                </span>
                <div>
                    <p className="text-muted-foreground mb-2 text-sm font-semibold">
                        {props.task.room?.name}
                        {props.member ? ` · À toi de jouer, ${props.member.name} !` : ''}
                    </p>
                    <h2 className="text-3xl font-extrabold sm:text-4xl">{props.task.title}</h2>
                </div>
                <div
                    role="timer"
                    aria-live="off"
                    aria-label={`Temps écoulé : ${formatElapsed(props.elapsedMs)}`}
                    className="text-primary-foreground dark:text-foreground w-full text-[clamp(3.25rem,13vw,9rem)] leading-tight font-extrabold tracking-tight tabular-nums"
                >
                    {formatElapsed(props.elapsedMs)}
                </div>
                <p className="text-muted-foreground text-sm">
                    {props.paused ? 'Le chrono attend. Reprends quand tu es prêt.' : 'Prends ton temps, chaque coup de main compte.'}
                </p>
                <div className="mt-3 grid w-full max-w-2xl gap-4 sm:grid-cols-2">
                    <Button variant="outline" className="h-16 rounded-2xl text-lg" onClick={props.paused ? props.onResume : props.onPause}>
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
                    <Button className="h-16 rounded-2xl text-lg" onClick={props.onFinish}>
                        <Check />
                        C’est terminé !
                    </Button>
                </div>
                <p className="text-muted-foreground text-xs">La réalisation sera envoyée aux parents pour validation.</p>
                {props.storageError && (
                    <p role="status" className="text-sm text-amber-800 dark:text-amber-200">
                        Le chrono fonctionne ici, mais sa sauvegarde sur cet appareil est indisponible.
                    </p>
                )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
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
                <p role="status" className="text-center text-sm">
                    {props.screenMessage}
                </p>
            )}
            <Dialog open={cancel} onOpenChange={setCancel}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Arrêter cette mission ?</DialogTitle>
                        <DialogDescription>Le chrono sera effacé. La tâche restera à faire et aucun point ne sera attribué.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-wrap justify-end gap-3">
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
