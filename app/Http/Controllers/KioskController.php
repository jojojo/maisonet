<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskCompletion;
use App\Services\CompletionService;
use App\Support\FamilyContext;
use Illuminate\Http\RedirectResponse;
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

    public function enter(Request $request): RedirectResponse
    {
        abort_unless($request->user()->is_parent, 403);
        $request->session()->put('kiosk', true);
        $request->session()->regenerate();

        return redirect()->route('kiosk.index');
    }

    public function leave(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);
        $request->session()->forget('kiosk');
        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }

    public function complete(Request $request, Task $task, CompletionService $service): RedirectResponse
    {
        abort_unless($request->user()->is_parent && $request->session()->get('kiosk'), 403);
        $data = $request->validate([
            'member_ids' => ['required', 'array', 'min:1'],
            'member_ids.*' => ['required', 'integer', 'distinct', FamilyContext::exists('members')],
        ]);
        $service->complete($task, $data['member_ids'], $request->user(), requiresReview: true);

        return back()->with('success', 'Bravo ! Mission envoyée aux parents pour validation.');
    }
}
