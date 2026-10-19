<?php

namespace App\Services;

use App\Models\Member;
use App\Models\PointEntry;
use App\Models\StarTransaction;
use App\Models\WeeklyGoal;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class GoalService
{
    public function week(?CarbonInterface $day = null): CarbonImmutable
    {
        return CarbonImmutable::instance($day ?? today())->startOfWeek(CarbonInterface::MONDAY)->startOfDay();
    }

    public function points(Member $member, ?CarbonInterface $week = null): float
    {
        $query = PointEntry::where('member_id', $member->id)->where('is_void', false);
        if ($week) {
            $start = $this->week($week);
            $query->whereBetween('completed_on', [$start->toDateString(), $start->addDays(6)->toDateString()]);
        }

        return round((float) $query->sum('points'), 2);
    }

    public function balance(Member $member): int
    {
        return (int) StarTransaction::where('member_id', $member->id)->sum('amount');
    }

    // Call while holding the member row lock when modifying points or goal settings.
    public function syncWeek(Member $member, ?CarbonInterface $day = null): WeeklyGoal
    {
        $week = $this->week($day);
        $goal = WeeklyGoal::firstOrCreate(['member_id' => $member->id, 'week_start' => $week->toDateString()], [
            'target_points' => $member->weekly_target ?? 20, 'reward_stars' => $member->weekly_stars ?? 1,
        ]);
        $amount = $this->points($member, $week) >= $goal->target_points ? $goal->reward_stars : 0;
        $transaction = StarTransaction::where('weekly_goal_id', $goal->id)->where('type', 'goal')->first();
        if ($amount > 0 || $transaction) {
            StarTransaction::updateOrCreate(['weekly_goal_id' => $goal->id, 'type' => 'goal'], [
                'member_id' => $member->id, 'amount' => $amount,
            ]);
        }

        return $goal;
    }
}
