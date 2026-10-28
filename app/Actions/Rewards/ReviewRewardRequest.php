<?php

namespace App\Actions\Rewards;

use App\Models\Member;
use App\Models\RewardRequest;
use App\Models\StarTransaction;
use App\Models\User;
use App\Support\MemberAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Lorisleiva\Actions\Concerns\AsAction;

class ReviewRewardRequest
{
    use AsAction;

    public function handle(RewardRequest $record, User $actor, string $action): void
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

    public function asController(Request $request, RewardRequest $rewardRequest): RedirectResponse
    {
        $data = $request->validate(['action' => ['required', 'in:approve,reject,fulfil,cancel']]);
        if ($data['action'] === 'cancel') {
            MemberAccess::forUser($request->user(), $rewardRequest->member_id);
        } else {
            Gate::authorize('manage-goals');
        }
        $this->handle($rewardRequest, $request->user(), $data['action']);

        return back()->with('success', 'Demande mise à jour. Les étoiles sont rendues en cas de refus ou d’annulation.');
    }
}
