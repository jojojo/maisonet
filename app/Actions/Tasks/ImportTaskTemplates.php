<?php

namespace App\Actions\Tasks;

use App\Enums\EffortSize;
use App\Enums\Recurrence;
use App\Models\Room;
use App\Models\Task;
use App\Support\FamilyContext;
use App\Support\TaskCatalogue;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Lorisleiva\Actions\Concerns\AsAction;

class ImportTaskTemplates
{
    use AsAction;

    public function handle(array $data): int
    {
        $templates = collect(TaskCatalogue::templates())->keyBy('key');

        return DB::transaction(function () use ($data, $templates) {
            $room = Room::lockForUpdate()->findOrFail($data['room_id']);
            $existing = $room->tasks()->get(['title', 'template_key']);
            $titles = $existing->mapWithKeys(fn ($task) => [TaskCatalogue::normalizeTitle($task->title) => true])->all();
            $keys = $existing->pluck('template_key')->filter()->flip()->all();
            $members = $data['member_ids'] ?? [];
            $start = CarbonImmutable::parse($data['start_date']);
            $added = 0;

            foreach ($data['items'] as $item) {
                $template = $templates[$item['key']];
                $title = TaskCatalogue::normalizeTitle($template['title']);
                if (isset($keys[$template['key']]) || isset($titles[$title])) {
                    continue;
                }

                $recurrence = Recurrence::from($item['recurrence'] ?? $template['recurrence']);
                $interval = $recurrence === Recurrence::Once ? 1 : ($item['interval'] ?? $template['interval']);
                $task = Task::firstOrCreate([
                    'room_id' => $room->id, 'template_key' => $template['key'],
                ], [
                    'title' => $template['title'], 'notes' => $template['notes'],
                    'recurrence' => $recurrence, 'interval' => $interval,
                    'effort_size' => $item['effort_size'] ?? $template['effort_size'],
                    'member_id' => count($members) === 1 ? $members[0] : null,
                    'next_due_date' => $data['schedule'] === 'spread' ? ($recurrence->advance($start, $interval) ?? $start) : $start,
                ]);

                if ($task->wasRecentlyCreated) {
                    $task->members()->sync($members);
                    $added++;
                }
                $keys[$template['key']] = true;
                $titles[$title] = true;
            }

            return $added;
        }, 3);
    }

    public function asController(Request $request): RedirectResponse
    {
        $templates = collect(TaskCatalogue::templates())->keyBy('key');
        $data = $request->validate([
            'room_id' => ['required', 'integer', FamilyContext::exists('rooms')],
            'member_ids' => ['sometimes', 'array'],
            'member_ids.*' => ['required', 'integer', 'distinct', FamilyContext::exists('members')],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'schedule' => ['required', 'in:spread,same_date'],
            'items' => ['required', 'array', 'min:1', 'max:'.$templates->count()],
            'items.*.key' => ['required', 'string', 'distinct', Rule::in($templates->keys()->all())],
            'items.*.recurrence' => ['sometimes', 'required', Rule::enum(Recurrence::class)],
            'items.*.interval' => ['sometimes', 'required', 'integer', 'min:1', 'max:365'],
            'items.*.effort_size' => ['sometimes', 'required', Rule::enum(EffortSize::class)],
        ]);

        $added = $this->handle($data);

        $skipped = count($data['items']) - $added;

        return back()->with('success', $added.' tâche(s) ajoutée(s) à la pièce.'.($skipped ? ' '.$skipped.' déjà présente(s), ignorée(s).' : ''));
    }
}
