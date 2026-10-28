<?php

namespace App\Actions\Accounts;

use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateProfile
{
    use AsAction;

    public function handle(User $user, array $data): void
    {
        $user->fill($data);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();
    }

    public function asController(ProfileUpdateRequest $request): RedirectResponse
    {
        $this->handle($request->user(), $request->validated());

        return to_route('profile.edit');
    }
}
