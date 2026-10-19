<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register', [
            'requiresRegistrationCode' => filled(config('auth.registration_code')),
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'registration_code' => filled(config('auth.registration_code'))
                ? ['required', 'string', function ($attribute, $value, $fail) {
                    if (! hash_equals((string) config('auth.registration_code'), $value)) {
                        $fail('Le code d’inscription familial est incorrect.');
                    }
                }]
                : ['nullable', 'string'],
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = DB::transaction(function () use ($request) {
            $firstAccount = User::orderBy('id')->lockForUpdate()->first() === null;
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);
            $user->forceFill(['is_parent' => $firstAccount])->save();

            return $user;
        }, 3);

        event(new Registered($user));

        Auth::login($user);

        return to_route('dashboard');
    }
}
