<?php

namespace App\Actions\Goals;

use App\Models\Member;
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
            SyncMountainProgress::run($member);
            $member->forceFill(['weekly_target' => $data['target_points'], 'weekly_stars' => $data['reward_stars']])->save();
        }, 3);
    }

    public function asController(Request $request, Member $member): RedirectResponse
    {
        Gate::authorize('manage-goals');
        $data = $request->validate([
            'target_points' => ['required', 'integer', 'min:1', 'max:1000'],
            'reward_stars' => ['required', 'integer', 'min:1', 'max:10'],
        ]);
        $this->handle($member, $data);

        return back()->with('success', 'Les réglages sont enregistrés pour les prochaines ascensions.');
    }
}
