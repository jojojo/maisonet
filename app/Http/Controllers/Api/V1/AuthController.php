<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\Room;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:1024'],
            'device_name' => ['required', 'string', 'max:100'],
        ]);
        $key = 'mobile-login:'.hash('sha256', Str::lower($data['email']));
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['message' => 'Trop de tentatives. Réessaie dans quelques instants.'], 429)
                ->header('Retry-After', (string) RateLimiter::availableIn($key));
        }
        $user = User::where('email', $data['email'])->first();
        // Always check a hash, including for unknown addresses.
        $valid = Hash::check($data['password'], $user?->password ?? '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        if (! $user || ! $valid) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }
        RateLimiter::clear($key);
        $expiresAt = now()->addDays(30);
        $token = $user->createToken($data['device_name'], ['mobile'], $expiresAt);

        return response()->json([
            'token_type' => 'Bearer', 'access_token' => $token->plainTextToken,
            'expires_at' => $expiresAt->toIso8601String(),
        ], 201);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['data' => [
            'id' => $user->id, 'name' => $user->name, 'email' => $user->email,
            'is_parent' => $user->is_parent, 'member_id' => $user->member_id,
            'family' => $user->family()->firstOrFail(['id', 'name']),
            'members' => Member::orderBy('name')->get(['id', 'name', 'color']),
            'rooms' => Room::orderBy('name')->get(['id', 'name', 'icon']),
        ]]);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function devices(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->tokens()->latest('id')->get([
            'id', 'name', 'last_used_at', 'expires_at', 'created_at',
        ])]);
    }

    public function revoke(Request $request, int $device): Response
    {
        $request->user()->tokens()->findOrFail($device)->delete();

        return response()->noContent();
    }
}
