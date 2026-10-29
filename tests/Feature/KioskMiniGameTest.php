<?php

namespace Tests\Feature;

use App\Actions\Kiosk\ProposeMiniGame;
use App\Models\Member;
use App\Models\Room;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Lottery;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class KioskMiniGameTest extends TestCase
{
    use RefreshDatabase;

    private Member $member;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 29)->startOfDay());
        $parent = User::factory()->create(['is_parent' => true]);
        $this->member = Member::create(['name' => 'Gabriel', 'color' => '#123456']);
        $this->room = Room::create(['name' => 'Cuisine', 'icon' => 'C']);
        $this->actingAs($parent)->withSession(['kiosk' => true]);
    }

    protected function tearDown(): void
    {
        Lottery::determineResultNormally();
        parent::tearDown();
    }

    private function task(): Task
    {
        return Task::create(['room_id' => $this->room->id, 'title' => 'Vaisselle', 'recurrence' => 'daily', 'interval' => 1, 'effort_size' => 'L', 'next_due_date' => today()]);
    }

    private function complete(Task $task)
    {
        return $this->post(route('kiosk.complete', $task), ['member_ids' => [$this->member->id]]);
    }

    public function test_a_normal_completion_can_have_no_game_and_still_waits_for_parent_review(): void
    {
        Lottery::alwaysLose();
        $task = $this->task();
        $this->complete($task)->assertRedirect()->assertSessionMissing('kiosk_mini_game')->assertSessionMissing('kiosk_bonus');
        $this->assertSame('pending', $task->completions()->sole()->status);
        $this->assertDatabaseCount('point_entries', 0);
        $this->assertDatabaseCount('star_transactions', 0);
    }

    public function test_a_game_offer_is_shared_after_successful_recording_without_awarding_points(): void
    {
        Lottery::alwaysWin();
        $task = $this->task();
        $this->complete($task)->assertRedirect()->assertSessionHas('kiosk_mini_game', fn ($offer) => in_array($offer['game'], ProposeMiniGame::GAMES));
        $offer = session('kiosk_mini_game');
        $this->assertSame($task->completions()->sole()->id, $offer['completion_id']);
        $this->get(route('kiosk.index'))->assertOk()->assertInertia(fn (Assert $page) => $page->where('flash.kiosk_mini_game', $offer));
        $this->assertDatabaseCount('point_entries', 0);
        $this->assertDatabaseCount('star_transactions', 0);
    }

    public function test_cooldown_applies_even_if_offer_was_declined_and_next_game_is_different(): void
    {
        Lottery::alwaysWin();
        $this->complete($this->task())->assertRedirect();
        $first = session('kiosk_mini_game.game');
        $this->travel(5)->minutes();
        $this->complete($this->task())->assertSessionMissing('kiosk_mini_game');
        $this->travel(6)->minutes();
        $this->complete($this->task())->assertSessionHas('kiosk_mini_game', fn ($offer) => in_array($offer['game'], ProposeMiniGame::GAMES) && $offer['game'] !== $first);
    }

    public function test_repeated_completion_cannot_reroll_even_after_cooldown_expires(): void
    {
        Lottery::alwaysWin();
        $task = $this->task();
        $this->complete($task)->assertRedirect();
        $this->travel(11)->minutes();
        $this->complete($task)->assertRedirect()->assertSessionMissing('kiosk_mini_game');
        $this->assertDatabaseCount('task_completions', 1);
    }

    public function test_failed_validation_and_skipping_an_occurrence_cannot_offer_a_game(): void
    {
        Lottery::alwaysWin();
        $task = $this->task();
        $this->post(route('kiosk.complete', $task), ['member_ids' => []])->assertSessionHasErrors('member_ids')->assertSessionMissing('kiosk_bonus');
        $this->post(route('kiosk.skip', $task), ['due_on' => today()->toDateString(), 'password' => 'password'])->assertRedirect()->assertSessionMissing('kiosk_bonus');
        $this->assertSame('skipped', $task->completions()->sole()->status);
    }
}
