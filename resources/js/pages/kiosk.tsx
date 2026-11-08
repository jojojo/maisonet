import { Button } from '@/components/bootstrap/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/bootstrap/dialog';
import { Input } from '@/components/bootstrap/input';
import { DayPeriodBadge } from '@/components/day-period-badge';
import { DirtGauge } from '@/components/dirt-gauge';
import { EffortBadge } from '@/components/effort-badge';
import { HouseBuddy } from '@/components/house-buddy';
import { KioskMiniGame } from '@/components/kiosk-mini-game';
import { KioskMissionTimer } from '@/components/kiosk-mission-timer';
import { TaskSkipControl } from '@/components/task-skip-control';
import { useKioskScreen } from '@/hooks/use-kiosk-screen';
import { useKioskTimers } from '@/hooks/use-kiosk-timers';
import { formatElapsed } from '@/lib/kiosk-timer';
import { dirtStyle, dueLabel, sortByDirt, todayISO } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { type KioskMiniGameOffer, type SharedData, type Task } from '@/types';
import { Head, Link, router, useForm, usePage, usePoll } from '@inertiajs/react';
import { Check, Clock3, LockKeyhole, Maximize, Play, RefreshCw, Sun, Tablet, Timer, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

function Declare({
    task,
    memberId,
    close,
    onRecorded,
}: {
    task: Task;
    memberId: number | null;
    close: () => void;
    onRecorded: (offer: KioskMiniGameOffer | null) => void;
}) {
    const { members } = usePage<SharedData>().props;
    const form = useForm({ member_ids: memberId ? [memberId] : task.members.length === 1 ? [task.members[0].id] : ([] as number[]) });
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open && !form.processing) close();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Qui a donné un coup de main ?</DialogTitle>
                    <DialogDescription>{task.title} · Les points seront validés par un parent.</DialogDescription>
                </DialogHeader>
                <form
                    className="d-grid gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(route('kiosk.complete', task.id), {
                            preserveScroll: true,
                            onSuccess: (page) => {
                                close();
                                onRecorded((page.props as unknown as SharedData).flash?.kiosk_mini_game ?? null);
                            },
                        });
                    }}
                >
                    <div className="d-grid gap-2 mn-sm-columns-2">
                        {members.map((member) => (
                            <label key={member.id} className="d-flex mn-min-h-14 cursor-pointer align-items-center gap-3 rounded-3 border-2 p-3">
                                <input
                                    className="form-check-input mn-icon-6"
                                    type="checkbox"
                                    checked={form.data.member_ids.includes(member.id)}
                                    onChange={(e) =>
                                        form.setData(
                                            'member_ids',
                                            e.target.checked
                                                ? [...form.data.member_ids, member.id]
                                                : form.data.member_ids.filter((id) => id !== member.id),
                                        )
                                    }
                                />
                                <span className="mn-icon-3 rounded-pill" style={{ backgroundColor: member.color }} />
                                {member.name}
                            </label>
                        ))}
                    </div>
                    {Object.values(form.errors).map((error) => (
                        <p role="alert" key={error} className="text-danger small">
                            {error}
                        </p>
                    ))}
                    <Button className="mn-h-14 fs-6" disabled={form.processing || !form.data.member_ids.length}>
                        <Check className="mn-icon-5" />
                        {form.processing ? 'Envoi…' : 'Mission accomplie !'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Exit({ close }: { close: () => void }) {
    const form = useForm({ password: '' });
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) close();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Retour à l’espace parent</DialogTitle>
                    <DialogDescription>Le mot de passe du compte connecté permet de quitter le kiosque.</DialogDescription>
                </DialogHeader>
                <form
                    className="d-grid gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(route('kiosk.leave'), { onFinish: () => form.reset('password') });
                    }}
                >
                    <Input
                        aria-label="Mot de passe du parent"
                        type="password"
                        autoComplete="current-password"
                        autoFocus
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        required
                    />
                    {form.errors.password && (
                        <p role="alert" className="text-danger small">
                            {form.errors.password}
                        </p>
                    )}
                    <Button disabled={form.processing}>Déverrouiller</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function Kiosk({ active, tasks, completedToday }: { active: boolean; tasks: Task[]; completedToday: number }) {
    const { members, flash, auth } = usePage<SharedData>().props;
    const [memberId, setMemberId] = useState<number | null>(null);
    const [period, setPeriod] = useState<'today' | 'all'>('today');
    const [declaring, setDeclaring] = useState<Task | null>(null);
    const [exit, setExit] = useState(false);
    const [miniGame, setMiniGame] = useState<KioskMiniGameOffer | null>(null);
    const [now, setNow] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);
    const screen = useKioskScreen();
    const {
        timers,
        elapsedMs,
        storageError,
        start: startTimer,
        pause: pauseChrono,
        resume: resumeChrono,
        clear: clearTimer,
    } = useKioskTimers(auth.user.id);
    const [focusedTaskId, setFocusedTaskId] = useState<number | null>(null);
    const timer = timers.find((timer) => timer.taskId === focusedTaskId);
    const timerTask = active && timer ? tasks.find((task) => task.id === timer.taskId) : undefined;
    useEffect(() => {
        if (!active) return;
        for (const timer of timers) {
            const task = tasks.find((task) => task.id === timer.taskId);
            if (!task || (task.completion_info?.id ?? null) !== timer.completionId) clearTimer(timer.taskId);
        }
    }, [active, timers, tasks, clearTimer]);
    const { start: startPolling, stop: stopPolling } = usePoll(
        60000,
        () => ({ only: ['tasks', 'completedToday', 'members'], preserveScroll: true }),
        { autoStart: false },
    );
    useEffect(() => {
        if (active && !declaring && !exit && !miniGame) startPolling();
        else stopPolling();
        return stopPolling;
    }, [active, declaring, exit, miniGame, startPolling, stopPolling]);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 30000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!active) return;
        const timer = window.setTimeout(() => {
            if (!declaring && !exit) setMemberId(null);
        }, 120000);
        return () => window.clearTimeout(timer);
    }, [active, memberId, declaring, exit]);
    const visible = sortByDirt(
        tasks.filter(
            (task) =>
                (!memberId || !task.members.length || task.members.some((member) => member.id === memberId)) &&
                (period === 'all' || ['today', 'overdue'].includes(task.status)),
        ),
    );
    const refresh = () => {
        setRefreshing(true);
        router.reload({ only: ['tasks', 'completedToday', 'members'], onFinish: () => setRefreshing(false) });
    };

    return (
        <>
            <Head title="Kiosque familial" />
            <main
                className="family-canvas bg-body text-body min-vh-100 px-3 py-4 px-sm-4 py-sm-4"
                style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            >
                <div className="mx-auto d-grid mn-content-7xl gap-4">
                    <header className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <img src="/pwa-icons/icon-192.png" className="mn-icon-14 rounded-4 bg-white" alt="" />
                            <div>
                                <h1 className="fs-3 fw-bold">
                                    Maiso’net <span className="text-warning">✦</span>
                                </h1>
                                <p className="text-body-secondary small">Notre tableau de famille</p>
                            </div>
                        </div>
                        <div className="d-flex flex-wrap align-items-center gap-3">
                            <div className="text-end">
                                <p className="fs-3 fw-bold numeric">{now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                                <p className="text-body-secondary small text-capitalize">
                                    {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                            {active && (
                                <Button
                                    variant="outline"
                                    className="mn-h-12 gap-2 px-3"
                                    aria-label="Quitter le kiosque"
                                    onClick={() => setExit(true)}
                                >
                                    <LockKeyhole />
                                    Quitter le kiosque
                                </Button>
                            )}
                        </div>
                    </header>
                    {!active ? (
                        <section className="family-card bg-body mx-auto d-grid w-100 mn-content-2xl justify-items-center gap-4 rounded-5 border-2 p-4 text-center p-sm-5">
                            <HouseBuddy className="mn-w-40" />
                            <h2 className="fs-2 fw-bold">Un petit quartier général pour la famille</h2>
                            <p className="text-body-secondary lh-lg">
                                Pose l’iPad dans la cuisine : chacun choisit son prénom, retrouve ses missions et déclare ses coups de main.
                            </p>
                            <div className="bg-primary-subtle d-grid gap-3 rounded-4 p-3 text-start small">
                                <p>🔒 La sortie et les réglages demandent le mot de passe du parent.</p>
                                <p>⭐ Les réalisations du kiosque attendent une validation parentale.</p>
                                <p>
                                    📱 Sur iPad : Safari → Partager → Sur l’écran d’accueil. Pour bloquer l’iPad sur cette application, utilise Accès
                                    guidé dans les réglages d’accessibilité.
                                </p>
                            </div>
                            <Button className="mn-h-14 px-4 fs-6" onClick={() => router.post(route('kiosk.enter'))}>
                                <Tablet />
                                Activer le kiosque
                            </Button>
                            <Link href={route('dashboard')} className="small text-decoration-underline">
                                Retour au tableau de bord
                            </Link>
                        </section>
                    ) : timerTask && timer ? (
                        <KioskMissionTimer
                            key={timer.taskId}
                            task={timerTask}
                            member={members.find((member) => member.id === timer.memberId)}
                            elapsedMs={elapsedMs(timer)}
                            paused={timer.startedAt === null}
                            awake={screen.awake}
                            storageError={storageError}
                            screenMessage={screen.message}
                            onPause={() => pauseChrono(timer.taskId)}
                            onResume={() => resumeChrono(timer.taskId)}
                            onBack={() => setFocusedTaskId(null)}
                            onCancel={() => {
                                clearTimer(timer.taskId);
                                setFocusedTaskId(null);
                            }}
                            onAwake={() => void screen.toggleAwake()}
                            onFinish={() => {
                                pauseChrono(timer.taskId);
                                setDeclaring(timerTask);
                            }}
                        />
                    ) : (
                        <>
                            <section className="family-card bg-primary d-flex flex-wrap align-items-center justify-content-between gap-3 rounded-5 border-2 border-info p-4">
                                <div>
                                    <h2 className="fs-3 fw-bold">Qui relève une mission aujourd’hui ?</h2>
                                    <p className="text-body-secondary mt-1 small">Un prénom, une mission, et la maison sourit !</p>
                                </div>
                                <p className="bg-body d-flex align-items-center gap-2 rounded-4 px-3 py-3 fw-bold">
                                    <Trophy className="text-warning" />
                                    {completedToday} coup(s) de main aujourd’hui
                                </p>
                            </section>
                            {timers.length > 0 && (
                                <section aria-label="Chronomètres des missions" className="d-grid gap-3 mn-md-columns-2">
                                    {timers.map((timer) => {
                                        const task = tasks.find((task) => task.id === timer.taskId);
                                        if (!task) return null;
                                        const member = members.find((member) => member.id === timer.memberId);
                                        return (
                                            <div
                                                key={timer.taskId}
                                                className="family-card bg-warning-subtle d-flex flex-wrap align-items-center justify-content-between gap-3 rounded-4 border-2 border-info p-3"
                                            >
                                                <div className="d-flex mn-min-w-0 flex-fill align-items-start gap-3">
                                                    <Timer className="mt-1 flex-shrink-0" />
                                                    <div className="mn-min-w-0">
                                                        <h3 className="fw-bold text-break">{task.title}</h3>
                                                        {member && <p className="text-body-secondary small">{member.name}</p>}
                                                        <p className="mt-1 d-flex flex-wrap align-items-center gap-2">
                                                            <span className="fs-4 fw-bold numeric">{formatElapsed(elapsedMs(timer))}</span>
                                                            <span className="small">{timer.startedAt === null ? 'En pause' : 'En cours'}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    aria-label={`Afficher le chrono : ${task.title}`}
                                                    onClick={() => setFocusedTaskId(timer.taskId)}
                                                >
                                                    Afficher le chrono
                                                </Button>
                                            </div>
                                        );
                                    })}
                                    {storageError && (
                                        <p role="status" className="small text-warning-emphasis">
                                            La sauvegarde des chronomètres sur cet appareil est indisponible.
                                        </p>
                                    )}
                                </section>
                            )}
                            <nav aria-label="Choisir un membre" className="d-flex flex-wrap gap-3">
                                <Button
                                    className="mn-h-14 rounded-4 px-4 fs-6"
                                    variant={memberId === null ? 'default' : 'outline'}
                                    aria-pressed={memberId === null}
                                    onClick={() => setMemberId(null)}
                                >
                                    Toute la famille
                                </Button>
                                {members.map((member) => (
                                    <Button
                                        key={member.id}
                                        className="mn-h-14 rounded-4 px-3 fs-6"
                                        variant={memberId === member.id ? 'default' : 'outline'}
                                        aria-pressed={memberId === member.id}
                                        onClick={() => setMemberId(member.id)}
                                    >
                                        <span
                                            className="d-flex mn-icon-8 align-items-center justify-content-center rounded-pill fw-bold text-white"
                                            style={{ backgroundColor: member.color }}
                                        >
                                            {member.name.charAt(0)}
                                        </span>
                                        {member.name}
                                    </Button>
                                ))}
                            </nav>
                            {flash?.success && (
                                <p role="status" className="rounded-4 bg-success-subtle p-3 fw-semibold text-success-emphasis">
                                    ✨ {flash.success}
                                </p>
                            )}
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div className="d-flex flex-wrap gap-2">
                                    <Button
                                        variant={period === 'today' ? 'secondary' : 'ghost'}
                                        aria-pressed={period === 'today'}
                                        onClick={() => setPeriod('today')}
                                    >
                                        À faire aujourd’hui
                                    </Button>
                                    <Button
                                        variant={period === 'all' ? 'secondary' : 'ghost'}
                                        aria-pressed={period === 'all'}
                                        onClick={() => setPeriod('all')}
                                    >
                                        Toutes les missions
                                    </Button>
                                </div>
                                <Button variant="ghost" disabled={refreshing} onClick={refresh}>
                                    <RefreshCw className={refreshing ? 'spin' : ''} />
                                    Actualiser
                                </Button>
                            </div>
                            <section aria-label="Missions de la famille" className="d-grid align-items-start gap-3 mn-md-columns-2 mn-xl-columns-3">
                                {visible.map((task) => {
                                    const doneToday = task.last_completed_at === todayISO();
                                    const taskTimer = timers.find((timer) => timer.taskId === task.id);
                                    return (
                                        <article
                                            key={task.id}
                                            className={cn(
                                                'family-card bg-body d-grid gap-3 rounded-5 border-2 p-4',
                                                task.dirt_level !== null && dirtStyle(task.dirt_level).surface,
                                            )}
                                        >
                                            <div className="d-flex align-items-start gap-3">
                                                <span
                                                    className="bg-body d-flex mn-icon-12 flex-shrink-0 align-items-center justify-content-center rounded-4 fs-2"
                                                    aria-hidden
                                                >
                                                    {task.room?.icon ?? '🧽'}
                                                </span>
                                                <div className="mn-min-w-0 flex-fill">
                                                    <h3 className="fs-5 fw-bold text-break">{task.title}</h3>
                                                    <p className="text-body-secondary mt-1 small">
                                                        {task.room?.name} · {dueLabel(task)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="d-flex flex-wrap align-items-center gap-2">
                                                <EffortBadge task={task} />
                                                <DayPeriodBadge period={task.day_period} />
                                                {task.members.map((member) => (
                                                    <span key={member.id} className="bg-body rounded-pill px-2 py-1 small fw-semibold">
                                                        {member.name}
                                                    </span>
                                                ))}
                                                {!task.members.length && <span className="text-body-secondary small">Tout le monde peut aider</span>}
                                            </div>
                                            {task.dirt_level !== null && <DirtGauge level={task.dirt_level} compact />}
                                            {!doneToday && (
                                                <Button
                                                    className="mn-h-14 w-100 rounded-4 fs-6"
                                                    onClick={() => {
                                                        startTimer(
                                                            task.id,
                                                            memberId ?? (task.members.length === 1 ? task.members[0].id : null),
                                                            task.completion_info?.id ?? null,
                                                        );
                                                        setFocusedTaskId(task.id);
                                                    }}
                                                >
                                                    <Play />
                                                    {taskTimer ? 'Revoir le chrono' : 'Je commence'}
                                                </Button>
                                            )}
                                            <Button
                                                variant={doneToday ? 'outline' : 'ghost'}
                                                className="mn-h-14 w-100 rounded-4 fs-6"
                                                disabled={doneToday}
                                                onClick={() => setDeclaring(task)}
                                            >
                                                {doneToday ? (
                                                    <>
                                                        <Clock3 />
                                                        {task.completion_info?.status === 'pending'
                                                            ? 'En attente des parents'
                                                            : 'Déjà faite aujourd’hui'}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check />
                                                        C’est fait !
                                                    </>
                                                )}
                                            </Button>
                                            <TaskSkipControl task={task} kiosk />
                                        </article>
                                    );
                                })}
                            </section>
                            {!visible.length && (
                                <section className="bg-body d-grid justify-items-center gap-3 rounded-5 border-2 border-dashed p-5 text-center">
                                    <HouseBuddy className="mn-w-36" />
                                    <h2 className="fs-3 fw-bold">
                                        {period === 'today' ? 'Tout est au vert pour aujourd’hui !' : 'Pas encore de mission ici'}
                                    </h2>
                                    <p className="text-body-secondary">
                                        {period === 'today'
                                            ? 'Un peu de repos, ça se mérite aussi.'
                                            : 'Les parents peuvent préparer les prochaines missions.'}
                                    </p>
                                </section>
                            )}
                            <footer className="d-flex flex-wrap align-items-center justify-content-between gap-3 border-top py-3">
                                <p className="text-body-secondary small">Mise à jour automatique chaque minute · Validation par les parents</p>
                                <div className="d-flex flex-wrap gap-3">
                                    <Button
                                        variant={screen.awake ? 'secondary' : 'outline'}
                                        aria-pressed={screen.awake}
                                        onClick={() => void screen.toggleAwake()}
                                    >
                                        <Sun />
                                        {screen.awake ? 'Écran maintenu éveillé' : 'Garder l’écran éveillé'}
                                    </Button>
                                    <Button variant="outline" onClick={() => void screen.fullscreen()}>
                                        <Maximize />
                                        Plein écran
                                    </Button>
                                </div>
                                {screen.message && (
                                    <p role="status" className="w-100 small">
                                        {screen.message}
                                    </p>
                                )}
                            </footer>
                        </>
                    )}
                </div>
                {declaring && (
                    <Declare
                        task={declaring}
                        memberId={timers.find((timer) => timer.taskId === declaring.id)?.memberId ?? memberId}
                        close={() => setDeclaring(null)}
                        onRecorded={(offer) => {
                            clearTimer(declaring.id);
                            if (focusedTaskId === declaring.id) setFocusedTaskId(null);
                            setMiniGame(offer);
                        }}
                    />
                )}
                {exit && <Exit close={() => setExit(false)} />}
                {active && miniGame && <KioskMiniGame key={miniGame.completion_id} offer={miniGame} close={() => setMiniGame(null)} />}
            </main>
        </>
    );
}
