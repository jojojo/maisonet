<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;
use Symfony\Component\HttpFoundation\Response;

class RevokeCurrentToken
{
    use AsAction;

    public function handle(User $user): void
    {
        $user->currentAccessToken()->delete();
    }

    public function asController(Request $request): Response
    {
        $this->handle($request->user());

        return response()->noContent();
    }
}
