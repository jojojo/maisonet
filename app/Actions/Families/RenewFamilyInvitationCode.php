<?php

namespace App\Actions\Families;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;

class RenewFamilyInvitationCode
{
    use AsAction;

    public function handle(User $actor): void
    {
        DB::transaction(function () use ($actor) {
            $family = $actor->family()->lockForUpdate()->firstOrFail();
            $family->replaceInvitationCode();
            $family->save();
        }, 3);
    }

    public function asController(Request $request): RedirectResponse
    {
        abort_unless($request->user()->is_parent, 403);
        $this->handle($request->user());

        return back()->with('success', 'Nouveau code créé. L’ancien code ne permet plus de rejoindre votre famille.');
    }
}
