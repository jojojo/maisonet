<?php

namespace App\Actions\Families;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateParentAccess
{
    use AsAction;

    public function handle(User $user, bool $isParent): void
    {
        DB::transaction(function () use ($user, $isParent) {
            $parents = User::inFamily()->where('is_parent', true)->orderBy('id')->lockForUpdate()->get();
            $account = User::inFamily()->lockForUpdate()->findOrFail($user->id);
            if (! $isParent && $account->is_parent && $parents->count() <= 1) {
                throw ValidationException::withMessages(['parent_access' => 'Il faut conserver au moins un compte parent.']);
            }
            $account->forceFill(['is_parent' => $isParent])->save();
        }, 3);
    }

    public function asController(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('manage-rewards');
        $data = $request->validate(['is_parent' => ['required', 'boolean']]);
        $this->handle($user, (bool) $data['is_parent']);

        return back()->with('success', 'Accès parent mis à jour.');
    }
}
