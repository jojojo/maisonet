import { DirtGauge } from '@/components/dirt-gauge';
import { EffortBadge } from '@/components/effort-badge';
import { HouseBuddy } from '@/components/house-buddy';
import { TaskSkipControl } from '@/components/task-skip-control';
import { KioskMissionTimer } from '@/components/kiosk-mission-timer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useKioskScreen } from '@/hooks/use-kiosk-screen';
import { useKioskTimer } from '@/hooks/use-kiosk-timer';
import { formatElapsed } from '@/lib/kiosk-timer';
import { dirtStyle, dueLabel, sortByDirt, todayISO } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { type SharedData, type Task } from '@/types';
import { Head, Link, router, useForm, usePage, usePoll } from '@inertiajs/react';
import { Check, Clock3, LockKeyhole, Maximize, Play, RefreshCw, Sun, Tablet, Timer, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

function Declare({ task, memberId, close, onRecorded }: { task: Task; memberId: number | null; close: () => void; onRecorded?: () => void }) {
    const { members } = usePage<SharedData>().props;
    const form = useForm({ member_ids: memberId ? [memberId] : task.members.length === 1 ? [task.members[0].id] : ([] as number[]) });
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) close();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Qui a donné un coup de main ?</DialogTitle>
                    <DialogDescription>{task.title} · Les points seront validés par un parent.</DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(route('kiosk.complete', task.id), {
                            preserveScroll: true,
                            onSuccess: () => {
                                onRecorded?.();
                                close();
                            },
                        });
                    }}
                >
                    <div className="grid gap-2 sm:grid-cols-2">
                        {members.map((member) => (
                            <label key={member.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3">
                                <input
                                    className="size-6 accent-teal-600"
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
                                <span className="size-3 rounded-full" style={{ backgroundColor: member.color }} />
                                {member.name}
                            </label>
                        ))}
                    </div>
                    {Object.values(form.errors).map((error) => (
                        <p role="alert" key={error} className="text-destructive text-sm">
                            {error}
                        </p>
                    ))}
                    <Button className="h-14 text-base" disabled={form.processing || !form.data.member_ids.length}>
                        <Check className="size-5" />
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
                    className="grid gap-4"
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
                        <p role="alert" className="text-destructive text-sm">
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
    const [now, setNow] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);
    const screen = useKioskScreen();
    const {
        timer,
        elapsedMs,
        storageError,
        start: startTimer,
        pause: pauseChrono,
        resume: resumeChrono,
        clear: clearTimer,
    } = useKioskTimer(auth.user.id);
    const [timerFocused, setTimerFocused] = useState(true);
    const timerTask = active && timer ? tasks.find((task) => task.id === timer.taskId) : undefined;
    useEffect(() => {
        if (active && timer && (!timerTask || (timerTask.completion_info?.id ?? null) !== timer.completionId)) clearTimer();
    }, [active, timer, timerTask, clearTimer]);
    const { start: startPolling, stop: stopPolling } = usePoll(
        60000,
        () => ({ only: ['tasks', 'completedToday', 'members'], preserveScroll: true }),
        { autoStart: false },
    );
    useEffect(() => {
        if (active && !declaring && !exit) startPolling();
        else stopPolling();
        return stopPolling;
    }, [active, declaring, exit, startPolling, stopPolling]);
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
                className="family-canvas bg-background text-foreground min-h-svh px-4 py-5 sm:px-7 sm:py-6"
                style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            >
                <div className="mx-auto grid max-w-7xl gap-6">
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <img src="/pwa-icons/icon-192.png" className="size-14 rounded-2xl bg-white" alt="" />
                            <div>
                                <h1 className="text-2xl font-extrabold">
                                    Maiso’net <span className="text-amber-500">✦</span>
                                </h1>
                                <p className="text-muted-foreground text-sm">Notre tableau de famille</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="text-right">
                                <p className="text-2xl font-extrabold tabular-nums">
                                    {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-muted-foreground text-sm capitalize">
                                    {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                            {active && (
                                <Button variant="outline" className="h-12 gap-2 px-4" aria-label="Quitter le kiosque" onClick={() => setExit(true)}>
                                    <LockKeyhole />
                                    Quitter le kiosque
                                </Button>
                            )}
                        </div>
                    </header>
                    {!active ? (
                        <section className="family-card bg-card mx-auto grid w-full max-w-2xl justify-items-center gap-5 rounded-3xl border-2 p-6 text-center sm:p-10">
                            <HouseBuddy className="w-40" />
                            <h2 className="text-3xl font-extrabold">Un petit quartier général pour la famille</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Pose l’iPad dans la cuisine : chacun choisit son prénom, retrouve ses missions et déclare ses coups de main.
                            </p>
                            <div className="bg-accent grid gap-3 rounded-2xl p-4 text-left text-sm">
                                <p>🔒 La sortie et les réglages demandent le mot de passe du parent.</p>
                                <p>⭐ Les réalisations du kiosque attendent une validation parentale.</p>
                                <p>
                                    📱 Sur iPad : Safari → Partager → Sur l’écran d’accueil. Pour bloquer l’iPad sur cette application, utilise Accès
                                    guidé dans les réglages d’accessibilité.
                                </p>
                            </div>
                            <Button className="h-14 px-7 text-base" onClick={() => router.post(route('kiosk.enter'))}>
                                <Tablet />
                                Activer le kiosque
                            </Button>
                            <Link href={route('dashboard')} className="text-sm underline">
                                Retour au tableau de bord
                            </Link>
                        </section>
                    ) : timerTask && timer && timerFocused ? (
                        <KioskMissionTimer
                            task={timerTask}
                            member={members.find((member) => member.id === timer.memberId)}
                            elapsedMs={elapsedMs}
                            paused={timer.startedAt === null}
                            awake={screen.awake}
                            storageError={storageError}
                            screenMessage={screen.message}
                            onPause={pauseChrono}
                            onResume={resumeChrono}
                            onBack={() => setTimerFocused(false)}
                            onCancel={clearTimer}
                            onAwake={() => void screen.toggleAwake()}
                            onFinish={() => {
                                pauseChrono();
                                setDeclaring(timerTask);
                            }}
                        />
                    ) : (
                        <>
                            <section className="family-card bg-primary/15 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-cyan-500 p-5">
                                <div>
                                    <h2 className="text-2xl font-extrabold">Qui relève une mission aujourd’hui ?</h2>
                                    <p className="text-muted-foreground mt-1 text-sm">Un prénom, une mission, et la maison sourit !</p>
                                </div>
                                <p className="bg-card flex items-center gap-2 rounded-2xl px-4 py-3 font-bold">
                                    <Trophy className="text-amber-600" />
                                    {completedToday} coup(s) de main aujourd’hui
                                </p>
                            </section>
                            {timerTask && timer && (
                                <section className="family-card bg-secondary flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-cyan-500 p-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Timer className="shrink-0" />
                                        <p className="font-bold break-words">
                                            {timerTask.title}
                                            <span className="ml-3 font-extrabold tabular-nums">{formatElapsed(elapsedMs)}</span>
                                            <span className="ml-2 text-xs">{timer.startedAt === null ? 'En pause' : 'En cours'}</span>
                                        </p>
                                    </div>
                                    <Button onClick={() => setTimerFocused(true)}>Afficher le chrono</Button>
                                </section>
                            )}
                            <nav aria-label="Choisir un membre" className="flex flex-wrap gap-3">
                                <Button
                                    className="h-14 rounded-2xl px-5 text-base"
                                    variant={memberId === null ? 'default' : 'outline'}
                                    aria-pressed={memberId === null}
                                    onClick={() => setMemberId(null)}
                                >
                                    Toute la famille
                                </Button>
                                {members.map((member) => (
                                    <Button
                                        key={member.id}
                                        className="h-14 rounded-2xl px-4 text-base"
                                        variant={memberId === member.id ? 'default' : 'outline'}
                                        aria-pressed={memberId === member.id}
                                        onClick={() => setMemberId(member.id)}
                                    >
                                        <span
                                            className="flex size-8 items-center justify-center rounded-full font-bold text-white"
                                            style={{ backgroundColor: member.color }}
                                        >
                                            {member.name.charAt(0)}
                                        </span>
                                        {member.name}
                                    </Button>
                                ))}
                            </nav>
                            {flash?.success && (
                                <p role="status" className="rounded-2xl bg-emerald-100 p-4 font-semibold text-emerald-900">
                                    ✨ {flash.success}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap gap-2">
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
                                    <RefreshCw className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />
                                    Actualiser
                                </Button>
                            </div>
                            <section aria-label="Missions de la famille" className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {visible.map((task) => {
                                    const doneToday = task.last_completed_at === todayISO();
                                    return (
                                        <article
                                            key={task.id}
                                            className={cn(
                                                'family-card bg-card grid gap-4 rounded-3xl border-2 p-5',
                                                task.dirt_level !== null && dirtStyle(task.dirt_level).surface,
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span
                                                    className="bg-card flex size-12 shrink-0 items-center justify-center rounded-2xl text-3xl"
                                                    aria-hidden
                                                >
                                                    {task.room?.icon ?? '🧽'}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-lg font-extrabold break-words">{task.title}</h3>
                                                    <p className="text-muted-foreground mt-1 text-sm">
                                                        {task.room?.name} · {dueLabel(task)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <EffortBadge task={task} />
                                                {task.members.map((member) => (
                                                    <span key={member.id} className="bg-card rounded-full px-2.5 py-1 text-xs font-semibold">
                                                        {member.name}
                                                    </span>
                                                ))}
                                                {!task.members.length && (
                                                    <span className="text-muted-foreground text-xs">Tout le monde peut aider</span>
                                                )}
                                            </div>
                                            {task.dirt_level !== null && <DirtGauge level={task.dirt_level} compact />}
                                            {!doneToday && (
                                                <Button
                                                    className="h-14 w-full rounded-2xl text-base"
                                                    disabled={!!timer}
                                                    onClick={() => {
                                                        startTimer(
                                                            task.id,
                                                            memberId ?? (task.members.length === 1 ? task.members[0].id : null),
                                                            task.completion_info?.id ?? null,
                                                        );
                                                        setTimerFocused(true);
                                                    }}
                                                >
                                                    <Play />
                                                    {timer ? 'Un chrono est déjà en cours' : 'Je commence'}
                                                </Button>
                                            )}
                                            <Button
                                                variant={doneToday ? 'outline' : 'ghost'}
                                                className="h-14 w-full rounded-2xl text-base"
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
                                <section className="bg-card grid justify-items-center gap-3 rounded-3xl border-2 border-dashed p-8 text-center">
                                    <HouseBuddy className="w-36" />
                                    <h2 className="text-2xl font-extrabold">
                                        {period === 'today' ? 'Tout est au vert pour aujourd’hui !' : 'Pas encore de mission ici'}
                                    </h2>
                                    <p className="text-muted-foreground">
                                        {period === 'today'
                                            ? 'Un peu de repos, ça se mérite aussi.'
                                            : 'Les parents peuvent préparer les prochaines missions.'}
                                    </p>
                                </section>
                            )}
                            <footer className="flex flex-wrap items-center justify-between gap-3 border-t py-4">
                                <p className="text-muted-foreground text-sm">Mise à jour automatique chaque minute · Validation par les parents</p>
                                <div className="flex flex-wrap gap-3">
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
                                    <p role="status" className="w-full text-sm">
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
                        memberId={timer?.taskId === declaring.id ? timer.memberId : memberId}
                        close={() => setDeclaring(null)}
                        onRecorded={() => {
                            if (timer?.taskId === declaring.id) clearTimer();
                        }}
                    />
                )}
                {exit && <Exit close={() => setExit(false)} />}
            </main>
        </>
    );
}
