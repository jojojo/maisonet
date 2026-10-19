<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\TaskCompletion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    public function index(): Response
    {
        $weekStart = today()->startOfWeek()->toDateString();

        return Inertia::render('members/index', [
            'members' => Member::query()
                ->withCount([
                    'tasks',
                    'tasks as open_count' => fn ($q) => $q->where('next_due_date', '<=', today()->toDateString()),
                ])
                ->orderBy('name')
                ->get()
                ->each(fn (Member $m) => $m->setAttribute(
                    'done_this_week',
                    TaskCompletion::where('member_id', $m->id)->where('completed_on', '>=', $weekStart)->count(),
                )),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Member::create($this->validated($request));

        return back();
    }

    public function update(Request $request, Member $member): RedirectResponse
    {
        $member->update($this->validated($request));

        return back();
    }

    public function destroy(Member $member): RedirectResponse
    {
        $member->delete();

        return back();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);
    }
}
