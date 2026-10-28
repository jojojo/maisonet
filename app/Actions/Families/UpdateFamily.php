<?php

namespace App\Actions\Families;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateFamily
{
    use AsAction;

    public function handle(User $actor, array $data): void
    {
        $actor->family->update($data);
    }

    public function asController(Request $request): RedirectResponse
    {
        abort_unless($request->user()->is_parent, 403);
        $data = $request->validate(['name' => ['required', 'string', 'max:120']]);
        $this->handle($request->user(), $data);

        return back()->with('success', 'Le nom de la famille est à jour.');
    }
}
