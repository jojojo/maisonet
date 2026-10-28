<?php

namespace App\Actions\Kiosk;

use App\Actions\Tasks\CompleteTask;
use App\Models\Task;
use App\Models\TaskCompletion;
use App\Models\User;
use App\Support\FamilyContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;

class CompleteKioskTask
{
    use AsAction;

    public function handle(Task $task, array $memberIds, User $actor): ?TaskCompletion
    {
        return CompleteTask::run($task, $memberIds, $actor, requiresReview: true);
    }

    public function asController(Request $request, Task $task): RedirectResponse
    {
        abort_unless($request->user()->is_parent && $request->session()->get('kiosk'), 403);
        $data = $request->validate([
            'member_ids' => ['required', 'array', 'min:1'],
            'member_ids.*' => ['required', 'integer', 'distinct', FamilyContext::exists('members')],
        ]);
        $this->handle($task, $data['member_ids'], $request->user());

        return back()->with('success', 'Bravo ! Mission envoyée aux parents pour validation.');
    }
}
