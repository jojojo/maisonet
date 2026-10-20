<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\Member;
use App\Models\Room;
use App\Models\User;
use App\Support\FamilyContext;
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
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'family_action' => ['sometimes', 'required', 'in:create,join'],
            'family_name' => ['nullable', 'string', 'max:120'],
            'family_code' => ['required_if:family_action,join', 'nullable', 'string', 'max:100'],
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = DB::transaction(function () use ($data) {
            $create = ($data['family_action'] ?? 'create') === 'create';
            if ($create) {
                $family = Family::create(['name' => ($data['family_name'] ?? null) ?: mb_substr('Famille de '.$data['name'], 0, 120)]);
            } else {
                $code = Family::normalizeCode($data['family_code']);
                $family = Family::where('invitation_code_hash', hash('sha256', $code))->lockForUpdate()->first();
                if (! $family || ! User::where('family_id', $family->id)->where('is_parent', true)->exists()) {
                    throw ValidationException::withMessages(['family_code' => 'Ce code famille est incorrect ou a été renouvelé. Demande le nouveau code à un parent.']);
                }
            }
            $user = new User(['name' => $data['name'], 'email' => $data['email'], 'password' => Hash::make($data['password'])]);
            $user->forceFill(['family_id' => $family->id, 'is_parent' => $create])->save();
            if ($create) {
                app(FamilyContext::class)->run($family->id, function () use ($user) {
                    foreach ([['Cuisine', '🍳'], ['Salon', '🛋️'], ['Salle de bain', '🛁'], ['Chambre', '🛏️'], ['Buanderie', '🧺']] as [$name, $icon]) {
                        Room::create(compact('name', 'icon'));
                    }
                    $member = Member::create(['name' => mb_substr($user->name, 0, 60), 'color' => '#14b8a6']);
                    $user->forceFill(['member_id' => $member->id])->save();
                });
            }

            return $user;
        }, 3);

        event(new Registered($user));

        Auth::login($user);

        return to_route('dashboard');
    }
}
