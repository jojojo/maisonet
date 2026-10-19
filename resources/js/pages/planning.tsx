import { MemberFilter } from '@/components/member-filter';
import { MemberDot } from '@/components/form-fields';
import { DirtGauge } from '@/components/dirt-gauge';
import { NewTaskButton } from '@/components/task-form-dialog';
import { TaskList } from '@/components/task-item';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { formatDate, recurrenceLabel, sortByDirt, todayISO } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData, type Task } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Planning', href: '/planning' }];

interface Props {
    start: string;
    previous: string;
    next: string;
    days: { date: string; tasks: Task[] }[];
    overdue: Task[];
    filters: { member: number | null };
}

function DayTask({ task }: { task: Task }) {
    return (
        <div className={cn('bg-background flex items-start gap-2 rounded-md border p-2 text-sm', task.projected && 'border-dashed opacity-70')}>
            {!task.projected && (
                <Checkbox
                    className="mt-0.5"
                    checked={false}
                    onCheckedChange={() => router.post(route('tasks.complete', task.id), {}, { preserveScroll: true })}
                    aria-label="Marquer comme faite"
                />
            )}
            <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{task.title}</p>
                <p className="text-muted-foreground text-xs">
                    {task.room?.icon} {task.room?.name} · {recurrenceLabel(task.recurrence, task.interval)}
                </p>
                {task.members.map((member) => (
                    <p key={member.id} className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                        <MemberDot color={member.color} /> {member.name}
                    </p>
                ))}
                {!task.projected && task.dirt_level !== null && <DirtGauge level={task.dirt_level} compact />}
            </div>
        </div>
    );
}

export default function Planning({ start, previous, next, days, overdue, filters }: Props) {
    const { members } = usePage<SharedData>().props;
    const today = todayISO();
    const query = (date: string) => ({ start: date, ...(filters.member ? { member: filters.member } : {}) });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Planning" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="icon" aria-label="Semaine précédente">
                            <Link href={route('planning', query(previous))} preserveScroll>
                                <ChevronLeft />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href={route('planning', filters.member ? { member: filters.member } : {})}>Cette semaine</Link>
                        </Button>
                        <Button asChild variant="outline" size="icon" aria-label="Semaine suivante">
                            <Link href={route('planning', query(next))} preserveScroll>
                                <ChevronRight />
                            </Link>
                        </Button>
                        <span className="text-sm font-medium">Semaine du {formatDate(start, { day: 'numeric', month: 'long' })}</span>
                    </div>
                    <NewTaskButton />
                </div>

                <MemberFilter members={members} value={filters.member} only={['days', 'overdue']} />

                {overdue.length > 0 && (
                    <section className="grid gap-2">
                        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">En retard ({overdue.length})</h2>
                        <TaskList tasks={overdue} />
                    </section>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                    {days.map((day) => (
                        <section key={day.date} className={cn('bg-muted/40 flex flex-col gap-2 rounded-lg border p-2', day.date === today && 'border-primary ring-primary/30 ring-2')}>
                            <h3 className="px-1 text-sm font-semibold capitalize">
                                {formatDate(day.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                            </h3>
                            {day.tasks.length === 0 ? (
                                <p className="text-muted-foreground px-1 text-xs">Rien de prévu</p>
                            ) : (
                                sortByDirt(day.tasks).map((t) => <DayTask key={`${t.id}-${day.date}`} task={t} />)
                            )}
                        </section>
                    ))}
                </div>
                <p className="text-muted-foreground text-xs">Les tâches en pointillés sont des occurrences futures calculées d'après la récurrence.</p>
            </div>
        </AppLayout>
    );
}
