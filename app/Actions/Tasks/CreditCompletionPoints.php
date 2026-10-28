<?php

namespace App\Actions\Tasks;

use App\Actions\Goals\SyncWeeklyGoal;
use App\Models\PointEntry;
use App\Models\TaskCompletion;
use Lorisleiva\Actions\Concerns\AsAction;

class CreditCompletionPoints
{
    use AsAction;

    public function handle(TaskCompletion $completion, string $title): void
    {
        $members = $completion->participants()->orderBy('members.id')->lockForUpdate()->get();
        foreach ($members as $member) {
            if ((float) $member->pivot->points <= 0) {
                continue;
            }
            PointEntry::firstOrCreate(['task_completion_id' => $completion->id, 'member_id' => $member->id], [
                'task_title' => $title, 'completed_on' => $completion->completed_on,
                'points' => $member->pivot->points, 'is_void' => false,
            ]);
            SyncWeeklyGoal::run($member, $completion->completed_on);
        }
    }
}
