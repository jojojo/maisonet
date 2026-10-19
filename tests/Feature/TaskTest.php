<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\Room;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-10-19');
        $this->actingAs(User::factory()->create());
        $this->room = Room::create(['name' => 'Cuisine', 'icon' => '🍳']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function makeTask(array $attrs = []): Task
    {
        return Task::create([
            'room_id' => $this->room->id,
            'title' => 'Vaisselle',
            'recurrence' => 'weekly',
            'interval' => 2,
            'next_due_date' => '2026-10-17',
            ...$attrs,
        ]);
    }

    public function test_next_due_date_is_computed_from_the_completion_day(): void
    {
        $task = $this->makeTask();

        $this->post(route('tasks.complete', $task))->assertRedirect();

        $task->refresh();
        $this->assertSame('2026-11-02', $task->next_due_date->toDateString());
        $this->assertSame('2026-10-19', $task->last_completed_at->toDateString());
        $this->assertCount(1, $task->completions);
    }

    public function test_one_off_task_is_closed_and_can_be_undone(): void
    {
        $task = $this->makeTask(['recurrence' => 'once', 'interval' => 1]);

        $this->post(route('tasks.complete', $task));
        $this->assertSame('done', $task->fresh()->status);

        $this->delete(route('tasks.undo', $task));
        $task->refresh();
        $this->assertSame('2026-10-17', $task->next_due_date->toDateString());
        $this->assertNull($task->last_completed_at);
        $this->assertSame('overdue', $task->status);
    }

    public function test_monthly_recurrence_does_not_overflow(): void
    {
        Carbon::setTestNow('2026-01-31');
        $task = $this->makeTask(['recurrence' => 'monthly', 'interval' => 1, 'next_due_date' => '2026-01-31']);

        $task->complete();

        $this->assertSame('2026-02-28', $task->fresh()->next_due_date->toDateString());
    }

    public function test_tasks_can_be_created_updated_and_deleted(): void
    {
        $member = Member::create(['name' => 'Léa', 'color' => '#f59e0b']);

        $this->post(route('tasks.store'), [
            'title' => 'Aspirateur', 'room_id' => $this->room->id, 'member_id' => $member->id,
            'recurrence' => 'daily', 'interval' => 3, 'next_due_date' => '2026-10-20',
        ])->assertRedirect();

        $task = Task::firstWhere('title', 'Aspirateur');
        $this->assertSame(3, $task->interval);

        $this->put(route('tasks.update', $task), [
            'title' => 'Aspirateur salon', 'room_id' => $this->room->id, 'member_id' => null,
            'recurrence' => 'once', 'interval' => 5,
        ])->assertRedirect();

        $task->refresh();
        $this->assertSame('Aspirateur salon', $task->title);
        $this->assertSame(1, $task->interval);
        $this->assertNull($task->member_id);

        $this->delete(route('tasks.destroy', $task));
        $this->assertSame(0, Task::count());
    }

    public function test_dashboard_and_planning_render(): void
    {
        $this->makeTask();

        $this->get(route('dashboard'))->assertOk();
        $this->get(route('planning'))->assertOk();
    }

    public function test_multiple_assignees_are_saved_filtered_and_can_be_removed(): void
    {
        $johan = Member::create(['name' => 'Johan', 'color' => '#3b82f6']);
        $vanessa = Member::create(['name' => 'Vanessa', 'color' => '#ec4899']);
        $data = [
            'title' => 'Nettoyer ensemble', 'room_id' => $this->room->id,
            'member_ids' => [$johan->id, $vanessa->id],
            'recurrence' => 'daily', 'interval' => 1, 'next_due_date' => '2026-10-19',
        ];

        $this->post(route('tasks.store'), $data)->assertSessionHasNoErrors()->assertRedirect();
        $task = Task::firstWhere('title', $data['title']);
        $this->assertEqualsCanonicalizing([$johan->id, $vanessa->id], $task->members->modelKeys());

        foreach ([$johan, $vanessa] as $member) {
            $this->get(route('tasks.index', ['member' => $member->id]))
                ->assertInertia(fn (Assert $page) => $page->has('tasks', 1)->has('tasks.0.members', 2));
            $this->get(route('dashboard', ['member' => $member->id]))
                ->assertInertia(fn (Assert $page) => $page->has('today', 1)->where('stats.tasks', 1));
            $this->get(route('planning', ['member' => $member->id]))
                ->assertInertia(fn (Assert $page) => $page->has('days.0.tasks', 1)->has('days.0.tasks.0.members', 2));
        }
        $this->get(route('members.index'))->assertInertia(fn (Assert $page) => $page
            ->where('members.0.tasks_count', 1)->where('members.1.tasks_count', 1));
        $this->get(route('tasks.index', ['member' => 'none']))
            ->assertInertia(fn (Assert $page) => $page->has('tasks', 0));

        $this->put(route('tasks.update', $task), [...$data, 'member_ids' => [$vanessa->id]])
            ->assertSessionHasNoErrors();
        $this->assertSame([$vanessa->id], $task->fresh()->members->modelKeys());

        $this->put(route('tasks.update', $task), [...$data, 'member_ids' => []])
            ->assertSessionHasNoErrors();
        $this->assertCount(0, $task->fresh()->members);
        $this->get(route('tasks.index', ['member' => 'none']))
            ->assertInertia(fn (Assert $page) => $page->has('tasks', 1));
    }

    public function test_invalid_or_duplicate_assignees_are_rejected(): void
    {
        $member = Member::create(['name' => 'Johan', 'color' => '#3b82f6']);
        $data = [
            'title' => 'Vaisselle', 'room_id' => $this->room->id,
            'recurrence' => 'daily', 'interval' => 1, 'next_due_date' => '2026-10-19',
        ];
        $this->post(route('tasks.store'), [...$data, 'member_ids' => [99999]])
            ->assertSessionHasErrors('member_ids.0');
        $this->post(route('tasks.store'), [...$data, 'member_ids' => [$member->id, $member->id]])
            ->assertSessionHasErrors('member_ids.0');
        $this->assertSame(0, Task::count());
    }

    public function test_shared_task_is_completed_once_and_can_be_undone(): void
    {
        $task = $this->makeTask();
        $johan = Member::create(['name' => 'Johan', 'color' => '#3b82f6']);
        $vanessa = Member::create(['name' => 'Vanessa', 'color' => '#ec4899']);
        $task->members()->sync([$johan->id, $vanessa->id]);

        $this->post(route('tasks.complete', $task))->assertRedirect();
        $this->assertCount(1, $task->fresh()->completions);
        $this->assertSame('2026-11-02', $task->fresh()->next_due_date->toDateString());
        $this->assertCount(2, $task->fresh()->members);

        $this->delete(route('tasks.undo', $task))->assertRedirect();
        $this->assertSame('2026-10-17', $task->fresh()->next_due_date->toDateString());
        $this->assertCount(0, $task->fresh()->completions);
    }

    public function test_dirt_gauge_tracks_the_cycle_and_resets_after_completion(): void
    {
        $task = $this->makeTask([
            'last_completed_at' => '2026-10-12',
            'next_due_date' => '2026-10-26',
        ]);
        $this->assertSame(50, $task->dirt_level);

        Carbon::setTestNow('2026-10-25');
        $this->assertSame(93, $task->dirt_level);
        Carbon::setTestNow('2026-10-26');
        $this->assertSame(100, $task->dirt_level);
        Carbon::setTestNow('2026-10-29');
        $this->assertSame(100, $task->dirt_level);

        $this->post(route('tasks.complete', $task))->assertRedirect();
        $this->assertSame(0, $task->fresh()->dirt_level);
        $this->delete(route('tasks.undo', $task))->assertRedirect();
        $this->assertSame(100, $task->fresh()->dirt_level);
    }

    public function test_dirt_gauge_handles_no_history_and_calendar_recurrences(): void
    {
        $weekly = $this->makeTask(['next_due_date' => '2026-10-26', 'interval' => 1]);
        $this->assertSame(0, $weekly->dirt_level);
        Carbon::setTestNow('2026-10-23');
        $this->assertSame(57, $weekly->dirt_level);

        Carbon::setTestNow('2026-02-14');
        $monthly = $this->makeTask([
            'recurrence' => 'monthly', 'interval' => 1,
            'last_completed_at' => '2026-01-31', 'next_due_date' => '2026-02-28',
        ]);
        $this->assertSame(50, $monthly->dirt_level);
        $monthly->last_completed_at = null;
        $this->assertSame(55, $monthly->dirt_level);

        Carbon::setTestNow('2024-08-29');
        $yearly = $this->makeTask([
            'recurrence' => 'yearly', 'interval' => 1,
            'last_completed_at' => '2024-02-29', 'next_due_date' => '2025-02-28',
        ]);
        $this->assertSame(50, $yearly->dirt_level);
        $yearly->last_completed_at = '2024-09-01';
        $this->assertSame(0, $yearly->dirt_level);
    }

    public function test_one_off_tasks_have_no_dirt_gauge_and_dashboard_exposes_all_cycles(): void
    {
        $oneOff = $this->makeTask(['recurrence' => 'once']);
        $this->assertNull($oneOff->dirt_level);
        $this->makeTask(['next_due_date' => '2026-12-01']);

        $this->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
            ->has('missions', 2)->where('missions.0.dirt_level', null)->where('missions.1.dirt_level', 0));
    }

    public function test_effort_can_be_set_changed_and_cleared(): void
    {
        $data = [
            'title' => 'Grand ménage', 'room_id' => $this->room->id,
            'recurrence' => 'weekly', 'interval' => 1, 'next_due_date' => '2026-10-19',
            'effort_size' => 'XL', 'effort_points' => 999,
        ];
        $this->post(route('tasks.store'), $data)->assertSessionHasNoErrors();
        $task = Task::firstWhere('title', 'Grand ménage');
        $this->assertSame('XL', $task->effort_size->value);
        $this->assertSame(8, $task->effort_points);
        $this->get(route('tasks.index'))->assertInertia(fn (Assert $page) => $page
            ->where('tasks.0.effort_size', 'XL')->where('tasks.0.effort_points', 8));

        $this->put(route('tasks.update', $task), [...$data, 'effort_size' => 'XS'])
            ->assertSessionHasNoErrors();
        $this->assertSame(1, $task->fresh()->effort_points);

        $this->put(route('tasks.update', $task), [...$data, 'effort_size' => ''])
            ->assertSessionHasNoErrors();
        $this->assertNull($task->fresh()->effort_size);
        $this->assertNull($task->fresh()->effort_points);
        $this->assertNull($this->makeTask()->effort_size);
    }

    public function test_unknown_effort_size_is_rejected(): void
    {
        $task = $this->makeTask();
        $this->put(route('tasks.update', $task), [
            'title' => $task->title, 'room_id' => $this->room->id,
            'recurrence' => 'weekly', 'interval' => 1, 'effort_size' => 'XXL',
        ])->assertSessionHasErrors('effort_size');
        $this->assertNull($task->fresh()->effort_size);
    }

    public function test_completion_keeps_the_effort_points_at_the_time_it_was_done(): void
    {
        $task = $this->makeTask(['effort_size' => 'L']);
        $this->post(route('tasks.complete', $task))->assertRedirect();
        $this->assertSame(5, $task->completions()->first()->effort_points);

        $task->update(['effort_size' => 'XS']);
        $this->assertSame(1, $task->effort_points);
        $this->assertSame(5, $task->completions()->first()->effort_points);

        $this->delete(route('tasks.undo', $task))->assertRedirect();
        $this->assertCount(0, $task->fresh()->completions);
    }
}
