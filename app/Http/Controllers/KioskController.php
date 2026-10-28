<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskCompletion;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KioskController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->is_parent, 403);
        $active = (bool) $request->session()->get('kiosk');

        return Inertia::render('kiosk', [
            'active' => $active,
            'tasks' => $active ? Task::with(['room', 'members'])->whereNotNull('next_due_date')->orderBy('next_due_date')->orderBy('title')->get() : [],
            'completedToday' => $active ? TaskCompletion::whereDate('completed_on', today())->whereNotIn('status', ['rejected', 'skipped'])->count() : 0,
        ]);
    }
}
