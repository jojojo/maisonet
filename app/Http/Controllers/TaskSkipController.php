<?php

namespace App\Http\Controllers;

use App\Http\Requests\SkipTaskRequest;
use App\Http\Resources\CompletionResource;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Services\CompletionService;
use Illuminate\Http\Request;

class TaskSkipController extends Controller
{
    public function store(SkipTaskRequest $request, Task $task, CompletionService $service)
    {
        $data = $request->validated();
        $record = $service->skip($task, $request->user(), $data['due_on'], $data['reason'] ?? null);

        return $request->routeIs('api.*')
            ? new CompletionResource($record->load(['participants', 'task.room', 'task.members']))
            : back()->with('success', 'Occurrence passée, sans points. La prochaine échéance est à jour.');
    }

    public function destroy(Request $request, Task $task, CompletionService $service)
    {
        abort_unless($request->user()->is_parent, 403);
        $data = $request->validate([
            'completion_id' => ['required', 'integer'],
            'password' => $request->hasSession() && $request->session()->get('kiosk') ? ['required', 'current_password'] : ['nullable'],
        ]);
        $service->undoSkip($task, $request->user(), $data['completion_id']);

        return $request->routeIs('api.*')
            ? new TaskResource($task->fresh()->load(['room', 'members']))
            : back()->with('success', 'L’occurrence est de nouveau à faire.');
    }
}
