<?php

namespace App\Actions\Tasks;

use App\Models\Task;
use App\Models\TaskCompletion;
use Lorisleiva\Actions\Concerns\AsAction;

class RestoreRejectedTask
{
    use AsAction;

    public function handle(Task $task, TaskCompletion $completion): void
    {
        $newer = $task->completions()->where('id', '>', $completion->id)->where('status', '!=', 'rejected')->exists();
        if (! $newer) {
            $task->forceFill([
                'next_due_date' => $completion->due_on,
                'last_completed_at' => $task->completions()->whereNotIn('status', ['rejected', 'skipped'])->max('completed_on'),
            ])->save();
        }
    }
}
