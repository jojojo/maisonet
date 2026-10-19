import { Badge } from '@/components/ui/badge';
import { type Task } from '@/types';

export function EffortBadge({ task }: { task: Pick<Task, 'effort_size' | 'effort_points'> }) {
    if (!task.effort_size || task.effort_points === null) return null;

    return (
        <Badge variant="outline" title="Effort estimé pour réaliser la tâche" className="border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200">
            {task.effort_size} · {task.effort_points} {task.effort_points === 1 ? 'pt' : 'pts'}
        </Badge>
    );
}
