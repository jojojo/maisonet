<?php

namespace App\Http\Controllers;

use App\Models\Reward;
use App\Models\User;
use App\Support\RewardCatalogue;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RewardController extends Controller
{
    public function index(): Response
    {
        $canManage = Gate::allows('manage-rewards');
        $rewards = Reward::orderBy('star_cost')->orderBy('title')->get();
        $saved = $rewards->whereNotNull('template_key')->keyBy('template_key');

        return Inertia::render('rewards/index', [
            'canManage' => $canManage,
            'rewards' => ($canManage ? $rewards : $rewards->where('is_active', true))->values(),
            'templates' => $canManage ? collect(RewardCatalogue::templates())->map(fn ($template) => [
                ...$template,
                'reward' => $saved->get($template['template_key']),
            ]) : [],
            'categories' => config('reward-templates.categories'),
            'accounts' => $canManage ? User::inFamily()->orderBy('name')->get(['id', 'name', 'email', 'is_parent']) : [],
        ]);
    }
}
