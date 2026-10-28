<?php

namespace App\Actions\Tasks;

use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;

class UndoSkippedOccurrence
{
    use AsAction;

    public function handle(Task $task, User $actor, int $completionId): void
    {
        abort_unless($actor->is_parent, 403);
        DB::transaction(function () use ($task, $actor, $completionId) {
            $locked = Task::lockForUpdate()->findOrFail($task->id);
            $latest = $locked->latestCompletion;
            abort_unless($latest?->id === $completionId && $latest->status === 'skipped', 409, 'Une autre action a eu lieu depuis. Actualise les missions.');
            UndoTaskCompletion::run($locked, $actor);
        }, 3);
    }

    public function asController(Request $request, Task $task): Task
    {
        abort_unless($request->user()->is_parent, 403);
        $data = $request->validate([
            'completion_id' => ['required', 'integer'],
            'password' => $request->hasSession() && $request->session()->get('kiosk') ? ['required', 'current_password'] : ['nullable'],
        ]);
        $this->handle($task, $request->user(), $data['completion_id']);

        return $task->fresh();
    }

    public function htmlResponse(Task $task): RedirectResponse
    {
        return back()->with('success', 'L’occurrence est de nouveau à faire.');
    }

    public function jsonResponse(Task $task): TaskResource
    {
        return new TaskResource($task->load(['room', 'members']));
    }
}
