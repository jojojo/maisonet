<?php

namespace App\Actions\Members;

use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class DeleteMember
{
    use AsAction;

    public function handle(Member $member): void
    {
        DB::transaction(function () use ($member) {
            Member::whereKey($member->id)->lockForUpdate()->firstOrFail();
            foreach (['completion_participants', 'point_entries', 'star_transactions', 'reward_requests', 'users'] as $table) {
                if (DB::table($table)->where('member_id', $member->id)->exists()) {
                    throw ValidationException::withMessages(['member' => 'Ce membre possède un compte lié ou un historique de progression. Sa suppression n’est pas possible.']);
                }
            }
            DB::table('weekly_goals')->where('member_id', $member->id)->delete();
            $member->delete();
        }, 3);
    }

    public function asController(Member $member): RedirectResponse
    {
        Gate::authorize('manage-goals');
        $this->handle($member);

        return back();
    }
}
