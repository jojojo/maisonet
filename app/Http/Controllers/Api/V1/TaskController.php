<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Support\FamilyContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TaskController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'mine' => ['sometimes', 'boolean'],
            'room_id' => ['sometimes', 'integer', FamilyContext::exists('rooms')],
            'status' => ['sometimes', 'in:overdue,today,upcoming,done'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $query = Task::with(['room', 'members']);
        if ($request->boolean('mine')) {
            // An unlinked account has no personal tasks. Unassigned tasks remain in the family list.
            $query->whereHas('members', fn ($q) => $q->where('members.id', $request->user()->member_id ?? 0));
        }
        $query->when($filters['room_id'] ?? null, fn ($q, $id) => $q->where('room_id', $id));
        match ($filters['status'] ?? null) {
            'overdue' => $query->whereDate('next_due_date', '<', today()),
            'today' => $query->whereDate('next_due_date', today()),
            'upcoming' => $query->whereDate('next_due_date', '>', today()),
            'done' => $query->whereNull('next_due_date'),
            default => null,
        };

        return TaskResource::collection($query->orderByRaw('next_due_date is null')->orderBy('next_due_date')->orderBy('id')->paginate($filters['per_page'] ?? 30)->withQueryString());
    }

    public function show(Task $task): TaskResource
    {
        return new TaskResource($task->load(['room', 'members']));
    }
}
