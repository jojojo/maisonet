<?php

namespace App\Actions\Families;

use App\Models\Member;
use App\Models\User;
use App\Support\FamilyContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class LinkMemberAccount
{
    use AsAction;

    public function handle(User $user, array $data): void
    {
        DB::transaction(function () use ($user, $data) {
            $id = $data['member_id'] ?? null;
            if ($id !== null) {
                Member::whereKey($id)->lockForUpdate()->firstOrFail();
            }
            $account = User::inFamily()->lockForUpdate()->findOrFail($user->id);
            if ($id !== null && User::inFamily()->where('member_id', $id)->whereKeyNot($user->id)->exists()) {
                throw ValidationException::withMessages(['member_id' => 'Ce membre est déjà relié à un autre compte.']);
            }
            $account->forceFill(['member_id' => $id])->save();
        }, 3);
    }

    public function asController(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('manage-goals');
        $data = $request->validate(['member_id' => ['nullable', 'integer', FamilyContext::exists('members')]]);
        $this->handle($user, $data);

        return back()->with('success', 'Compte relié au membre de la famille.');
    }
}
