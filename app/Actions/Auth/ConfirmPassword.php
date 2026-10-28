<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Contracts\Session\Session;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class ConfirmPassword
{
    use AsAction;

    public function handle(User $user, string $password, Session $session): void
    {
        if (! Auth::guard('web')->validate([
            'email' => $user->email,
            'password' => $password,
        ])) {
            throw ValidationException::withMessages([
                'password' => __('auth.password'),
            ]);
        }

        $session->put('auth.password_confirmed_at', time());

    }

    public function asController(Request $request): RedirectResponse
    {
        $this->handle($request->user(), (string) $request->password, $request->session());

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
