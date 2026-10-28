<?php

namespace App\Actions\Tasks;

use App\Models\Task;
use Lorisleiva\Actions\Concerns\AsAction;

class AssignTaskMembers
{
    use AsAction;

    public function handle(Task $task, array $assignment): void
    {
        if (array_key_exists('member_ids', $assignment) || array_key_exists('member_id', $assignment)) {
            $ids = $assignment['member_ids'] ?? (isset($assignment['member_id']) ? [$assignment['member_id']] : []);
            $task->members()->sync($ids);
            $task->update(['member_id' => count($ids) === 1 ? $ids[0] : null]);
        }
    }
}
