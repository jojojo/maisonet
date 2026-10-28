<?php

namespace App\Actions\Tasks;

use App\Http\Requests\ReviewCompletionRequest;
use App\Http\Resources\CompletionResource;
use App\Models\Task;
use App\Models\TaskCompletion;
use App\Models\User;
use App\Support\CompletionParticipants;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class ReviewTaskCompletion
{
    use AsAction;

    public function handle(TaskCompletion $completion, User $parent, bool $approve, array $memberIds = []): void
    {
        DB::transaction(function () use ($completion, $parent, $approve, $memberIds) {
            $task = Task::lockForUpdate()->findOrFail($completion->task_id);
            $record = TaskCompletion::lockForUpdate()->findOrFail($completion->id);
            if ($record->status !== 'pending') {
                return;
            }
            if ($approve) {
                $ids = CompletionParticipants::normalize($memberIds);
                if ($record->awards_points && count($ids) === 0) {
                    throw ValidationException::withMessages(['member_ids' => 'Indique qui a réalisé la tâche pour attribuer les points.']);
                }
                AllocateCompletionPoints::run($record, $ids);
                $record->forceFill(['member_id' => count($ids) === 1 ? $ids[0] : null])->save();
                CreditCompletionPoints::run($record, $task->title);
            }
            $record->forceFill(['status' => $approve ? 'approved' : 'rejected', 'reviewed_by' => $parent->id, 'reviewed_at' => now()])->save();
            if (! $approve) {
                RestoreRejectedTask::run($task, $record);
            }
        }, 3);
    }

    public function asController(ReviewCompletionRequest $request, TaskCompletion $completion): TaskCompletion
    {
        $data = $request->validated();
        $this->handle($completion, $request->user(), $data['decision'] === 'approve', $data['member_ids'] ?? []);

        return $completion->refresh();
    }

    public function htmlResponse(TaskCompletion $completion): RedirectResponse
    {
        return back()->with('success', $completion->status === 'approved' ? 'Mission validée : les points et les étoiles sont à jour.' : 'Mission refusée. Elle est rouverte si aucune réalisation plus récente ne la remplace.');
    }

    public function jsonResponse(TaskCompletion $completion): CompletionResource
    {
        return new CompletionResource($completion->load(['participants', 'task.room', 'task.members']));
    }
}
