import { Badge } from '@/components/bootstrap/badge';
import { Button } from '@/components/bootstrap/button';
import { DayPeriodBadge } from '@/components/day-period-badge';
import { DirtGauge } from '@/components/dirt-gauge';
import { EffortBadge } from '@/components/effort-badge';
import { MemberDot } from '@/components/form-fields';
import { TaskCompletionControl } from '@/components/task-completion-control';
import { TaskFormDialog } from '@/components/task-form-dialog';
import { TaskSkipControl } from '@/components/task-skip-control';
import { dirtStyle, dueLabel, formatDate, recurrenceLabel, sortByDirt, statusStyles } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { type Task } from '@/types';
import { router } from '@inertiajs/react';
import { Pencil, Repeat, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function TaskItem({ task, showRoom = true, onCompleted }: { task: Task; showRoom?: boolean; onCompleted?: (title: string) => void }) {
    const [editing, setEditing] = useState(false);
    const done = task.status === 'done';

    const remove = () => {
        if (confirm(`Supprimer la tâche « ${task.title} » ?`)) {
            router.delete(route('tasks.destroy', task.id), { preserveScroll: true });
        }
    };

    return (
        <div
            className={cn(
                'family-card bg-body d-grid mn-columns-48px-minmax-0-1fr align-items-start column-gap-3 row-gap-2 rounded-4 border p-3 d-sm-flex gap-sm-3',
                task.dirt_level !== null && dirtStyle(task.dirt_level).surface,
            )}
        >
            <TaskCompletionControl task={task} onCompleted={onCompleted} className="mt-1" />

            <div className="mn-min-w-0 flex-fill">
                <p className={cn('fw-medium text-break', done && 'text-body-secondary text-decoration-line-through')}>{task.title}</p>
                <div className="text-body-secondary mt-1 d-flex flex-wrap align-items-center column-gap-3 row-gap-1 small">
                    {showRoom && task.room && (
                        <Badge variant="secondary">
                            {task.room.icon} {task.room.name}
                        </Badge>
                    )}
                    <span className={cn('fw-medium', statusStyles[task.status])}>{dueLabel(task)}</span>
                    <EffortBadge task={task} />
                    <DayPeriodBadge period={task.day_period} />
                    {task.completion_info?.status === 'pending' && (
                        <Badge variant="outline" className="text-warning-emphasis">
                            Points à valider
                        </Badge>
                    )}
                    <span className="d-inline-flex align-items-center gap-1">
                        <Repeat className="mn-icon-3" /> {recurrenceLabel(task.recurrence, task.interval)}
                    </span>
                    {task.members.map((member) => (
                        <span key={member.id} className="d-inline-flex align-items-center gap-2">
                            <MemberDot color={member.color} /> {member.name}
                        </span>
                    ))}
                    {task.last_completed_at && <span>Dernière fois : {formatDate(task.last_completed_at)}</span>}
                </div>
                {task.notes && <p className="text-body-secondary mt-1 small">{task.notes}</p>}
                {task.dirt_level !== null && <DirtGauge level={task.dirt_level} />}
                <TaskSkipControl task={task} />
            </div>

            <div className="mission-actions d-flex flex-shrink-0 justify-content-end mt-sm-0">
                <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Modifier">
                    <Pencil />
                </Button>
                <Button variant="ghost" size="icon" onClick={remove} aria-label="Supprimer">
                    <Trash2 />
                </Button>
            </div>

            <TaskFormDialog task={task} open={editing} onOpenChange={setEditing} />
        </div>
    );
}

export function TaskList({ tasks, showRoom = true, empty }: { tasks: Task[]; showRoom?: boolean; empty?: string }) {
    const [completed, setCompleted] = useState('');

    return (
        <div className="d-grid gap-2">
            <div role="status" aria-live="polite">
                {completed && (
                    <p className="rounded-3 border border-success-subtle bg-success-subtle p-3 small text-success-emphasis">
                        ✨ Réalisation de « {completed} » enregistrée.
                    </p>
                )}
            </div>
            {tasks.length === 0 && empty && <p className="text-body-secondary rounded-3 border border-dashed p-4 text-center small">{empty}</p>}
            {sortByDirt(tasks).map((t) => (
                <TaskItem key={t.id} task={t} showRoom={showRoom} onCompleted={setCompleted} />
            ))}
        </div>
    );
}
