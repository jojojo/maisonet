<?php

namespace App\Actions\Tasks;

use App\Http\Requests\SkipTaskRequest;
use App\Http\Resources\CompletionResource;
use App\Models\Task;
use App\Models\TaskCompletion;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class SkipTaskOccurrence
{
    use AsAction;

    public function handle(Task $task, User $actor, string $dueOn, ?string $reason = null): TaskCompletion
    {
        abort_unless($actor->is_parent, 403);

        return DB::transaction(function () use ($task, $actor, $dueOn, $reason) {
            $locked = Task::lockForUpdate()->findOrFail($task->id);
            $latest = $locked->latestCompletion;
            if ($latest?->status === 'skipped' && $latest->due_on?->toDateString() === $dueOn) {
                return $latest;
            }
            abort_if($locked->next_due_date?->toDateString() !== $dueOn, 409, 'Cette échéance a changé. Actualise les missions avant de réessayer.');
            if ($latest?->status === 'pending') {
                throw ValidationException::withMessages(['reason' => 'Valide ou refuse d’abord la réalisation en attente.']);
            }
            $from = CarbonImmutable::parse($dueOn)->max(CarbonImmutable::today());
            $record = $locked->completions()->create([
                'completed_on' => today(), 'due_on' => $dueOn,
                'status' => 'skipped', 'skip_reason' => $reason,
                'effort_points' => $locked->effort_points, 'awards_points' => false,
                'submitted_by' => $actor->id, 'reviewed_by' => $actor->id, 'reviewed_at' => now(),
            ]);
            // Passing an occurrence is not a cleaning and never changes last_completed_at.
            $locked->update(['next_due_date' => $locked->recurrence->advance($from, $locked->interval)]);
            $task->setRawAttributes($locked->getAttributes(), true)->unsetRelations();

            return $record;
        }, 3);
    }

    public function asController(SkipTaskRequest $request, Task $task): TaskCompletion
    {
        $data = $request->validated();

        return $this->handle($task, $request->user(), $data['due_on'], $data['reason'] ?? null);
    }

    public function htmlResponse(TaskCompletion $completion): RedirectResponse
    {
        return back()->with('success', 'Occurrence passée, sans points. La prochaine échéance est à jour.');
    }

    public function jsonResponse(TaskCompletion $completion): CompletionResource
    {
        return new CompletionResource($completion->load(['participants', 'task.room', 'task.members']));
    }
}
