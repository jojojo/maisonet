<?php

namespace App\Services;

use App\Models\Member;
use App\Models\PointEntry;
use App\Models\Task;
use App\Models\TaskCompletion;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompletionService
{
    public function __construct(private GoalService $goals) {}

    public function complete(Task $task, array $memberIds, ?User $actor = null, ?CarbonInterface $on = null): ?TaskCompletion
    {
        $on = ($on ?? today())->copy()->startOfDay();

        return DB::transaction(function () use ($task, $memberIds, $actor, $on) {
            $locked = Task::lockForUpdate()->findOrFail($task->id);
            if ($locked->next_due_date === null) {
                return null;
            }
            $existing = $locked->completions()->where('status', '!=', 'rejected')->whereDate('completed_on', $on)->first();
            if ($existing) {
                return $existing;
            }

            $memberIds = $this->members($memberIds);
            $lastAward = $locked->latestPointAward;
            $eligible = ! $lastAward || ($lastAward->points_next_available_on !== null && $on->gte($lastAward->points_next_available_on));
            $awards = $eligible && ($locked->effort_points ?? 0) > 0 && count($memberIds) > 0;
            $approved = $actor === null || $actor->is_parent;
            $completion = $locked->completions()->create([
                'member_id' => count($memberIds) === 1 ? $memberIds[0] : null,
                'completed_on' => $on, 'due_on' => $locked->next_due_date,
                'effort_points' => $locked->effort_points, 'awards_points' => $awards,
                'points_next_available_on' => $awards ? $locked->recurrence->advance($on, $locked->interval) : null,
                'status' => $approved ? 'approved' : 'pending', 'submitted_by' => $actor?->id,
                'reviewed_by' => $approved ? $actor?->id : null, 'reviewed_at' => $approved ? now() : null,
            ]);
            $this->allocate($completion, $memberIds);
            // Freeze each participant's weekly rules even if approval arrives next week.
            foreach (Member::whereIn('id', $memberIds)->orderBy('id')->lockForUpdate()->get() as $member) {
                $this->goals->syncWeek($member, $on);
            }
            if ($approved) {
                $this->credit($completion, $locked->title);
            }
            $locked->forceFill(['last_completed_at' => $on, 'next_due_date' => $locked->recurrence->advance($on, $locked->interval)])->save();
            $task->setRawAttributes($locked->getAttributes(), true)->unsetRelations();

            return $completion;
        }, 3);
    }

    public function review(TaskCompletion $completion, User $parent, bool $approve, array $memberIds = []): void
    {
        DB::transaction(function () use ($completion, $parent, $approve, $memberIds) {
            $task = Task::lockForUpdate()->findOrFail($completion->task_id);
            $record = TaskCompletion::lockForUpdate()->findOrFail($completion->id);
            if ($record->status !== 'pending') {
                return;
            }
            if ($approve) {
                $ids = $this->members($memberIds);
                if ($record->awards_points && count($ids) === 0) {
                    throw ValidationException::withMessages(['member_ids' => 'Indique qui a réalisé la tâche pour attribuer les points.']);
                }
                $this->allocate($record, $ids);
                $record->forceFill(['member_id' => count($ids) === 1 ? $ids[0] : null])->save();
                $this->credit($record, $task->title);
            }
            $record->forceFill(['status' => $approve ? 'approved' : 'rejected', 'reviewed_by' => $parent->id, 'reviewed_at' => now()])->save();
            if (! $approve) {
                $this->restoreIfLatest($task, $record);
            }
        }, 3);
    }

    public function undo(Task $task, ?User $actor = null): void
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
                $this->goals->syncWeek($member, $last->completed_on);
            }
            $due = $last->due_on;
            $last->delete();
            $locked->forceFill([
                'next_due_date' => $due,
                'last_completed_at' => $locked->completions()->where('status', '!=', 'rejected')->max('completed_on'),
            ])->save();
            $task->setRawAttributes($locked->getAttributes(), true)->unsetRelations();
        }, 3);
    }

    private function members(array $ids): array
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));
        sort($ids);
        if (Member::whereIn('id', $ids)->count() !== count($ids)) {
            throw ValidationException::withMessages(['member_ids' => 'Un participant ne fait plus partie du foyer.']);
        }

        return $ids;
    }

    private function allocate(TaskCompletion $completion, array $ids): void
    {
        $cents = $completion->awards_points ? (int) $completion->effort_points * 100 : 0;
        $values = [];
        foreach ($ids as $index => $id) {
            $values[$id] = ['points' => (intdiv($cents, count($ids)) + ($index < $cents % count($ids) ? 1 : 0)) / 100];
        }
        $completion->participants()->sync($values);
        $completion->unsetRelation('participants');
    }

    private function credit(TaskCompletion $completion, string $title): void
    {
        $members = $completion->participants()->orderBy('members.id')->lockForUpdate()->get();
        foreach ($members as $member) {
            if ((float) $member->pivot->points <= 0) {
                continue;
            }
            PointEntry::firstOrCreate(['task_completion_id' => $completion->id, 'member_id' => $member->id], [
                'task_title' => $title, 'completed_on' => $completion->completed_on,
                'points' => $member->pivot->points, 'is_void' => false,
            ]);
            $this->goals->syncWeek($member, $completion->completed_on);
        }
    }

    private function restoreIfLatest(Task $task, TaskCompletion $completion): void
    {
        $newer = $task->completions()->where('id', '>', $completion->id)->where('status', '!=', 'rejected')->exists();
        if (! $newer) {
            $task->forceFill([
                'next_due_date' => $completion->due_on,
                'last_completed_at' => $task->completions()->where('status', '!=', 'rejected')->max('completed_on'),
            ])->save();
        }
    }
}
