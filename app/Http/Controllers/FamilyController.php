<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FamilyController extends Controller
{
    public function index(Request $request): Response
    {
        $family = $request->user()->family;
        $parent = $request->user()->is_parent;

        return Inertia::render('family/index', [
            'family' => $family->only(['id', 'name']), 'canManage' => $parent,
            'invitationCode' => $parent ? $family->invitation_code : null,
            'accounts' => $parent ? User::inFamily()->orderBy('name')->get(['id', 'name', 'email', 'member_id', 'is_parent']) : [],
        ]);
    }
}
