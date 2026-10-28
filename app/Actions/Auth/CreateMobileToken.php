<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class CreateMobileToken
{
    use AsAction;

    public function handle(array $data): array
    {
        $key = 'mobile-login:'.hash('sha256', Str::lower($data['email']));
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw new HttpResponseException(response()->json(['message' => 'Trop de tentatives. Réessaie dans quelques instants.'], 429)
                ->header('Retry-After', (string) RateLimiter::availableIn($key)));
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

        return [
            'token_type' => 'Bearer', 'access_token' => $token->plainTextToken,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    public function asController(Request $request): array
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:1024'],
            'device_name' => ['required', 'string', 'max:100'],
        ]);

        return $this->handle($data);
    }

    public function jsonResponse(array $token): JsonResponse
    {
        return response()->json($token, 201);
    }
}
