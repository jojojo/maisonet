<?php

namespace App\Http\Controllers;

use App\Models\Reward;
use App\Models\User;
use App\Support\RewardCatalogue;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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
            'accounts' => $canManage ? User::orderBy('name')->get(['id', 'name', 'email', 'is_parent']) : [],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('manage-rewards');
        $templates = collect(RewardCatalogue::templates())->keyBy('template_key');
        $data = $request->validate([
            'template_key' => ['nullable', 'string', Rule::in($templates->keys()->all())],
            'title' => ['required_without:template_key', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'icon' => ['sometimes', 'required', 'string', 'max:16'],
            'category' => ['required_without:template_key', Rule::in(array_column(config('reward-templates.categories'), 'key'))],
            'star_cost' => ['required_without:template_key', 'integer', 'min:1', 'max:100'],
            'audience' => ['required_without:template_key', 'in:individual,family'],
            'is_active' => ['required', 'boolean'],
        ]);

        if (! empty($data['template_key'])) {
            $template = $templates[$data['template_key']];
            // Activating again never overwrites an already personalised reward.
            $reward = Reward::firstOrCreate(['template_key' => $data['template_key']], [...$template, ...$data]);
            if (! $reward->wasRecentlyCreated) {
                $reward->update(['is_active' => $data['is_active']]);
            }
        } else {
            Reward::create($data);
        }

        return back()->with('success', $data['is_active'] ? 'Récompense activée pour la famille.' : 'Récompense enregistrée, sans activation.');
    }

    public function update(Request $request, Reward $reward): RedirectResponse
    {
        Gate::authorize('manage-rewards');
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'icon' => ['sometimes', 'required', 'string', 'max:16'],
            'category' => ['sometimes', 'required', Rule::in(array_column(config('reward-templates.categories'), 'key'))],
            'star_cost' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
            'audience' => ['sometimes', 'required', 'in:individual,family'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);
        $reward->update($data);

        return back()->with('success', 'Récompense mise à jour.');
    }

    public function updateParent(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('manage-rewards');
        $data = $request->validate(['is_parent' => ['required', 'boolean']]);
        DB::transaction(function () use ($user, $data) {
            $parents = User::where('is_parent', true)->orderBy('id')->lockForUpdate()->get();
            $account = User::lockForUpdate()->findOrFail($user->id);
            if (! $data['is_parent'] && $account->is_parent && $parents->count() <= 1) {
                throw ValidationException::withMessages(['parent_access' => 'Il faut conserver au moins un compte parent.']);
            }
            $account->forceFill(['is_parent' => $data['is_parent']])->save();
        }, 3);

        return back()->with('success', 'Accès parent mis à jour.');
    }
}
