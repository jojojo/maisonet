<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
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
}
