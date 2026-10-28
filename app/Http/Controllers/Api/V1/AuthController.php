<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
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

    public function devices(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->tokens()->latest('id')->get([
            'id', 'name', 'last_used_at', 'expires_at', 'created_at',
        ])]);
    }
}
