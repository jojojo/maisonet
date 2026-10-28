<?php

namespace App\Actions\Goals;

use App\Models\Member;
use App\Models\WeeklyGoal;
use App\Services\GoalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateGoalSettings
{
    use AsAction;

    public function handle(Member $member, array $data): void
    {
        DB::transaction(function () use ($member, $data) {
            $member = Member::lockForUpdate()->findOrFail($member->id);
            $member->forceFill($data)->save();
            $goal = WeeklyGoal::firstOrCreate(['member_id' => $member->id, 'week_start' => app(GoalService::class)->week()->toDateString()], [
                'target_points' => $data['weekly_target'], 'reward_stars' => $data['weekly_stars'],
            ]);
            $goal->update(['target_points' => $data['weekly_target'], 'reward_stars' => $data['weekly_stars']]);
            SyncWeeklyGoal::run($member);
        }, 3);
    }

    public function asController(Request $request, Member $member): RedirectResponse
    {
        Gate::authorize('manage-goals');
        $data = $request->validate([
            'weekly_target' => ['required', 'integer', 'min:1', 'max:1000'],
            'weekly_stars' => ['required', 'integer', 'min:1', 'max:10'],
        ]);
        $this->handle($member, $data);

        return back()->with('success', 'Objectif ajusté pour cette semaine et les suivantes.');
    }
}
