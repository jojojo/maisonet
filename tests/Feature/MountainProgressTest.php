<?php

namespace Tests\Feature;

use App\Actions\Goals\SyncMountainProgress;
use App\Actions\Goals\UpdateGoalSettings;
use App\Models\Member;
use App\Models\MountainGoal;
use App\Models\PointEntry;
use App\Models\StarTransaction;
use App\Models\WeeklyGoal;
use App\Services\GoalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MountainProgressTest extends TestCase
{
    use RefreshDatabase;

    private function member(): Member
    {
        $member = Member::create(['name' => 'Clément', 'color' => '#123456']);
        $member->forceFill(['weekly_target' => 20, 'weekly_stars' => 1])->save();

        return $member;
    }

    private function points(Member $member, float $points): PointEntry
    {
        return PointEntry::create(['member_id' => $member->id, 'task_title' => 'Mission', 'completed_on' => today(), 'points' => $points, 'is_void' => false]);
    }

    public function test_a_monday_never_resets_an_unfinished_mountain(): void
    {
        $this->travelTo(now()->setDate(2026, 11, 1));
        $member = $this->member();
        $this->points($member, 18);
        $first = SyncMountainProgress::run($member);
        $this->travel(8)->days();
        $current = SyncMountainProgress::run($member);
        $this->assertSame($first->id, $current->id);
        $this->assertSame('18.00', $current->points);
        $this->assertSame(0, app(GoalService::class)->balance($member));
    }

    public function test_excess_is_consumed_and_one_big_realization_never_earns_multiple_summits(): void
    {
        $member = $this->member();
        $this->points($member, 18);
        SyncMountainProgress::run($member);
        $this->points($member, 100);
        $current = SyncMountainProgress::run($member);
        $this->assertSame(2, $current->sequence);
        $this->assertSame('0.00', $current->points);
        $this->assertSame(1, app(GoalService::class)->balance($member));
        $this->assertSame('118.00', MountainGoal::first()->points);
        $this->assertSame(118.0, app(GoalService::class)->points($member));
        SyncMountainProgress::run($member);
        $this->assertDatabaseCount('star_transactions', 1);
    }

    public function test_several_summits_can_be_earned_in_one_week_without_fractional_carry(): void
    {
        $member = $this->member();
        foreach ([19.31, 1, 19.5, 1, 2.25] as $points) {
            $this->points($member, $points);
            $current = SyncMountainProgress::run($member);
        }
        $this->assertSame(3, $current->sequence);
        $this->assertSame('2.25', $current->points);
        $this->assertSame(2, app(GoalService::class)->balance($member));
        $this->assertDatabaseCount('star_transactions', 2);
    }

    public function test_undo_replays_whole_realizations_and_revokes_unearned_stars_once(): void
    {
        $member = $this->member();
        $entries = [];
        foreach ([18, 3, 18, 3, 2] as $points) {
            $entries[] = $this->points($member, $points);
            SyncMountainProgress::run($member);
        }
        $this->assertSame(2, app(GoalService::class)->balance($member));
        $entries[0]->update(['is_void' => true]);
        $current = SyncMountainProgress::run($member);
        $this->assertSame(2, $current->sequence);
        $this->assertSame('5.00', $current->points);
        $this->assertSame(1, app(GoalService::class)->balance($member));
        SyncMountainProgress::run($member);
        $this->assertSame(1, app(GoalService::class)->balance($member));
    }

    public function test_parent_settings_do_not_rewrite_earned_stars_or_the_current_mountain(): void
    {
        $member = $this->member();
        $this->points($member, 18);
        SyncMountainProgress::run($member);
        UpdateGoalSettings::run($member, ['target_points' => 10, 'reward_stars' => 2]);
        $this->points($member, 3);
        $next = SyncMountainProgress::run($member);
        $this->assertSame(10, $next->target_points);
        $this->assertSame(2, $next->reward_stars);
        $this->assertSame(1, app(GoalService::class)->balance($member));
        $this->points($member, 10);
        SyncMountainProgress::run($member);
        $this->assertSame(3, app(GoalService::class)->balance($member));
    }

    public function test_migration_preserves_old_stars_without_awarding_the_same_points_twice(): void
    {
        $migration = require database_path('migrations/2026_11_01_000001_create_continuous_mountains.php');
        $migration->down();
        $member = $this->member();
        $this->travelTo(now()->setDate(2026, 10, 20));
        $old = $this->points($member, 6);
        $weekly = WeeklyGoal::create(['member_id' => $member->id, 'week_start' => '2026-10-19', 'target_points' => 5, 'reward_stars' => 1]);
        $award = StarTransaction::create(['member_id' => $member->id, 'weekly_goal_id' => $weekly->id, 'type' => 'goal', 'amount' => 1]);
        $this->travel(7)->days();
        $this->points($member, 2);
        $migration->up();
        $current = SyncMountainProgress::run($member);
        $this->assertSame('2.00', $current->points);
        $this->assertSame(2, $current->sequence);
        $this->assertSame(1, app(GoalService::class)->balance($member));
        $this->assertSame(8.0, app(GoalService::class)->points($member));
        $this->assertNotNull($award->fresh()->mountain_goal_id);
        $this->assertTrue(MountainGoal::find($old->fresh()->mountain_goal_id)->legacy);
        $this->assertDatabaseCount('star_transactions', 1);
    }
}
