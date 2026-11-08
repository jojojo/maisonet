import { Button } from '@/components/bootstrap/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/bootstrap/card';
import { HouseBuddy } from '@/components/house-buddy';
import { MemberFilter } from '@/components/member-filter';
import { NewTaskButton } from '@/components/task-form-dialog';
import { TaskList } from '@/components/task-item';
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
                <CardTitle className="text-body-secondary small fw-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className={cn('fs-2 fw-semibold', className)}>{value}</p>
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
            <div className="mx-auto d-flex w-100 mn-content-5xl flex-column gap-4 p-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <MemberFilter members={members} value={filters.member} only={['missions', 'overdue', 'today', 'upcoming', 'stats', 'recent']} />
                    <NewTaskButton />
                </div>

                <section className="family-card position-relative overflow-hidden rounded-5 border-2 border-info brand-hero p-4">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-4">
                        <div className="mn-content-lg">
                            <p className="small fw-semibold eyebrow-spacing text-success-emphasis text-uppercase">La maison, c’est une équipe</p>
                            <h1 className="mt-2 fs-3 fw-bold">Mission : maison toute propre ✨</h1>
                            <p className="text-body-secondary mt-2 small">Choisis une mission rouge, relève le défi et fais-la repasser au vert !</p>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                            <HouseBuddy className="mn-w-28 flex-shrink-0 mn-sm-w-36" />
                            {freshness !== null && (
                                <div className="rounded-4 border border-white bg-body bg-opacity-75 px-4 py-3 text-center">
                                    <p className="fs-1 fw-bold text-success-emphasis">{freshness} %</p>
                                    <p className="mt-1 small fw-medium">de fraîcheur estimée</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 d-flex flex-wrap gap-2 small fw-medium">
                        <span className="rounded-pill bg-success-subtle px-3 py-2 text-success-emphasis">✨ {clean} au vert</span>
                        <span className="rounded-pill bg-danger-subtle px-3 py-2 text-danger-emphasis">🧽 {urgent} à bichonner</span>
                        <span className="rounded-pill bg-body bg-opacity-75 px-3 py-2">
                            🏆 {stats.done_this_week} missions accomplies cette semaine
                        </span>
                    </div>
                </section>

                <div className="d-grid mn-columns-2 gap-3 mn-md-columns-4">
                    <Stat label="En retard" value={overdue.length} className={overdue.length ? 'text-danger' : undefined} />
                    <Stat label="Aujourd'hui" value={today.length} className="text-warning" />
                    <Stat label="À venir (7 jours)" value={upcoming.length} />
                    <Stat label="Faites cette semaine" value={stats.done_this_week} className="text-success" />
                </div>

                <section className="d-grid gap-3">
                    <div>
                        <h2 className="fs-5 fw-semibold">Les missions de la maison</h2>
                        <p className="text-body-secondary small">Du rouge au vert · Les jauges suivent le temps écoulé entre deux ménages.</p>
                    </div>
                    <TaskList tasks={missions} empty="La maison attend ses premières missions. Crée une tâche pour commencer !" />
                </section>

                {recent.length > 0 && (
                    <section className="d-grid gap-2">
                        <h2 className="fs-5 fw-semibold">Historique récent</h2>
                        <div className="divided-list rounded-3 border">
                            {recent.map((c) => {
                                const canUndo =
                                    !seen.has(c.task.id) &&
                                    c.task.completion_info?.id === c.id &&
                                    (auth.user.is_parent || (c.status === 'pending' && c.submitted_by === auth.user.id));
                                seen.add(c.task.id);

                                return (
                                    <div key={c.id} className="d-flex align-items-center gap-3 p-3 small">
                                        <div className="mn-min-w-0 flex-fill">
                                            <p className="text-truncate fw-medium">{c.task.title}</p>
                                            <p className="text-body-secondary small">
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
                                                <p className="text-body-secondary mt-1 small text-break">Mot du parent : {c.review_note}</p>
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
