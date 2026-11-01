<?php

namespace App\Actions\Goals;

use App\Models\Member;
use App\Models\MountainGoal;
use App\Models\PointEntry;
use App\Models\StarTransaction;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;

class SyncMountainProgress
{
    use AsAction;

    public function handle(Member $member): MountainGoal
    {
        return DB::transaction(function () use ($member) {
            $member = Member::lockForUpdate()->findOrFail($member->id);
            $goals = MountainGoal::where('member_id', $member->id)->orderBy('sequence')->get();
            $legacy = $goals->where('legacy', true);
            foreach ($legacy as $goal) {
                $points = (float) PointEntry::where('mountain_goal_id', $goal->id)->where('is_void', false)->sum('points');
                $goal->points = $points;
                $this->award($goal, $points >= $goal->target_points);
            }
            $entries = PointEntry::where('member_id', $member->id)->where('is_void', false)
                ->where(fn ($query) => $query->whereNull('mountain_goal_id')->orWhereNotIn('mountain_goal_id', $legacy->modelKeys()))
                ->orderBy('id')->get();
            $cycles = $goals->where('legacy', false)->values();
            $index = 0;
            $cents = 0;
            $sequence = (int) ($legacy->max('sequence') ?? 0);
            $getGoal = function (int $index) use ($cycles, $member, $sequence): MountainGoal {
                if (! isset($cycles[$index])) {
                    $cycles[$index] = MountainGoal::create([
                        'member_id' => $member->id, 'sequence' => $sequence + $index + 1,
                        'target_points' => $member->weekly_target ?? 20, 'reward_stars' => $member->weekly_stars ?? 1,
                    ]);
                }

                return $cycles[$index];
            };
            $current = $getGoal(0);
            foreach ($entries as $entry) {
                $current = $getGoal($index);
                $cents += (int) round((float) $entry->points * 100);
                if ($entry->mountain_goal_id !== $current->id) {
                    $entry->update(['mountain_goal_id' => $current->id]);
                }
                if ($cents >= $current->target_points * 100) {
                    // A whole realization finishes one summit. Its excess is never carried over.
                    $current->points = $cents / 100;
                    $current->completed_at ??= $entry->created_at;
                    $this->award($current, true);
                    $index++;
                    $cents = 0;
                }
            }
            $current = $getGoal($index);
            $current->points = $cents / 100;
            $this->award($current, false);
            foreach ($cycles->slice($index + 1) as $unused) {
                $unused->points = 0;
                $this->award($unused, false);
            }

            return $current;
        }, 3);
    }

    private function award(MountainGoal $goal, bool $complete): void
    {
        if ($complete) {
            $goal->completed_at ??= now();
        } else {
            $goal->completed_at = null;
        }
        if ($goal->isDirty()) {
            $goal->save();
        }
        $transaction = StarTransaction::where('mountain_goal_id', $goal->id)->first();
        $amount = $complete ? $goal->reward_stars : 0;
        if ($transaction) {
            if ($transaction->amount !== $amount) {
                $transaction->update(['amount' => $amount]);
            }
        } elseif ($amount > 0) {
            StarTransaction::create(['member_id' => $goal->member_id, 'mountain_goal_id' => $goal->id, 'type' => 'mountain', 'amount' => $amount]);
        }
    }
}
