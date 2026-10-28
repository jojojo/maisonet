<?php

namespace App\Actions\Auth;

use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Contracts\Session\Session;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Lorisleiva\Actions\Concerns\AsAction;

class Login
{
    use AsAction;

    public function handle(array $credentials, bool $remember, string $key, Session $session, Request $request): void
    {
        AuthenticateUser::run($credentials, $remember, $key, $request);
        $session->regenerate();
    }

    public function asController(LoginRequest $request): RedirectResponse
    {
        $key = Str::transliterate(Str::lower($request->string('email')).'|'.$request->ip());
        $this->handle($request->only('email', 'password'), $request->boolean('remember'), $key, $request->session(), $request);

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
