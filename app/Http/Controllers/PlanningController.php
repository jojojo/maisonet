<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlanningController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $request->validate(['start' => ['nullable', 'date'], 'member' => ['nullable', 'integer']]);

        $today = CarbonImmutable::today();
        $start = CarbonImmutable::parse($request->query('start', $today))->startOfWeek();
        $end = $start->addDays(6);
        $memberId = $request->integer('member') ?: null;

        $tasks = Task::with(['room', 'members'])
            ->whereNotNull('next_due_date')
            ->when($memberId, fn ($q) => $q->whereHas('members', fn ($members) => $members->where('members.id', $memberId)))
            ->orderBy('title')
            ->get();

        $days = collect(range(0, 6))->mapWithKeys(fn ($i) => [$start->addDays($i)->toDateString() => []])->all();
        $overdue = [];

        foreach ($tasks as $task) {
            $due = CarbonImmutable::instance($task->next_due_date);

            if ($due->lt($today)) {
                $overdue[] = $task;

                continue;
            }

            // The next due date is real; later occurrences are projections.
            $projected = false;
            $guard = 0;

            while ($due !== null && $due->lte($end) && $guard++ < 400) {
                if ($due->gte($start)) {
                    $days[$due->toDateString()][] = [...$task->toArray(), 'projected' => $projected];
                }

                $due = $task->recurrence->advance($due, $task->interval);
                $projected = true;
            }
        }

        return Inertia::render('planning', [
            'start' => $start->toDateString(),
            'previous' => $start->subWeek()->toDateString(),
            'next' => $start->addWeek()->toDateString(),
            'days' => collect($days)->map(fn ($items, $date) => ['date' => $date, 'tasks' => $items])->values(),
            'overdue' => collect($overdue)->values(),
            'filters' => ['member' => $memberId],
        ]);
    }
}
