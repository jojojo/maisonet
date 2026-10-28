<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;
use Symfony\Component\HttpFoundation\Response;

class RevokeDeviceToken
{
    use AsAction;

    public function handle(User $user, int $device): void
    {
        $user->tokens()->findOrFail($device)->delete();
    }

    public function asController(Request $request, int $device): Response
    {
        $this->handle($request->user(), $device);

        return response()->noContent();
    }
}
