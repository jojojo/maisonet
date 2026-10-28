<?php

namespace App\Actions\Auth;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Lorisleiva\Actions\Concerns\AsAction;

class SendPasswordResetLink
{
    use AsAction;

    public function handle(string $email): void
    {
        Password::sendResetLink(
            ['email' => $email]
        );
    }

    public function asController(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $this->handle((string) $request->email);

        return back()->with('status', __('A reset link will be sent if the account exists.'));
    }
}
