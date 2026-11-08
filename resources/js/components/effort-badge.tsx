import { Badge } from '@/components/bootstrap/badge';
import { type Task } from '@/types';

export function EffortBadge({ task }: { task: Pick<Task, 'effort_size' | 'effort_points'> }) {
    if (!task.effort_size || task.effort_points === null) return null;

    return (
        <Badge
            variant="outline"
            title="Effort estimé pour réaliser la tâche"
            className="border-primary-subtle bg-primary-subtle text-primary-emphasis"
        >
            {task.effort_size} · {task.effort_points} {task.effort_points === 1 ? 'pt' : 'pts'}
        </Badge>
    );
}
