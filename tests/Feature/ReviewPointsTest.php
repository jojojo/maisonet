<?php

namespace Tests\Feature;

use App\Actions\Tasks\CompleteTask;
use App\Actions\Tasks\UndoTaskCompletion;
use App\Models\Family;
use App\Models\Member;
use App\Models\PointEntry;
use App\Models\Room;
use App\Models\Task;
use App\Models\TaskCompletion;
use App\Models\User;
use App\Services\GoalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewPointsTest extends TestCase
{
    use RefreshDatabase;

    private User $parent;

    private User $child;

    private Member $member;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 28)->startOfDay());
        $this->parent = User::factory()->create(['is_parent' => true]);
        $this->member = Member::create(['name' => 'Gabriel', 'color' => '#123456']);
        $this->member->forceFill(['weekly_target' => 6])->save();
        $this->child = User::factory()->create(['member_id' => $this->member->id]);
        $room = Room::create(['name' => 'Salon', 'icon' => 'S']);
        $this->task = Task::create(['title' => 'Vitres', 'room_id' => $room->id, 'recurrence' => 'weekly', 'interval' => 1, 'effort_size' => 'L', 'next_due_date' => today()]);
    }

    private function pending(array $ids = []): TaskCompletion
    {
        return CompleteTask::run($this->task, $ids ?: [$this->member->id], $this->child);
    }

    private function approve(TaskCompletion $completion, array $data = [])
    {
        return $this->actingAs($this->parent)->post(route('goals.review-completion', $completion), array_replace([
            'decision' => 'approve', 'member_ids' => [$this->member->id],
        ], $data));
    }

    public function test_parent_can_increase_points_and_keep_original_effort_with_a_note(): void
    {
        $record = $this->pending();
        $this->approve($record, ['awarded_points' => 7, 'review_note' => 'Plus long que prévu'])->assertRedirect();
        $record->refresh();
        $this->assertSame(5, $record->effort_points);
        $this->assertSame(7, $record->awarded_points);
        $this->assertSame(7, $record->points_total);
        $this->assertSame('Plus long que prévu', $record->review_note);
        $this->assertSame(7.0, app(GoalService::class)->points($this->member));
        $this->assertSame(1, app(GoalService::class)->balance($this->member));
        $this->assertSame(5, $this->task->fresh()->effort_points);
        // Retrying the approval cannot rewrite the first parent's decision.
        $this->approve($record, ['awarded_points' => 100, 'review_note' => 'Autre avis'])->assertRedirect();
        $this->assertSame(7, $record->fresh()->awarded_points);
        $this->assertSame('Plus long que prévu', $record->fresh()->review_note);
        $this->assertDatabaseCount('point_entries', 1);
        UndoTaskCompletion::run($this->task, $this->parent);
        $this->assertSame(0.0, app(GoalService::class)->points($this->member));
        $this->assertSame(0, app(GoalService::class)->balance($this->member));
    }

    public function test_reduced_total_is_split_exactly_between_the_actual_participants(): void
    {
        $other = Member::create(['name' => 'Valentine', 'color' => '#abcdef']);
        $third = Member::create(['name' => 'Clément', 'color' => '#123abc']);
        $ids = [$this->member->id, $other->id, $third->id];
        $record = $this->pending($ids);
        $this->approve($record, ['member_ids' => $ids, 'awarded_points' => 2])->assertRedirect();
        $this->assertSame([0.67, 0.67, 0.66], PointEntry::orderBy('member_id')->get()->map(fn ($entry) => (float) $entry->points)->all());
        $this->assertSame(2.0, (float) PointEntry::sum('points'));
        $this->assertSame(0, app(GoalService::class)->balance($this->member));
        UndoTaskCompletion::run($this->task, $this->parent);
        $this->assertSame(0.0, app(GoalService::class)->points($this->member));
        $this->assertSame(3, PointEntry::where('is_void', true)->count());
    }

    public function test_zero_points_still_approves_the_work_and_does_not_release_the_reward_cooldown(): void
    {
        $record = $this->pending();
        $this->approve($record, ['awarded_points' => 0, 'review_note' => 'À faire plus soigneusement'])->assertRedirect();
        $this->assertSame('approved', $record->fresh()->status);
        $this->assertSame(0, $record->fresh()->points_total);
        $this->assertDatabaseCount('point_entries', 0);
        $this->assertSame(0, app(GoalService::class)->balance($this->member));
        $this->travel(1)->days();
        $repeat = $this->pending();
        $this->assertFalse($repeat->awards_points);
        $this->approve($repeat, ['awarded_points' => 10])->assertSessionHasErrors('awarded_points');
        $this->assertSame('pending', $repeat->fresh()->status);
    }

    public function test_default_approval_and_rejection_preserve_existing_rules(): void
    {
        $record = $this->pending();
        $this->approve($record)->assertRedirect();
        $this->assertNull($record->fresh()->awarded_points);
        $this->assertSame(5, $record->fresh()->points_total);
        $this->assertSame(5.0, app(GoalService::class)->points($this->member));
        $this->travel(7)->days();
        $record = $this->pending();
        $this->approve($record, ['decision' => 'reject', 'awarded_points' => 50])->assertRedirect();
        $this->assertSame('rejected', $record->fresh()->status);
        $this->assertNull($record->fresh()->awarded_points);
        $this->assertSame(0, $record->fresh()->points_total);
        $this->assertSame(5.0, app(GoalService::class)->points($this->member));
    }

    public function test_invalid_adjustments_and_unscored_tasks_cannot_earn_points(): void
    {
        $record = $this->pending();
        foreach ([-1, 101, 1.5, 'abc'] as $value) {
            $this->approve($record, ['awarded_points' => $value])->assertSessionHasErrors('awarded_points');
        }
        $this->approve($record, ['awarded_points' => 4, 'member_ids' => []])->assertSessionHasErrors('member_ids');
        $this->approve($record, ['review_note' => str_repeat('x', 501)])->assertSessionHasErrors('review_note');
        $this->assertSame('pending', $record->fresh()->status);
        $this->task->update(['effort_size' => null]);
        $this->travel(7)->days();
        $unscored = $this->pending();
        $this->approve($unscored, ['awarded_points' => 5])->assertSessionHasErrors('awarded_points');
        $this->assertDatabaseCount('point_entries', 0);
    }

    public function test_child_cannot_set_points_when_declaring_or_reviewing_work(): void
    {
        $this->actingAs($this->child)->post(route('tasks.complete', $this->task), [
            'member_ids' => [$this->member->id], 'awarded_points' => 100, 'review_note' => 'Bonus',
        ])->assertRedirect();
        $record = $this->task->completions()->sole();
        $this->assertNull($record->awarded_points);
        $this->post(route('goals.review-completion', $record), ['decision' => 'approve', 'awarded_points' => 100])->assertForbidden();
        $this->assertDatabaseCount('point_entries', 0);
    }

    public function test_api_returns_adjusted_total_and_rejects_other_family(): void
    {
        $record = $this->pending();
        $token = $this->parent->createToken('Phone')->plainTextToken;
        $this->withToken($token)->postJson('/api/v1/completions/'.$record->id.'/review', [
            'decision' => 'approve', 'member_ids' => [$this->member->id], 'awarded_points' => 8, 'review_note' => 'Bel effort',
        ])->assertOk()->assertJsonPath('data.effort_points', 5)->assertJsonPath('data.awarded_points', 8)
            ->assertJsonPath('data.points_total', 8)->assertJsonPath('data.review_note', 'Bel effort')->assertJsonPath('data.participants.0.points', 8);
        $family = Family::create(['name' => 'Autre foyer']);
        $outsider = User::factory()->create(['family_id' => $family->id, 'is_parent' => true]);
        $otherToken = $outsider->createToken('Phone')->plainTextToken;
        auth()->forgetGuards();
        $this->withToken($otherToken)->postJson('/api/v1/completions/'.$record->id.'/review', ['decision' => 'approve', 'awarded_points' => 20])->assertNotFound();
    }
}
