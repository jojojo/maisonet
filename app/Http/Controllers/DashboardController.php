<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskCompletion;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $memberId = $request->integer('member') ?: null;
        $today = today();
        $horizon = $today->copy()->addDays(7);

        $open = Task::with(['room', 'members'])
            ->whereNotNull('next_due_date')
            ->when($memberId, fn ($q) => $q->whereHas('members', fn ($members) => $members->where('members.id', $memberId)))
            ->orderBy('next_due_date')
            ->orderBy('title')
            ->get();

        $weekStart = $today->copy()->startOfWeek();

        $recent = TaskCompletion::with(['task.room', 'member'])
            ->when($memberId, fn ($q) => $q->where('member_id', $memberId))
            ->latest('completed_on')
            ->latest('id')
            ->limit(8)
            ->get();

        return Inertia::render('dashboard', [
            'missions' => $open,
            'overdue' => $open->filter(fn ($t) => $t->status === 'overdue')->values(),
            'today' => $open->filter(fn ($t) => $t->status === 'today')->values(),
            'upcoming' => $open->filter(fn ($t) => $t->status === 'upcoming' && $t->next_due_date->lte($horizon))->values(),
            'stats' => [
                'tasks' => Task::when($memberId, fn ($q) => $q->whereHas('members', fn ($members) => $members->where('members.id', $memberId)))->count(),
                'done_this_week' => TaskCompletion::where('completed_on', '>=', $weekStart->toDateString())
                    ->when($memberId, fn ($q) => $q->where('member_id', $memberId))
                    ->count(),
            ],
            'recent' => $recent,
            'filters' => ['member' => $memberId],
        ]);
    }
}
