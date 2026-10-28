<?php

namespace App\Actions\Accounts;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class DeleteAccount
{
    use AsAction;

    public function handle(User $user): void
    {
        if ($user->is_parent && User::inFamily()->whereKeyNot($user->id)->exists()
            && ! User::inFamily()->where('is_parent', true)->whereKeyNot($user->id)->exists()) {
            throw ValidationException::withMessages(['password' => 'Désigne un autre compte parent avant de supprimer ton compte.']);
        }

        Auth::logout();

        $user->delete();
    }

    public function asController(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $this->handle($request->user());

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
