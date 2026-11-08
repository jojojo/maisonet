<?php

namespace Tests\Feature;

use App\Enums\DayPeriod;
use App\Models\Room;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TaskDayPeriodTest extends TestCase
{
    use RefreshDatabase;

    private function taskData(): array
    {
        return [
            'title' => 'Ranger la cuisine',
            'room_id' => Room::create(['name' => 'Cuisine', 'icon' => 'C'])->id,
            'recurrence' => 'daily', 'interval' => 1, 'next_due_date' => today()->toDateString(),
        ];
    }

    public function test_unspecified_period_defaults_to_all_day_and_old_updates_preserve_the_period(): void
    {
        $this->actingAs(User::factory()->create(['is_parent' => true]));
        $data = $this->taskData();
        $this->post(route('tasks.store'), $data)->assertSessionHasNoErrors();
        $task = Task::sole();
        $this->assertSame(DayPeriod::AllDay, $task->day_period);
        $task->update(['day_period' => DayPeriod::Morning]);
        $this->put(route('tasks.update', $task), $data)->assertSessionHasNoErrors();
        $this->assertSame(DayPeriod::Morning, $task->fresh()->day_period);
    }

    public function test_each_single_period_can_be_saved_and_changed_back_to_all_day(): void
    {
        $this->actingAs(User::factory()->create(['is_parent' => true]));
        $data = $this->taskData();
        $this->post(route('tasks.store'), [...$data, 'day_period' => 'bedtime'])->assertSessionHasNoErrors();
        $task = Task::sole();
        $this->assertSame(DayPeriod::Bedtime, $task->day_period);
        foreach (DayPeriod::cases() as $period) {
            $this->put(route('tasks.update', $task), [...$data, 'day_period' => $period->value])->assertSessionHasNoErrors();
            $this->assertSame($period, $task->fresh()->day_period);
        }
    }

    public function test_unknown_empty_or_multiple_periods_are_rejected(): void
    {
        $this->actingAs(User::factory()->create(['is_parent' => true]));
        $data = $this->taskData();
        foreach (['night', null, '', ['morning', 'evening']] as $invalid) {
            $this->post(route('tasks.store'), [...$data, 'day_period' => $invalid])->assertSessionHasErrors('day_period');
        }
        $this->assertDatabaseCount('tasks', 0);
        $task = Task::create([...$data, 'day_period' => DayPeriod::Midday]);
        $this->put(route('tasks.update', $task), [...$data, 'day_period' => ['morning', 'evening']])
            ->assertSessionHasErrors('day_period');
        $this->assertSame(DayPeriod::Midday, $task->fresh()->day_period);
    }

    public function test_period_is_kept_for_planning_projections_and_after_completing_or_skipping(): void
    {
        $this->travelTo(now()->startOfWeek()->setTime(10, 0));
        $this->actingAs(User::factory()->create(['is_parent' => true]));
        $data = $this->taskData();
        $task = Task::create([...$data, 'day_period' => DayPeriod::Evening]);
        $this->get(route('planning', ['start' => today()->startOfWeek()->toDateString()]))
            ->assertInertia(function (Assert $page) use ($task) {
                $page->component('planning')->where('days', function ($days) use ($task) {
                    $occurrences = collect($days)->pluck('tasks')->flatten(1)->where('id', $task->id);

                    return $occurrences->count() === 7 && $occurrences->where('projected', true)->count() === 6
                        && $occurrences->every(fn ($item) => $item['day_period'] === 'evening');
                });
            });
        $this->post(route('tasks.complete', $task))->assertSessionHasNoErrors();
        $this->assertSame(DayPeriod::Evening, $task->fresh()->day_period);
        $this->post(route('tasks.skip', $task), ['due_on' => $task->fresh()->next_due_date->toDateString()])->assertSessionHasNoErrors();
        $this->assertSame(DayPeriod::Evening, $task->fresh()->day_period);
    }

    public function test_mobile_api_exposes_the_same_period(): void
    {
        $user = User::factory()->create(['is_parent' => true]);
        $this->actingAs($user);
        $task = Task::create([...$this->taskData(), 'day_period' => DayPeriod::Afternoon]);
        $token = $user->createToken('Test phone', ['mobile'], now()->addDay())->plainTextToken;
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/tasks/'.$task->id)
            ->assertOk()->assertJsonPath('data.day_period', 'afternoon');
    }
}
