<?php

namespace App\Actions\Goals;

use App\Models\User;
use App\Support\FamilyContext;
use App\Support\MemberAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;

class SelectRewardTarget
{
    use AsAction;

    public function handle(User $actor, int $memberId, ?int $rewardId): void
    {
        $member = MemberAccess::forUser($actor, $memberId);
        $member->forceFill(['target_reward_id' => $rewardId])->save();
    }

    public function asController(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'integer', FamilyContext::exists('members')],
            'reward_id' => ['nullable', 'integer', FamilyContext::exists('rewards')->where('is_active', true)],
        ]);
        $this->handle($request->user(), (int) $data['member_id'], $data['reward_id'] ?? null);

        return back()->with('success', 'Récompense à viser mise à jour.');
    }
}
