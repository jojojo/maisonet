import { Button } from '@/components/bootstrap/button';
import { DirtGauge } from '@/components/dirt-gauge';
import { EffortBadge } from '@/components/effort-badge';
import { MemberDot } from '@/components/form-fields';
import { MemberFilter } from '@/components/member-filter';
import { TaskCompletionControl } from '@/components/task-completion-control';
import { NewTaskButton } from '@/components/task-form-dialog';
import { TaskList } from '@/components/task-item';
import { TaskSkipControl } from '@/components/task-skip-control';
import AppLayout from '@/layouts/app-layout';
import { dayPeriodOptions } from '@/lib/day-periods';
import { formatDate, recurrenceLabel, sortByDirt, todayISO } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData, type Task } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
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
        <div className={cn('bg-body rounded-3 border p-2 small', task.projected && 'border-dashed opacity-75')}>
            <div className="mn-min-w-0 mn-stack-1-5">
                <div className="d-flex align-items-start gap-2">
                    {!task.projected && <TaskCompletionControl task={task} className="task-check-sm" />}
                    <p className="mn-min-w-0 flex-fill lh-base fw-semibold text-break">{task.title}</p>
                </div>
                <EffortBadge task={task} />
                <p className="text-body-secondary small">
                    {task.room?.icon} {task.room?.name} · {recurrenceLabel(task.recurrence, task.interval)}
                </p>
                {task.members.map((member) => (
                    <p key={member.id} className="text-body-secondary mt-1 d-flex align-items-center gap-2 small">
                        <MemberDot color={member.color} /> {member.name}
                    </p>
                ))}
                {!task.projected && task.dirt_level !== null && <DirtGauge level={task.dirt_level} compact />}
                {!task.projected && <TaskSkipControl task={task} />}
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
            <div className="mx-auto d-flex w-100 mn-content-7xl flex-column gap-4 p-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-2">
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
                        <span className="small fw-medium">Semaine du {formatDate(start, { day: 'numeric', month: 'long' })}</span>
                    </div>
                    <NewTaskButton />
                </div>

                <MemberFilter members={members} value={filters.member} only={['days', 'overdue']} />

                {overdue.length > 0 && (
                    <section className="d-grid gap-2">
                        <h2 className="fs-5 fw-semibold text-danger">En retard ({overdue.length})</h2>
                        <TaskList tasks={overdue} />
                    </section>
                )}

                <div className="d-grid gap-3 mn-sm-columns-2 mn-lg-columns-4 mn-2xl-columns-7">
                    {days.map((day) => (
                        <section
                            key={day.date}
                            className={cn(
                                'bg-body-tertiary d-flex flex-column gap-2 rounded-3 border p-2',
                                day.date === today && 'border-primary border',
                            )}
                        >
                            <h3 className="px-1 small fw-semibold text-capitalize">
                                {formatDate(day.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                            </h3>
                            {day.tasks.length === 0 ? (
                                <p className="text-body-secondary px-1 small">Rien de prévu</p>
                            ) : (
                                dayPeriodOptions.map((period) => {
                                    const tasks = day.tasks.filter((task) => (task.day_period ?? 'all_day') === period.value);
                                    if (!tasks.length) return null;
                                    return (
                                        <div key={period.value} className="d-grid gap-2">
                                            <h4 className="text-body-secondary px-1 pt-2 small fw-semibold">
                                                <span aria-hidden>{period.emoji}</span> {period.label}
                                            </h4>
                                            {sortByDirt(tasks).map((task) => (
                                                <DayTask key={`${task.id}-${day.date}`} task={task} />
                                            ))}
                                        </div>
                                    );
                                })
                            )}
                        </section>
                    ))}
                </div>
                <p className="text-body-secondary small">Les tâches en pointillés sont des occurrences futures calculées d'après la récurrence.</p>
            </div>
        </AppLayout>
    );
}
