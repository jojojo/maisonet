<?php

namespace App\Services;

use App\Models\Member;
use App\Models\Reward;
use App\Models\RewardRequest;
use App\Models\StarTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RewardRequestService
{
    public function __construct(private GoalService $goals) {}

    public function request(Member $member, Reward $reward, User $actor): RewardRequest
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

    public function review(RewardRequest $record, User $actor, string $action): void
    {
        DB::transaction(function () use ($record, $actor, $action) {
            $member = Member::lockForUpdate()->findOrFail($record->member_id);
            $record = RewardRequest::lockForUpdate()->findOrFail($record->id);
            if ($action === 'approve' && $record->status === 'pending') {
                $record->forceFill(['status' => 'approved', 'reviewed_by' => $actor->id, 'reviewed_at' => now()])->save();
            } elseif ($action === 'fulfil' && $record->status === 'approved') {
                $record->forceFill(['status' => 'fulfilled', 'fulfilled_at' => now()])->save();
            } elseif (in_array($action, ['reject', 'cancel']) && in_array($record->status, $action === 'cancel' ? ['pending'] : ['pending', 'approved'])) {
                $record->forceFill(['status' => $action === 'cancel' ? 'cancelled' : 'rejected', 'reviewed_by' => $actor->id, 'reviewed_at' => now()])->save();
                StarTransaction::firstOrCreate(['reward_request_id' => $record->id, 'type' => 'refund'], [
                    'member_id' => $member->id, 'amount' => $record->star_cost,
                ]);
            }
        }, 3);
    }
}
