<?php

namespace App\Actions\Members;

use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateMember
{
    use AsAction;

    public function handle(Member $member, array $data): Member
    {
        $member->update($data);

        return $member;
    }

    public function asController(Request $request, Member $member): RedirectResponse
    {
        Gate::authorize('manage-goals');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);
        $this->handle($member, $data);

        return back();
    }
}
