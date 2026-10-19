<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\PointEntry;
use App\Models\Reward;
use App\Models\RewardRequest;
use App\Models\StarTransaction;
use App\Models\TaskCompletion;
use App\Models\User;
use App\Models\WeeklyGoal;
use App\Services\CompletionService;
use App\Services\GoalService;
use App\Services\RewardRequestService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class GoalController extends Controller
{
    public function index(Request $request, GoalService $goals): Response
    {
        $data = $request->validate(['member_id' => ['nullable', 'integer', 'exists:members,id']]);
        $parent = (bool) $request->user()->is_parent;
        $all = Member::with(['targetReward' => fn ($query) => $query->where('is_active', true)])->orderBy('name')->get();
        $selectedId = isset($data['member_id']) ? (int) $data['member_id'] : ($request->user()->member_id ?? ($parent ? $all->first()?->id : null));
        abort_if(! $parent && $selectedId !== $request->user()->member_id, 403);
        $week = $goals->week();
        $summaries = $all->map(function (Member $member) use ($goals, $week) {
            $goal = DB::transaction(function () use ($member, $goals, $week) {
                Member::whereKey($member->id)->lockForUpdate()->firstOrFail();

                return $goals->syncWeek($member, $week);
            }, 3);
            $points = $goals->points($member, $week);
            $pending = DB::table('completion_participants')->join('task_completions', 'task_completions.id', '=', 'completion_participants.task_completion_id')
                ->where('completion_participants.member_id', $member->id)->where('status', 'pending')
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
            'accounts' => $parent ? User::orderBy('name')->get(['id', 'name', 'email', 'member_id', 'is_parent']) : [],
            'rewards' => Reward::where('is_active', true)->orderBy('star_cost')->orderBy('title')->get(),
            'pendingCompletions' => $parent ? TaskCompletion::where('status', 'pending')->with(['task.room', 'participants', 'submitter:id,name'])->oldest('completed_on')->oldest('id')->limit(100)->get() : [],
            'pendingCount' => $parent ? TaskCompletion::where('status', 'pending')->count() : 0,
            'requests' => RewardRequest::with('member')->when(! $parent, fn ($query) => $query->where('member_id', $selectedId ?? 0))
                ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END")->latest('id')->limit(50)->get(),
            'pointHistory' => $selected ? PointEntry::where('member_id', $selected->id)->latest('completed_on')->latest('id')->limit(20)->get() : [],
            'starHistory' => $selected ? StarTransaction::where('member_id', $selected->id)->with(['weeklyGoal', 'rewardRequest'])->latest('updated_at')->latest('id')->limit(20)->get() : [],
        ]);
    }

    public function updateSettings(Request $request, Member $member, GoalService $goals): RedirectResponse
    {
        Gate::authorize('manage-goals');
        $data = $request->validate([
            'weekly_target' => ['required', 'integer', 'min:1', 'max:1000'],
            'weekly_stars' => ['required', 'integer', 'min:1', 'max:10'],
        ]);
        DB::transaction(function () use ($member, $data, $goals) {
            $member = Member::lockForUpdate()->findOrFail($member->id);
            $member->forceFill($data)->save();
            $goal = WeeklyGoal::firstOrCreate(['member_id' => $member->id, 'week_start' => $goals->week()->toDateString()], [
                'target_points' => $data['weekly_target'], 'reward_stars' => $data['weekly_stars'],
            ]);
            $goal->update(['target_points' => $data['weekly_target'], 'reward_stars' => $data['weekly_stars']]);
            $goals->syncWeek($member);
        }, 3);

        return back()->with('success', 'Objectif ajusté pour cette semaine et les suivantes.');
    }

    public function linkAccount(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('manage-goals');
        $data = $request->validate(['member_id' => ['nullable', 'integer', 'exists:members,id']]);
        DB::transaction(function () use ($user, $data) {
            $id = $data['member_id'] ?? null;
            if ($id !== null) {
                Member::whereKey($id)->lockForUpdate()->firstOrFail();
            }
            $account = User::lockForUpdate()->findOrFail($user->id);
            if ($id !== null && User::where('member_id', $id)->whereKeyNot($user->id)->exists()) {
                throw ValidationException::withMessages(['member_id' => 'Ce membre est déjà relié à un autre compte.']);
            }
            $account->forceFill(['member_id' => $id])->save();
        }, 3);

        return back()->with('success', 'Compte relié au membre de la famille.');
    }

    public function target(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'integer', 'exists:members,id'],
            'reward_id' => ['nullable', 'integer', Rule::exists('rewards', 'id')->where('is_active', true)],
        ]);
        $member = $this->member($request, $data['member_id']);
        $member->forceFill(['target_reward_id' => $data['reward_id'] ?? null])->save();

        return back()->with('success', 'Récompense à viser mise à jour.');
    }

    public function reviewCompletion(Request $request, TaskCompletion $completion, CompletionService $service): RedirectResponse
    {
        Gate::authorize('manage-goals');
        $data = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'member_ids' => ['sometimes', 'array'],
            'member_ids.*' => ['required', 'integer', 'distinct', 'exists:members,id'],
        ]);
        $service->review($completion, $request->user(), $data['decision'] === 'approve', $data['member_ids'] ?? []);

        return back()->with('success', $data['decision'] === 'approve' ? 'Mission validée : les points et les étoiles sont à jour.' : 'Mission refusée. Elle est rouverte si aucune réalisation plus récente ne la remplace.');
    }

    public function requestReward(Request $request, RewardRequestService $service): RedirectResponse
    {
        $data = $request->validate(['member_id' => ['required', 'integer', 'exists:members,id'], 'reward_id' => ['required', 'integer', 'exists:rewards,id']]);
        $service->request($this->member($request, $data['member_id']), Reward::findOrFail($data['reward_id']), $request->user());

        return back()->with('success', 'Demande envoyée aux parents. Les étoiles sont réservées.');
    }

    public function reviewRequest(Request $request, RewardRequest $rewardRequest, RewardRequestService $service): RedirectResponse
    {
        $data = $request->validate(['action' => ['required', 'in:approve,reject,fulfil,cancel']]);
        if ($data['action'] === 'cancel') {
            $this->member($request, $rewardRequest->member_id);
        } else {
            Gate::authorize('manage-goals');
        }
        $service->review($rewardRequest, $request->user(), $data['action']);

        return back()->with('success', 'Demande mise à jour. Les étoiles sont rendues en cas de refus ou d’annulation.');
    }

    private function member(Request $request, int $id): Member
    {
        abort_if(! $request->user()->is_parent && $request->user()->member_id !== $id, 403);

        return Member::findOrFail($id);
    }
}
