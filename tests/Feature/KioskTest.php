<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\Room;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class KioskTest extends TestCase
{
    use RefreshDatabase;

    private function parentAccount(): User
    {
        return User::factory()->create(['is_parent' => true, 'password' => 'parent-test-password']);
    }

    private function task(): Task
    {
        $room = Room::create(['name' => 'Cuisine', 'icon' => 'C']);

        return Task::create(['room_id' => $room->id, 'title' => 'Vaisselle', 'recurrence' => 'daily', 'interval' => 1, 'effort_size' => 'L', 'next_due_date' => today()]);
    }

    public function test_only_a_parent_can_start_a_kiosk(): void
    {
        $this->get(route('kiosk.index'))->assertRedirect(route('login'));
        $this->actingAs(User::factory()->create())->get(route('kiosk.index'))->assertForbidden();
        $this->post(route('kiosk.enter'))->assertForbidden();
        $this->actingAs($this->parentAccount())->get(route('kiosk.index'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('kiosk')->where('active', false)->has('tasks', 0));
        $this->post(route('kiosk.enter'))->assertRedirect(route('kiosk.index'))->assertSessionHas('kiosk', true);
    }

    public function test_kiosk_blocks_settings_and_other_routes_even_for_parent_accounts(): void
    {
        $parent = $this->parentAccount();
        $task = $this->task();
        $this->actingAs($parent)->withSession(['kiosk' => true]);
        foreach (['dashboard', 'goals.index', 'members.index', 'profile.edit'] as $route) {
            $this->get(route($route))->assertRedirect(route('kiosk.index'));
        }
        $this->post(route('tasks.complete', $task))->assertForbidden();
        $this->delete(route('tasks.destroy', $task))->assertForbidden();
        $this->patch(route('rewards.parents.update', $parent), ['is_parent' => false])->assertForbidden();
        $this->assertDatabaseHas('tasks', ['id' => $task->id]);
        $this->assertTrue($parent->fresh()->is_parent);
    }

    public function test_leaving_requires_the_account_password(): void
    {
        $this->actingAs($this->parentAccount())->withSession(['kiosk' => true]);
        $this->post(route('kiosk.leave'), ['password' => 'wrong-password'])->assertSessionHasErrors('password')->assertSessionHas('kiosk', true);
        $this->post(route('kiosk.leave'), ['password' => 'parent-test-password'])->assertRedirect(route('dashboard'))->assertSessionMissing('kiosk');
        $this->get(route('dashboard'))->assertOk();
    }

    public function test_kiosk_declarations_wait_for_review_despite_parent_session(): void
    {
        $parent = $this->parentAccount();
        $task = $this->task();
        $members = collect(['Gabriel', 'Valentine'])->map(fn ($name) => Member::create(['name' => $name, 'color' => '#123456']));
        $this->actingAs($parent)->withSession(['kiosk' => true]);
        for ($i = 0; $i < 2; $i++) {
            $this->post(route('kiosk.complete', $task), ['member_ids' => $members->pluck('id')->all()])->assertRedirect();
        }
        $this->assertDatabaseCount('task_completions', 1);
        $this->assertDatabaseHas('task_completions', ['task_id' => $task->id, 'status' => 'pending', 'submitted_by' => $parent->id]);
        $this->assertDatabaseCount('completion_participants', 2);
        $this->assertDatabaseCount('point_entries', 0);
        $this->assertDatabaseCount('star_transactions', 0);
        $this->get(route('kiosk.index'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('kiosk')->where('active', true)->where('completedToday', 1));
    }

    public function test_kiosk_completion_requires_active_session_and_real_participants(): void
    {
        $task = $this->task();
        $this->actingAs($this->parentAccount())->post(route('kiosk.complete', $task), ['member_ids' => []])->assertForbidden();
        $this->withSession(['kiosk' => true])->post(route('kiosk.complete', $task), ['member_ids' => []])->assertSessionHasErrors('member_ids');
        $this->post(route('kiosk.complete', $task), ['member_ids' => [9999]])->assertSessionHasErrors('member_ids.0');
        $this->assertDatabaseCount('task_completions', 0);
    }

    public function test_logging_out_clears_kiosk_mode(): void
    {
        $this->actingAs($this->parentAccount())->withSession(['kiosk' => true])->post(route('logout'))->assertSessionMissing('kiosk');
        $this->get(route('kiosk.index'))->assertRedirect(route('login'));
    }
}
