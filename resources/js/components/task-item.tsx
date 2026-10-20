import { DirtGauge } from '@/components/dirt-gauge';
import { EffortBadge } from '@/components/effort-badge';
import { MemberDot } from '@/components/form-fields';
import { TaskCompletionControl } from '@/components/task-completion-control';
import { TaskFormDialog } from '@/components/task-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
                'family-card bg-card flex items-start gap-3 rounded-2xl border p-4',
                task.dirt_level !== null && dirtStyle(task.dirt_level).surface,
            )}
        >
            <TaskCompletionControl task={task} onCompleted={onCompleted} className="mt-0.5 size-5" />

            <div className="min-w-0 flex-1">
                <p className={cn('font-medium break-words', done && 'text-muted-foreground line-through')}>{task.title}</p>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {showRoom && task.room && (
                        <Badge variant="secondary">
                            {task.room.icon} {task.room.name}
                        </Badge>
                    )}
                    <span className={cn('font-medium', statusStyles[task.status])}>{dueLabel(task)}</span>
                    <EffortBadge task={task} />
                    {task.completion_info?.status === 'pending' && (
                        <Badge variant="outline" className="text-amber-700 dark:text-amber-300">
                            Points à valider
                        </Badge>
                    )}
                    <span className="inline-flex items-center gap-1">
                        <Repeat className="size-3" /> {recurrenceLabel(task.recurrence, task.interval)}
                    </span>
                    {task.members.map((member) => (
                        <span key={member.id} className="inline-flex items-center gap-1.5">
                            <MemberDot color={member.color} /> {member.name}
                        </span>
                    ))}
                    {task.last_completed_at && <span>Dernière fois : {formatDate(task.last_completed_at)}</span>}
                </div>
                {task.notes && <p className="text-muted-foreground mt-1 text-xs">{task.notes}</p>}
                {task.dirt_level !== null && <DirtGauge level={task.dirt_level} />}
            </div>

            <div className="flex shrink-0">
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
        <div className="grid gap-2">
            <div role="status" aria-live="polite">
                {completed && (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                        ✨ Réalisation de « {completed} » enregistrée.
                    </p>
                )}
            </div>
            {tasks.length === 0 && empty && <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">{empty}</p>}
            {sortByDirt(tasks).map((t) => (
                <TaskItem key={t.id} task={t} showRoom={showRoom} onCompleted={setCompleted} />
            ))}
        </div>
    );
}
