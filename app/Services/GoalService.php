<?php

namespace App\Services;

use App\Models\Member;
use App\Models\PointEntry;
use App\Models\StarTransaction;
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
}
