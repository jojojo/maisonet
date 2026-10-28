<?php

namespace App\Actions\Tasks;

use App\Actions\Goals\SyncWeeklyGoal;
use App\Models\Member;
use App\Models\PointEntry;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;

class UndoTaskCompletion
{
    use AsAction;

    public function handle(Task $task, ?User $actor = null): void
    {
        DB::transaction(function () use ($task, $actor) {
            $locked = Task::lockForUpdate()->findOrFail($task->id);
            $last = $locked->completions()->where('status', '!=', 'rejected')->latest('id')->lockForUpdate()->first();
            if (! $last) {
                return;
            }
            abort_if($actor && ! $actor->is_parent && ($last->submitted_by !== $actor->id || $last->status !== 'pending'), 403);
            $entries = PointEntry::where('task_completion_id', $last->id)->get();
            $members = Member::whereIn('id', $entries->pluck('member_id'))->orderBy('id')->lockForUpdate()->get();
            PointEntry::where('task_completion_id', $last->id)->update(['is_void' => true]);
            foreach ($members as $member) {
                SyncWeeklyGoal::run($member, $last->completed_on);
            }
            $due = $last->due_on;
            $last->delete();
            $locked->forceFill([
                'next_due_date' => $due,
                'last_completed_at' => $last->status === 'skipped' ? $locked->last_completed_at : $locked->completions()->whereNotIn('status', ['rejected', 'skipped'])->max('completed_on'),
            ])->save();
            $task->setRawAttributes($locked->getAttributes(), true)->unsetRelations();
        }, 3);
    }

    public function asController(Request $request, Task $task): RedirectResponse
    {
        $this->handle($task, $request->user());

        return back();
    }
}
