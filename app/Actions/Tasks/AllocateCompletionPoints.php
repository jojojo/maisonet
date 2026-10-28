<?php

namespace App\Actions\Tasks;

use App\Models\TaskCompletion;
use Lorisleiva\Actions\Concerns\AsAction;

class AllocateCompletionPoints
{
    use AsAction;

    public function handle(TaskCompletion $completion, array $ids): void
    {
        $cents = $completion->points_total * 100;
        $values = [];
        foreach ($ids as $index => $id) {
            $values[$id] = ['points' => (intdiv($cents, count($ids)) + ($index < $cents % count($ids) ? 1 : 0)) / 100];
        }
        $completion->participants()->sync($values);
        $completion->unsetRelation('participants');
    }
}
