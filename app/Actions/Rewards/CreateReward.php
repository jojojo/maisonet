<?php

namespace App\Actions\Rewards;

use App\Models\Reward;
use App\Support\RewardCatalogue;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Lorisleiva\Actions\Concerns\AsAction;

class CreateReward
{
    use AsAction;

    public function handle(array $data): void
    {
        $templates = collect(RewardCatalogue::templates())->keyBy('template_key');
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
    }

    public function asController(Request $request): RedirectResponse
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
        $this->handle($data);

        return back()->with('success', $data['is_active'] ? 'Récompense activée pour la famille.' : 'Récompense enregistrée, sans activation.');
    }
}
