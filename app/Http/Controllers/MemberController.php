<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\TaskCompletion;
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
                    TaskCompletion::whereNotIn('status', ['rejected', 'skipped'])->where(fn ($q) => $q->where('member_id', $m->id)->orWhereHas('participants', fn ($q) => $q->where('members.id', $m->id)))->where('completed_on', '>=', $weekStart)->count(),
                )),
        ]);
    }
}
