<?php

namespace App\Http\Controllers;

use App\Http\Requests\TaskRequest;
use App\Models\Task;
use App\Services\CompletionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'room' => ['nullable', 'integer'],
            'member' => ['nullable', 'string'],
            'status' => ['nullable', 'in:overdue,today,upcoming,done'],
        ]);

        $tasks = Task::with(['room', 'members'])
            ->when($filters['q'] ?? null, fn ($q, $v) => $q->where('title', 'like', "%{$v}%"))
            ->when($filters['room'] ?? null, fn ($q, $v) => $q->where('room_id', $v))
            ->when($filters['member'] ?? null, fn ($q, $v) => $v === 'none'
                ? $q->doesntHave('members')
                : $q->whereHas('members', fn ($members) => $members->where('members.id', $v)))
            ->orderByRaw('next_due_date is null')
            ->orderBy('next_due_date')
            ->orderBy('title')
            ->get()
            ->when($filters['status'] ?? null, fn ($c, $v) => $c->where('status', $v)->values());

        return Inertia::render('tasks/index', [
            'tasks' => $tasks,
            'filters' => $filters,
        ]);
    }

    public function store(TaskRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $task = Task::create($request->taskData());
            $this->assignMembers($request, $task);
        });

        return back();
    }

    public function update(TaskRequest $request, Task $task): RedirectResponse
    {
        DB::transaction(function () use ($request, $task) {
            $task->update($request->taskData());
            $this->assignMembers($request, $task);
        });

        return back();
    }

    public function destroy(Task $task): RedirectResponse
    {
        $task->delete();

        return back();
    }

    private function assignMembers(TaskRequest $request, Task $task): void
    {
        $data = $request->validated();
        if (array_key_exists('member_ids', $data) || array_key_exists('member_id', $data)) {
            $ids = $data['member_ids'] ?? (isset($data['member_id']) ? [$data['member_id']] : []);
            $task->members()->sync($ids);
            $task->update(['member_id' => count($ids) === 1 ? $ids[0] : null]);
        }
    }

    public function complete(Request $request, Task $task): RedirectResponse
    {
        $data = $request->validate([
            'member_id' => ['nullable', 'integer', 'exists:members,id'],
            'member_ids' => ['sometimes', 'array'],
            'member_ids.*' => ['required', 'integer', 'distinct', 'exists:members,id'],
        ]);
        $actor = $request->user();
        $ids = $data['member_ids'] ?? (isset($data['member_id']) ? [$data['member_id']] : ($actor->is_parent ? $task->members()->pluck('members.id')->all() : array_filter([$actor->member_id])));
        if (! $actor->is_parent && (! $actor->member_id || ! in_array($actor->member_id, $ids))) {
            throw ValidationException::withMessages(['member_ids' => 'Un parent doit relier ton compte à un membre du foyer. Tu dois participer à la mission déclarée.']);
        }
        app(CompletionService::class)->complete($task, $ids, $actor);

        return back();
    }

    public function undo(Task $task): RedirectResponse
    {
        app(CompletionService::class)->undo($task, request()->user());

        return back();
    }
}
