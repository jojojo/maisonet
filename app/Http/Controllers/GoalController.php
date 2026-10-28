<?php

namespace App\Http\Controllers;

use App\Actions\Goals\SyncWeeklyGoal;
use App\Models\Member;
use App\Models\PointEntry;
use App\Models\Reward;
use App\Models\RewardRequest;
use App\Models\StarTransaction;
use App\Models\TaskCompletion;
use App\Models\User;
use App\Services\GoalService;
use App\Support\FamilyContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GoalController extends Controller
{
    public function index(Request $request, GoalService $goals): Response
    {
        $data = $request->validate(['member_id' => ['nullable', 'integer', FamilyContext::exists('members')]]);
        $parent = (bool) $request->user()->is_parent;
        $all = Member::with(['targetReward' => fn ($query) => $query->where('is_active', true)])->orderBy('name')->get();
        $selectedId = isset($data['member_id']) ? (int) $data['member_id'] : ($request->user()->member_id ?? ($parent ? $all->first()?->id : null));
        abort_if(! $parent && $selectedId !== $request->user()->member_id, 403);
        $week = $goals->week();
        $summaries = $all->map(function (Member $member) use ($goals, $week) {
            $goal = SyncWeeklyGoal::run($member, $week);
            $points = $goals->points($member, $week);
            $pending = DB::table('completion_participants')->join('task_completions', 'task_completions.id', '=', 'completion_participants.task_completion_id')
                ->where('task_completions.family_id', $member->family_id)->where('completion_participants.member_id', $member->id)->where('status', 'pending')
                ->whereBetween('completed_on', [$week->toDateString(), $week->addDays(6)->toDateString()])->sum('points');

            return [
                'id' => $member->id, 'name' => $member->name, 'color' => $member->color,
                'weekly_target' => $goal->target_points, 'weekly_stars' => $goal->reward_stars,
                'week_points' => $points, 'pending_points' => round((float) $pending, 2),
                'total_points' => $goals->points($member), 'star_balance' => $goals->balance($member),
                'progress' => min(100, round($points / $goal->target_points * 100)),
                'achieved' => $points >= $goal->target_points, 'target_reward' => $member->targetReward,
            ];
        });
        $selected = $all->firstWhere('id', $selectedId);

        return Inertia::render('goals/index', [
            'canManage' => $parent,
            'members' => ($parent ? $summaries : $summaries->where('id', $selectedId))->values(),
            'selectedMemberId' => $selectedId,
            'weekStart' => $week->toDateString(), 'weekEnd' => $week->addDays(6)->toDateString(),
            'familyProgress' => [
                'points' => round($summaries->sum('week_points'), 2),
                'target' => $summaries->sum('weekly_target'),
            ],
            'accounts' => $parent ? User::inFamily()->orderBy('name')->get(['id', 'name', 'email', 'member_id', 'is_parent']) : [],
            'rewards' => Reward::where('is_active', true)->orderBy('star_cost')->orderBy('title')->get(),
            'pendingCompletions' => $parent ? TaskCompletion::where('status', 'pending')->with(['task.room', 'participants', 'submitter:id,name'])->oldest('completed_on')->oldest('id')->limit(100)->get() : [],
            'pendingCount' => $parent ? TaskCompletion::where('status', 'pending')->count() : 0,
            'requests' => RewardRequest::with('member')->when(! $parent, fn ($query) => $query->where('member_id', $selectedId ?? 0))
                ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END")->latest('id')->limit(50)->get(),
            'pointHistory' => $selected ? PointEntry::where('member_id', $selected->id)->latest('completed_on')->latest('id')->limit(20)->get() : [],
            'starHistory' => $selected ? StarTransaction::where('member_id', $selected->id)->with(['weeklyGoal', 'rewardRequest'])->latest('updated_at')->latest('id')->limit(20)->get() : [],
        ]);
    }
}
