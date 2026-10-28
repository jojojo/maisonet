<?php

namespace App\Actions\Rewards;

use App\Models\Reward;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateReward
{
    use AsAction;

    public function handle(Reward $reward, array $data): void
    {
        $reward->update($data);
    }

    public function asController(Request $request, Reward $reward): RedirectResponse
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
        $this->handle($reward, $data);

        return back()->with('success', 'Récompense mise à jour.');
    }
}
