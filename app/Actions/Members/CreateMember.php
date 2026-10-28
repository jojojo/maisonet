<?php

namespace App\Actions\Members;

use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Lorisleiva\Actions\Concerns\AsAction;

class CreateMember
{
    use AsAction;

    public function handle(array $data): Member
    {
        return Member::create($data);
    }

    public function asController(Request $request): RedirectResponse
    {
        Gate::authorize('manage-goals');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);
        $this->handle($data);

        return back();
    }
}
