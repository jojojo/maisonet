<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\Member;
use App\Models\Room;
use App\Models\Task;
use App\Models\User;
use App\Services\CompletionService;
use App\Support\FamilyContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SkipOccurrenceTest extends TestCase
{
    use RefreshDatabase;

    private User $parent;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 27)->startOfDay());
        $this->parent = User::factory()->create(['is_parent' => true]);
        $room = Room::create(['name' => 'Salon', 'icon' => 'S']);
        $this->task = Task::create(['title' => 'Arroser', 'room_id' => $room->id, 'recurrence' => 'weekly', 'interval' => 1, 'effort_size' => 'L', 'next_due_date' => '2026-10-27']);
    }

    public function test_passing_records_reason_without_cleaning_or_points_and_duplicate_is_safe(): void
    {
        $this->task->update(['last_completed_at' => '2026-10-20']);
        $this->actingAs($this->parent);
        foreach ([1, 2] as $_) {
            $this->post(route('tasks.skip', $this->task), ['due_on' => '2026-10-27', 'reason' => 'Terre humide', 'awards_points' => true])->assertRedirect();
        }
        $task = $this->task->fresh();
        $this->assertSame('2026-11-03', $task->next_due_date->toDateString());
        $this->assertSame('2026-10-20', $task->last_completed_at->toDateString());
        $record = $task->completions()->sole();
        $this->assertSame('skipped', $record->status);
        $this->assertSame('Terre humide', $record->skip_reason);
        $this->assertFalse($record->awards_points);
        $this->assertNull($record->points_next_available_on);
        foreach (['point_entries', 'weekly_goals', 'star_transactions', 'completion_participants'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
        $this->get('/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page->where('stats.done_this_week', 0)->where('recent.0.status', 'skipped')->where('recent.0.skip_reason', 'Terre humide'));
        app(CompletionService::class)->undoSkip($task, $this->parent, $record->id);
        $this->assertSame('2026-10-20', $task->fresh()->last_completed_at->toDateString());
    }

    public function test_overdue_resumes_from_today_and_future_occurrence_advances_from_its_date(): void
    {
        $service = app(CompletionService::class);
        $this->task->update(['next_due_date' => '2026-10-01']);
        $service->skip($this->task, $this->parent, '2026-10-01');
        $this->assertSame('2026-11-03', $this->task->fresh()->next_due_date->toDateString());
        $service->skip($this->task, $this->parent, '2026-11-03');
        $this->assertSame('2026-11-10', $this->task->fresh()->next_due_date->toDateString());
    }

    public function test_month_end_and_one_off_skips_are_reversible(): void
    {
        $this->travelTo(now()->setDate(2026, 1, 31));
        $this->task->update(['recurrence' => 'monthly', 'next_due_date' => '2026-01-31']);
        $service = app(CompletionService::class);
        $record = $service->skip($this->task, $this->parent, '2026-01-31');
        $this->assertSame('2026-02-28', $this->task->fresh()->next_due_date->toDateString());
        $service->undoSkip($this->task, $this->parent, $record->id);
        $this->assertSame('2026-01-31', $this->task->fresh()->next_due_date->toDateString());
        $this->task->update(['recurrence' => 'once']);
        $record = $service->skip($this->task, $this->parent, '2026-01-31');
        $this->assertNull($this->task->fresh()->next_due_date);
        $this->assertNull($this->task->fresh()->last_completed_at);
        $service->undoSkip($this->task, $this->parent, $record->id);
        $this->assertSame('2026-01-31', $this->task->fresh()->next_due_date->toDateString());
    }

    public function test_real_completion_after_skip_can_earn_and_undo_does_not_turn_skip_into_cleaning(): void
    {
        $member = Member::create(['name' => 'Parent', 'color' => '#123456']);
        $service = app(CompletionService::class);
        $record = $service->skip($this->task, $this->parent, '2026-10-27');
        $completion = $service->complete($this->task, [$member->id], $this->parent);
        $this->assertNotSame($record->id, $completion->id);
        $this->assertTrue($completion->awards_points);
        $this->actingAs($this->parent)->delete(route('tasks.undo-skip', $this->task), ['completion_id' => $record->id])->assertConflict();
        $service->undo($this->task, $this->parent);
        $this->assertNull($this->task->fresh()->last_completed_at);
        $this->assertSame('2026-11-03', $this->task->fresh()->next_due_date->toDateString());
        $service->undoSkip($this->task, $this->parent, $record->id);
        $this->assertSame('2026-10-27', $this->task->fresh()->next_due_date->toDateString());
    }

    public function test_stale_date_and_pending_review_are_rejected(): void
    {
        $this->actingAs($this->parent)->post(route('tasks.skip', $this->task), ['due_on' => '2026-10-26'])->assertConflict();
        $child = User::factory()->create();
        app(CompletionService::class)->complete($this->task, [], $child);
        $this->post(route('tasks.skip', $this->task), ['due_on' => '2026-11-03'])->assertSessionHasErrors('reason');
        $this->assertSame(1, $this->task->completions()->count());
    }

    public function test_child_cannot_pass_or_undo_and_foreign_task_is_not_found(): void
    {
        $child = User::factory()->create();
        $this->actingAs($child)->post(route('tasks.skip', $this->task), ['due_on' => '2026-10-27'])->assertForbidden();
        $this->delete(route('tasks.undo-skip', $this->task), ['completion_id' => 1])->assertForbidden();
        $family = Family::create(['name' => 'Autre']);
        auth()->forgetGuards();
        $foreign = app(FamilyContext::class)->run($family->id, function () {
            $room = Room::create(['name' => 'Autre', 'icon' => 'X']);

            return Task::create(['title' => 'Privée', 'room_id' => $room->id, 'recurrence' => 'weekly', 'next_due_date' => today()]);
        });
        $this->actingAs($this->parent)->post(route('tasks.skip', $foreign), ['due_on' => '2026-10-27'])->assertNotFound();
    }

    public function test_kiosk_requires_parent_password_for_skip_and_undo(): void
    {
        $this->actingAs($this->parent)->withSession(['kiosk' => true]);
        $this->post(route('kiosk.skip', $this->task), ['due_on' => '2026-10-27'])->assertSessionHasErrors('password');
        $this->post(route('kiosk.skip', $this->task), ['due_on' => '2026-10-27', 'password' => 'password'])->assertRedirect();
        $record = $this->task->completions()->sole();
        $this->delete(route('kiosk.undo-skip', $this->task), ['completion_id' => $record->id])->assertSessionHasErrors('password');
        $this->delete(route('kiosk.undo-skip', $this->task), ['completion_id' => $record->id, 'password' => 'password'])->assertRedirect();
        $this->assertSame('2026-10-27', $this->task->fresh()->next_due_date->toDateString());
    }

    public function test_mobile_api_returns_skip_then_restored_task_and_enforces_roles(): void
    {
        $token = $this->parent->createToken('Phone')->plainTextToken;
        $this->withToken($token)->postJson('/api/v1/tasks/'.$this->task->id.'/skip', ['due_on' => '2026-10-27', 'reason' => 'Pas nécessaire'])->assertSuccessful()->assertJsonPath('data.status', 'skipped')->assertJsonPath('data.awards_points', false);
        $id = $this->task->completions()->sole()->id;
        $this->deleteJson('/api/v1/tasks/'.$this->task->id.'/skip', ['completion_id' => $id])->assertOk()->assertJsonPath('data.next_due_date', '2026-10-27');
        $child = User::factory()->create();
        $childToken = $child->createToken('Child')->plainTextToken;
        $this->app['auth']->forgetGuards();
        $this->withToken($childToken)->postJson('/api/v1/tasks/'.$this->task->id.'/skip', ['due_on' => '2026-10-27'])->assertForbidden();
    }
}
