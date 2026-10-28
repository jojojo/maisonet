import { HouseBuddy } from '@/components/house-buddy';
import { MemberFilter } from '@/components/member-filter';
import { NewTaskButton } from '@/components/task-form-dialog';
import { TaskList } from '@/components/task-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Completion, type SharedData, type Task } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Undo2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tableau de bord', href: '/dashboard' }];

interface Props {
    missions: Task[];
    overdue: Task[];
    today: Task[];
    upcoming: Task[];
    stats: { tasks: number; done_this_week: number };
    recent: Completion[];
    filters: { member: number | null };
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
    return (
        <Card>
            <CardHeader className="pb-1">
                <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className={cn('text-3xl font-semibold', className)}>{value}</p>
            </CardContent>
        </Card>
    );
}

export default function Dashboard({ missions, overdue, today, upcoming, stats, recent, filters }: Props) {
    const { members, auth } = usePage<SharedData>().props;
    const recurring = missions.filter((task) => task.dirt_level !== null);
    const clean = recurring.filter((task) => task.dirt_level! < 35).length;
    const urgent = recurring.filter((task) => task.dirt_level! >= 90).length;
    const freshness = recurring.length ? Math.round(recurring.reduce((sum, task) => sum + 100 - task.dirt_level!, 0) / recurring.length) : null;

    // Undo is only safe on the latest completion of each task.
    const seen = new Set<number>();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tableau de bord" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <MemberFilter members={members} value={filters.member} only={['missions', 'overdue', 'today', 'upcoming', 'stats', 'recent']} />
                    <NewTaskButton />
                </div>

                <section className="family-card relative overflow-hidden rounded-3xl border-2 border-cyan-500 bg-gradient-to-br from-teal-200 via-cyan-100 to-sky-200 p-6 dark:border-emerald-900 dark:from-emerald-950 dark:via-teal-950 dark:to-sky-950">
                    <div className="flex flex-wrap items-center justify-between gap-5">
                        <div className="max-w-lg">
                            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-300">
                                La maison, c’est une équipe
                            </p>
                            <h1 className="mt-2 text-2xl font-bold">Mission : maison toute propre ✨</h1>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Choisis une mission rouge, relève le défi et fais-la repasser au vert !
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <HouseBuddy className="w-28 shrink-0 sm:w-36" />
                            {freshness !== null && (
                                <div className="rounded-2xl border border-white/70 bg-white/70 px-6 py-4 text-center dark:border-white/10 dark:bg-black/20">
                                    <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">{freshness} %</p>
                                    <p className="mt-1 text-xs font-medium">de fraîcheur estimée</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
                        <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                            ✨ {clean} au vert
                        </span>
                        <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-800 dark:bg-red-900 dark:text-red-100">
                            🧽 {urgent} à bichonner
                        </span>
                        <span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-white/10">
                            🏆 {stats.done_this_week} missions accomplies cette semaine
                        </span>
                    </div>
                </section>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Stat label="En retard" value={overdue.length} className={overdue.length ? 'text-red-600 dark:text-red-400' : undefined} />
                    <Stat label="Aujourd'hui" value={today.length} className="text-amber-600 dark:text-amber-400" />
                    <Stat label="À venir (7 jours)" value={upcoming.length} />
                    <Stat label="Faites cette semaine" value={stats.done_this_week} className="text-green-600 dark:text-green-400" />
                </div>

                <section className="grid gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">Les missions de la maison</h2>
                        <p className="text-muted-foreground text-sm">Du rouge au vert · Les jauges suivent le temps écoulé entre deux ménages.</p>
                    </div>
                    <TaskList tasks={missions} empty="La maison attend ses premières missions. Crée une tâche pour commencer !" />
                </section>

                {recent.length > 0 && (
                    <section className="grid gap-2">
                        <h2 className="text-lg font-semibold">Historique récent</h2>
                        <div className="divide-y rounded-lg border">
                            {recent.map((c) => {
                                const canUndo =
                                    !seen.has(c.task.id) &&
                                    c.task.completion_info?.id === c.id &&
                                    (auth.user.is_parent || (c.status === 'pending' && c.submitted_by === auth.user.id));
                                seen.add(c.task.id);

                                return (
                                    <div key={c.id} className="flex items-center gap-3 p-3 text-sm">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium">{c.task.title}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {c.task.room?.icon} {c.task.room?.name} · {formatDate(c.completed_on)}
                                                {c.member && ` · ${c.member.name}`}
                                                {c.status === 'skipped' &&
                                                    ` · Occurrence passée, sans points${c.skip_reason ? ` : ${c.skip_reason}` : ''}`}
                                                {c.status !== 'skipped' &&
                                                    c.effort_points !== null &&
                                                    ` · ${c.points_total} ${c.points_total === 1 ? 'point' : 'points'}${c.status === 'pending' ? ' à valider' : ''}${c.awarded_points !== null && c.awarded_points !== c.effort_points ? ` (base : ${c.effort_points})` : ''}`}
                                                {c.task.next_due_date && ` · prochaine échéance ${formatDate(c.task.next_due_date)}`}
                                            </p>
                                            {c.review_note && (
                                                <p className="text-muted-foreground mt-1 text-xs break-words">Mot du parent : {c.review_note}</p>
                                            )}
                                        </div>
                                        {canUndo && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Annuler"
                                                onClick={() =>
                                                    router.delete(route(c.status === 'skipped' ? 'tasks.undo-skip' : 'tasks.undo', c.task.id), {
                                                        preserveScroll: true,
                                                        data: { completion_id: c.id },
                                                    })
                                                }
                                            >
                                                <Undo2 />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
