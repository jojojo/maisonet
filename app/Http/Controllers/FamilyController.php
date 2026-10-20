<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    public function update(Request $request): RedirectResponse
    {
        abort_unless($request->user()->is_parent, 403);
        $data = $request->validate(['name' => ['required', 'string', 'max:120']]);
        $request->user()->family->update($data);

        return back()->with('success', 'Le nom de la famille est à jour.');
    }

    public function renewCode(Request $request): RedirectResponse
    {
        abort_unless($request->user()->is_parent, 403);
        DB::transaction(function () use ($request) {
            $family = $request->user()->family()->lockForUpdate()->firstOrFail();
            $family->replaceInvitationCode();
            $family->save();
        }, 3);

        return back()->with('success', 'Nouveau code créé. L’ancien code ne permet plus de rejoindre votre famille.');
    }
}
