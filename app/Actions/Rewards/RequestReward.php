<?php

namespace App\Actions\Rewards;

use App\Models\Member;
use App\Models\Reward;
use App\Models\RewardRequest;
use App\Models\StarTransaction;
use App\Models\User;
use App\Services\GoalService;
use App\Support\FamilyContext;
use App\Support\MemberAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class RequestReward
{
    use AsAction;

    public function __construct(private GoalService $goals) {}

    public function handle(Member $member, Reward $reward, User $actor): RewardRequest
    {
        return DB::transaction(function () use ($member, $reward, $actor) {
            $member = Member::lockForUpdate()->findOrFail($member->id);
            $reward = Reward::lockForUpdate()->findOrFail($reward->id);
            if (! $reward->is_active) {
                throw ValidationException::withMessages(['reward_id' => 'Cette récompense n’est plus disponible.']);
            }
            if (RewardRequest::where('member_id', $member->id)->where('reward_id', $reward->id)->whereIn('status', ['pending', 'approved'])->exists()) {
                throw ValidationException::withMessages(['reward_id' => 'Une demande est déjà en cours pour cette récompense.']);
            }
            if ($this->goals->balance($member) < $reward->star_cost) {
                throw ValidationException::withMessages(['reward_id' => 'Il manque encore des étoiles pour cette récompense.']);
            }
            $record = RewardRequest::create([
                'member_id' => $member->id, 'reward_id' => $reward->id, 'requested_by' => $actor->id,
                'title' => $reward->title, 'icon' => $reward->icon, 'star_cost' => $reward->star_cost,
                'audience' => $reward->audience, 'status' => 'pending',
            ]);
            StarTransaction::create(['member_id' => $member->id, 'reward_request_id' => $record->id, 'type' => 'redemption', 'amount' => -$record->star_cost]);

            return $record;
        }, 3);
    }

    public function asController(Request $request): RedirectResponse
    {
        $data = $request->validate(['member_id' => ['required', 'integer', FamilyContext::exists('members')], 'reward_id' => ['required', 'integer', FamilyContext::exists('rewards')]]);
        $this->handle(MemberAccess::forUser($request->user(), $data['member_id']), Reward::findOrFail($data['reward_id']), $request->user());

        return back()->with('success', 'Demande envoyée aux parents. Les étoiles sont réservées.');
    }
}
