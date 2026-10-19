<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\PointEntry;
use App\Models\Reward;
use App\Models\Room;
use App\Models\Task;
use App\Models\User;
use App\Models\WeeklyGoal;
use App\Services\CompletionService;
use App\Services\GoalService;
use App\Services\RewardRequestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GoalTest extends TestCase
{
    use RefreshDatabase;

    private User $parent;

    private User $child;

    private Member $member;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 19)->startOfDay());
        $this->parent = User::factory()->create(['is_parent' => true]);
        $this->member = Member::create(['name' => 'Gabriel', 'color' => '#10b981']);
        $this->member->forceFill(['weekly_target' => 5])->save();
        $this->child = User::factory()->create(['member_id' => $this->member->id]);
        $room = Room::create(['name' => 'Cuisine', 'icon' => 'C']);
        $this->task = Task::create(['room_id' => $room->id, 'title' => 'Vaisselle', 'recurrence' => 'weekly', 'interval' => 1, 'effort_size' => 'L', 'next_due_date' => today()]);
    }

    private function complete(?User $actor = null, ?array $ids = null)
    {
        return app(CompletionService::class)->complete($this->task, $ids ?? [$this->member->id], $actor ?? $this->parent);
    }

    private function reward(): Reward
    {
        return Reward::create(['title' => 'Film du vendredi', 'icon' => 'F', 'category' => 'custom', 'star_cost' => 1, 'audience' => 'family', 'is_active' => true]);
    }

    public function test_child_points_wait_for_review_and_duplicate_review_is_safe(): void
    {
        $this->actingAs($this->child)->post(route('tasks.complete', $this->task), ['member_ids' => [$this->member->id]])->assertRedirect();
        $completion = $this->task->completions()->firstOrFail();
        $this->assertSame('pending', $completion->status);
        $this->assertDatabaseCount('point_entries', 0);
        foreach ([1, 2] as $_) {
            $this->actingAs($this->parent)->post(route('goals.review-completion', $completion), ['decision' => 'approve', 'member_ids' => [$this->member->id]])->assertRedirect();
        }
        $this->assertSame(5.0, app(GoalService::class)->points($this->member));
        $this->assertSame(1, app(GoalService::class)->balance($this->member));
        $this->assertDatabaseCount('point_entries', 1);
        $this->assertDatabaseCount('star_transactions', 1);
    }

    public function test_shared_points_total_exactly_the_effort_without_multiplication(): void
    {
        $ids = [$this->member->id];
        foreach (['Valentine', 'Clément'] as $name) {
            $ids[] = Member::create(['name' => $name, 'color' => '#123456'])->id;
        }
        $completion = $this->complete(ids: $ids);
        $this->assertSame('approved', $completion->status);
        $this->assertSame(5.0, (float) PointEntry::sum('points'));
        $this->assertSame([1.67, 1.67, 1.66], PointEntry::orderBy('member_id')->pluck('points')->map(fn ($points) => (float) $points)->all());
    }

    public function test_repeat_clicks_and_early_cleaning_do_not_multiply_points(): void
    {
        $first = $this->complete();
        $this->assertSame($first->id, $this->complete()->id);
        $this->assertSame('2026-10-26', $this->task->fresh()->next_due_date->toDateString());
        $this->travel(1)->days();
        $this->assertFalse($this->complete()->awards_points);
        $this->assertSame(5.0, app(GoalService::class)->points($this->member));
        $this->travel(6)->days();
        $this->assertTrue($this->complete()->awards_points);
        $this->assertSame(10.0, app(GoalService::class)->points($this->member));
        $this->assertSame(2, app(GoalService::class)->balance($this->member));
    }

    public function test_refusal_restores_schedule_and_releases_point_eligibility(): void
    {
        $completion = $this->complete($this->child);
        app(CompletionService::class)->review($completion, $this->parent, false);
        $this->assertSame('2026-10-19', $this->task->fresh()->next_due_date->toDateString());
        $this->assertTrue($this->complete()->awards_points);
        $this->assertSame(5.0, app(GoalService::class)->points($this->member));
    }

    public function test_undo_removes_points_and_stars_and_redo_earns_once(): void
    {
        $this->complete();
        app(CompletionService::class)->undo($this->task, $this->parent);
        $this->assertSame(0.0, app(GoalService::class)->points($this->member));
        $this->assertSame(0, app(GoalService::class)->balance($this->member));
        $this->assertTrue(PointEntry::first()->is_void);
        $this->complete();
        $this->assertSame(5.0, app(GoalService::class)->points($this->member));
        $this->assertSame(1, app(GoalService::class)->balance($this->member));
    }

    public function test_reward_reserves_snapshot_price_and_refunds_only_once(): void
    {
        $this->complete();
        $reward = $this->reward();
        $service = app(RewardRequestService::class);
        $request = $service->request($this->member, $reward, $this->child);
        $this->assertSame(0, app(GoalService::class)->balance($this->member));
        $reward->update(['star_cost' => 9]);
        $service->review($request, $this->parent, 'approve');
        $this->assertSame(0, app(GoalService::class)->balance($this->member));
        $service->review($request, $this->parent, 'reject');
        $service->review($request, $this->parent, 'reject');
        $this->assertSame(1, app(GoalService::class)->balance($this->member));
        $this->assertSame(1, $request->fresh()->star_cost);
        $this->assertDatabaseCount('star_transactions', 3);
    }

    public function test_fulfilment_does_not_charge_twice_and_is_final(): void
    {
        $this->complete();
        $service = app(RewardRequestService::class);
        $request = $service->request($this->member, $this->reward(), $this->child);
        foreach (['approve', 'fulfil', 'fulfil', 'reject', 'cancel'] as $action) {
            $service->review($request, $this->parent, $action);
        }
        $this->assertSame('fulfilled', $request->fresh()->status);
        $this->assertSame(0, app(GoalService::class)->balance($this->member));
        $this->assertDatabaseCount('star_transactions', 2);
    }

    public function test_spent_stars_then_undo_creates_debt_and_blocks_new_request(): void
    {
        $this->complete();
        $request = app(RewardRequestService::class)->request($this->member, $this->reward(), $this->child);
        app(CompletionService::class)->undo($this->task, $this->parent);
        $this->assertSame(-1, app(GoalService::class)->balance($this->member));
        $this->actingAs($this->child)->post(route('goals.request-reward'), ['member_id' => $this->member->id, 'reward_id' => $this->reward()->id])->assertSessionHasErrors('reward_id');
        app(RewardRequestService::class)->review($request, $this->child, 'cancel');
        $this->assertSame(0, app(GoalService::class)->balance($this->member));
    }

    public function test_next_week_resets_progress_but_preserves_stars_and_old_goal(): void
    {
        $this->complete();
        $this->travel(7)->days();
        $this->actingAs($this->parent)->patch(route('goals.settings', $this->member), ['weekly_target' => 8, 'weekly_stars' => 2])->assertRedirect();
        $goals = app(GoalService::class);
        $this->assertSame(0.0, $goals->points($this->member, today()));
        $this->assertSame(1, $goals->balance($this->member));
        $this->assertSame(5, WeeklyGoal::oldest('week_start')->first()->target_points);
        $this->actingAs($this->child)->get(route('goals.index'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('goals/index')->where('members.0.week_points', 0)->where('members.0.star_balance', 1)->where('members.0.weekly_target', 8));
    }

    public function test_late_approval_credits_original_week(): void
    {
        $completion = $this->complete($this->child);
        $this->travel(7)->days();
        $this->member->forceFill(['weekly_target' => 50])->save();
        app(CompletionService::class)->review($completion, $this->parent, true, [$this->member->id]);
        $this->assertSame(0.0, app(GoalService::class)->points($this->member, today()));
        $this->assertSame(1, app(GoalService::class)->balance($this->member));
    }

    public function test_child_cannot_manage_goals_claim_other_member_or_undo_approved_work(): void
    {
        $completion = $this->complete();
        $other = Member::create(['name' => 'Vanessa', 'color' => '#123456']);
        $this->actingAs($this->child);
        $this->patch(route('goals.settings', $this->member), ['weekly_target' => 1, 'weekly_stars' => 10])->assertForbidden();
        $this->patch(route('goals.link-account', $this->child), ['member_id' => $other->id])->assertForbidden();
        $this->post(route('goals.review-completion', $completion), ['decision' => 'approve'])->assertForbidden();
        $this->post(route('goals.target'), ['member_id' => $other->id, 'reward_id' => $this->reward()->id])->assertForbidden();
        $this->get(route('goals.index', ['member_id' => $other->id]))->assertForbidden();
        $this->delete(route('tasks.undo', $this->task))->assertForbidden();
        $this->assertSame(5.0, app(GoalService::class)->points($this->member));
    }

    public function test_account_link_is_unique_and_unlinked_children_cannot_complete(): void
    {
        $unlinked = User::factory()->create();
        $this->actingAs($unlinked)->get(route('goals.index'))->assertOk()->assertInertia(fn (Assert $page) => $page->where('selectedMemberId', null)->has('members', 0));
        $this->post(route('tasks.complete', $this->task), ['member_ids' => [$this->member->id]])->assertSessionHasErrors('member_ids');
        $this->actingAs($this->parent)->patch(route('goals.link-account', $unlinked), ['member_id' => $this->member->id])->assertSessionHasErrors('member_id');
    }

    public function test_earned_points_survive_task_deletion_and_member_cannot_be_deleted(): void
    {
        $this->complete();
        $this->task->delete();
        $this->assertSame(5.0, app(GoalService::class)->points($this->member));
        $this->assertNull(PointEntry::first()->task_completion_id);
        $this->actingAs($this->parent)->delete(route('members.destroy', $this->member))->assertSessionHasErrors('member');
    }

    public function test_inactive_reward_and_insufficient_balance_are_rejected(): void
    {
        $reward = $this->reward();
        $this->actingAs($this->child)->post(route('goals.request-reward'), ['member_id' => $this->member->id, 'reward_id' => $reward->id])->assertSessionHasErrors('reward_id');
        $this->complete();
        $reward->update(['is_active' => false]);
        $this->post(route('goals.request-reward'), ['member_id' => $this->member->id, 'reward_id' => $reward->id])->assertSessionHasErrors('reward_id');
        $this->assertSame(1, app(GoalService::class)->balance($this->member));
    }
}
