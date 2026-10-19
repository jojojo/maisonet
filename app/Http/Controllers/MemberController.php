<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\TaskCompletion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
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
                    TaskCompletion::where('status', '!=', 'rejected')->where(fn ($q) => $q->where('member_id', $m->id)->orWhereHas('participants', fn ($q) => $q->where('members.id', $m->id)))->where('completed_on', '>=', $weekStart)->count(),
                )),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('manage-goals');
        Member::create($this->validated($request));

        return back();
    }

    public function update(Request $request, Member $member): RedirectResponse
    {
        Gate::authorize('manage-goals');
        $member->update($this->validated($request));

        return back();
    }

    public function destroy(Member $member): RedirectResponse
    {
        Gate::authorize('manage-goals');
        DB::transaction(function () use ($member) {
            Member::whereKey($member->id)->lockForUpdate()->firstOrFail();
            foreach (['completion_participants', 'point_entries', 'star_transactions', 'reward_requests', 'users'] as $table) {
                if (DB::table($table)->where('member_id', $member->id)->exists()) {
                    throw ValidationException::withMessages(['member' => 'Ce membre possède un compte lié ou un historique de progression. Sa suppression n’est pas possible.']);
                }
            }
            DB::table('weekly_goals')->where('member_id', $member->id)->delete();
            $member->delete();
        }, 3);

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
