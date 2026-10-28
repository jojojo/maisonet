<?php

namespace App\Actions\Goals;

use App\Models\Member;
use App\Models\StarTransaction;
use App\Models\WeeklyGoal;
use App\Services\GoalService;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;

class SyncWeeklyGoal
{
    use AsAction;

    public function __construct(private GoalService $goals) {}

    public function handle(Member $member, ?CarbonInterface $day = null): WeeklyGoal
    {
        return DB::transaction(function () use ($member, $day) {
            $member = Member::lockForUpdate()->findOrFail($member->id);
            $week = $this->goals->week($day);
            $goal = WeeklyGoal::firstOrCreate(['member_id' => $member->id, 'week_start' => $week->toDateString()], [
                'target_points' => $member->weekly_target ?? 20, 'reward_stars' => $member->weekly_stars ?? 1,
            ]);
            $amount = $this->goals->points($member, $week) >= $goal->target_points ? $goal->reward_stars : 0;
            $transaction = StarTransaction::where('weekly_goal_id', $goal->id)->where('type', 'goal')->first();
            if ($amount > 0 || $transaction) {
                StarTransaction::updateOrCreate(['weekly_goal_id' => $goal->id, 'type' => 'goal'], [
                    'member_id' => $member->id, 'amount' => $amount,
                ]);
            }

            return $goal;
        }, 3);
    }
}
