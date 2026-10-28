<?php

namespace App\Actions\Tasks;

use App\Actions\Goals\SyncWeeklyGoal;
use App\Http\Requests\CompleteTaskRequest;
use App\Http\Resources\CompletionResource;
use App\Models\Member;
use App\Models\Task;
use App\Models\TaskCompletion;
use App\Models\User;
use App\Support\CompletionParticipants;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;

class CompleteTask
{
    use AsAction;

    public function handle(Task $task, array $memberIds, ?User $actor = null, ?CarbonInterface $on = null, bool $requiresReview = false): ?TaskCompletion
    {
        $on = ($on ?? today())->copy()->startOfDay();

        return DB::transaction(function () use ($task, $memberIds, $actor, $on, $requiresReview) {
            $locked = Task::lockForUpdate()->findOrFail($task->id);
            if ($locked->next_due_date === null) {
                return null;
            }
            $existing = $locked->completions()->whereNotIn('status', ['rejected', 'skipped'])->whereDate('completed_on', $on)->first();
            if ($existing) {
                return $existing;
            }

            $memberIds = CompletionParticipants::normalize($memberIds);
            $lastAward = $locked->latestPointAward;
            $eligible = ! $lastAward || ($lastAward->points_next_available_on !== null && $on->gte($lastAward->points_next_available_on));
            $awards = $eligible && ($locked->effort_points ?? 0) > 0 && count($memberIds) > 0;
            $approved = ! $requiresReview && ($actor === null || $actor->is_parent);
            $completion = $locked->completions()->create([
                'member_id' => count($memberIds) === 1 ? $memberIds[0] : null,
                'completed_on' => $on, 'due_on' => $locked->next_due_date,
                'effort_points' => $locked->effort_points, 'awards_points' => $awards,
                'points_next_available_on' => $awards ? $locked->recurrence->advance($on, $locked->interval) : null,
                'status' => $approved ? 'approved' : 'pending', 'submitted_by' => $actor?->id,
                'reviewed_by' => $approved ? $actor?->id : null, 'reviewed_at' => $approved ? now() : null,
            ]);
            AllocateCompletionPoints::run($completion, $memberIds);
            // Freeze each participant's weekly rules even if approval arrives next week.
            foreach (Member::whereIn('id', $memberIds)->orderBy('id')->lockForUpdate()->get() as $member) {
                SyncWeeklyGoal::run($member, $on);
            }
            if ($approved) {
                CreditCompletionPoints::run($completion, $locked->title);
            }
            $locked->forceFill(['last_completed_at' => $on, 'next_due_date' => $locked->recurrence->advance($on, $locked->interval)])->save();
            $task->setRawAttributes($locked->getAttributes(), true)->unsetRelations();

            return $completion;
        }, 3);
    }

    public function asController(CompleteTaskRequest $request, Task $task): ?TaskCompletion
    {
        $completion = $this->handle($task, $request->participantIds($task), $request->user());
        abort_if($request->routeIs('api.*') && $completion === null, 409, 'Cette tâche est déjà terminée.');

        return $completion;
    }

    public function htmlResponse(?TaskCompletion $completion): RedirectResponse
    {
        return back();
    }

    public function jsonResponse(TaskCompletion $completion): CompletionResource
    {
        return new CompletionResource($completion->load(['participants', 'task.room', 'task.members']));
    }
}
