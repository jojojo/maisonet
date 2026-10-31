<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\Member;
use App\Models\Room;
use App\Models\Task;
use App\Models\User;
use App\Support\FamilyContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompatibleKioskTest extends TestCase
{
    use RefreshDatabase;

    private const IPAD = 'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 Version/12.1.2 Mobile/15E148 Safari/604.1';

    public function test_old_ios_entry_points_redirect_to_standalone_pages(): void
    {
        $this->withHeader('User-Agent', self::IPAD);
        foreach (['/', '/mobile'] as $path) {
            $this->get($path)->assertRedirect(route('kiosk.compatibility.index'));
        }
        $this->get('/kiosk')->assertRedirect(route('login'));
        $this->get('/login')->assertRedirect(route('compatibility.login'));
        $this->get(route('compatibility.login'))->assertOk()->assertViewIs('compatibility.login')
            ->assertSee('autocomplete="username"', false)->assertDontSee('type="module"', false)->assertDontSee('/build/');
        $this->actingAs(User::factory()->create(['is_parent' => true]));
        foreach (['/dashboard', '/kiosk', '/planning', '/rooms', '/goals', '/parents/games'] as $path) {
            $this->get($path)->assertRedirect(route('kiosk.compatibility.index'));
        }
    }

    public function test_chrome_on_old_ios_uses_the_same_compatible_entry_point(): void
    {
        $this->withHeader('User-Agent', str_replace('Version/12.1.2', 'CriOS/92.0.4515.90', self::IPAD))
            ->get('/login')->assertRedirect(route('compatibility.login'));
    }

    public function test_modern_safari_keeps_the_existing_interface(): void
    {
        $this->withHeader('User-Agent', str_replace('12_5_7', '16_4', self::IPAD))
            ->get('/login')->assertOk()->assertViewIs('app');
    }

    public function test_compatible_login_uses_existing_authentication_and_returns_to_kiosk(): void
    {
        $user = User::factory()->create(['is_parent' => true]);
        $this->get(route('compatibility.login'))->assertOk();
        $this->from(route('compatibility.login'))->post('/login', ['email' => $user->email, 'password' => 'incorrect'])
            ->assertRedirect(route('compatibility.login'))->assertSessionHasErrors('email');
        $this->assertGuest();
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertRedirect(route('kiosk.compatibility.index'));
        $this->assertAuthenticatedAs($user);
    }

    public function test_kiosk_requires_authentication_and_parent_activation(): void
    {
        $this->get(route('kiosk.compatibility.index'))->assertRedirect(route('login'));
        $child = User::factory()->create(['is_parent' => false]);
        $this->actingAs($child)->get(route('kiosk.compatibility.index'))->assertOk()->assertSee('Un parent doit préparer cet iPad');
        $this->post(route('kiosk.compatibility.enter'))->assertForbidden();
        $this->actingAs(User::factory()->create(['is_parent' => true]))
            ->get(route('kiosk.compatibility.index'))->assertSee('Activer le kiosque')->assertDontSee('Qui participe ?');
        $this->post(route('kiosk.compatibility.enter'))->assertRedirect(route('kiosk.compatibility.index'))->assertSessionHas('kiosk', true);
        $this->get('/parents/games')->assertRedirect(route('kiosk.index'));
    }

    public function test_completing_with_multiple_participants_is_pending_and_idempotent(): void
    {
        [$task, $members] = $this->prepareBoard();
        $this->get(route('kiosk.compatibility.index'))->assertOk()->assertViewIs('compatibility.kiosk')
            ->assertSee($task->title)->assertSee('compatibility/kiosk.js')->assertDontSee('type="module"', false)->assertDontSee('/build/');
        $this->post(route('kiosk.compatibility.complete', $task), ['member_ids' => []])->assertSessionHasErrors('member_ids');
        $this->assertDatabaseCount('task_completions', 0);
        foreach ([1, 2] as $attempt) {
            $this->post(route('kiosk.compatibility.complete', $task), ['member_ids' => $members->modelKeys()])
                ->assertRedirect(route('kiosk.compatibility.index'))->assertSessionHas('compatible_completed_task', $task->id)
                ->assertSessionMissing('kiosk_mini_game')->assertSessionMissing('kiosk_bonus');
        }
        $completion = $task->completions()->sole();
        $this->assertSame('pending', $completion->status);
        $this->assertCount(2, $completion->participants);
        $this->assertDatabaseCount('point_entries', 0);
        $this->assertDatabaseCount('star_transactions', 0);
        $this->get(route('kiosk.compatibility.index'))->assertSee('en attente de validation par un parent.');
    }

    public function test_exit_requires_parent_password_and_preserves_kiosk_on_failure(): void
    {
        $this->prepareBoard();
        $this->post(route('kiosk.compatibility.leave'), ['password' => 'wrong'])
            ->assertSessionHasErrors('password')->assertSessionHas('kiosk', true);
        $this->post(route('kiosk.compatibility.leave'), ['password' => 'password'])
            ->assertRedirect(route('kiosk.compatibility.index'))->assertSessionMissing('kiosk');
    }

    public function test_another_familys_tasks_and_members_are_never_accessible(): void
    {
        $other = Family::create(['name' => 'Other']);
        [$foreignTask, $foreignMember] = app(FamilyContext::class)->run($other->id, function () {
            $room = Room::create(['name' => 'Private other room', 'icon' => 'R']);
            $member = Member::create(['name' => 'Private other member', 'color' => '#123456']);
            $task = Task::create(['room_id' => $room->id, 'title' => 'Private other task', 'recurrence' => 'daily', 'interval' => 1, 'next_due_date' => today()]);

            return [$task, $member];
        });
        [$task] = $this->prepareBoard();
        $this->get(route('kiosk.compatibility.index'))->assertDontSee('Private other');
        $this->post(route('kiosk.compatibility.complete', $foreignTask), ['member_ids' => [$foreignMember->id]])->assertNotFound();
        $this->post(route('kiosk.compatibility.complete', $task), ['member_ids' => [$foreignMember->id]])->assertSessionHasErrors('member_ids.0');
        $this->assertDatabaseCount('task_completions', 0);
    }

    private function prepareBoard(): array
    {
        $this->actingAs(User::factory()->create(['is_parent' => true]))->withSession(['kiosk' => true]);
        $room = Room::create(['name' => 'Cuisine', 'icon' => 'R']);
        $members = Member::query()->getModel()->newCollection([
            Member::create(['name' => 'Clément', 'color' => '#123456']),
            Member::create(['name' => 'Valentine', 'color' => '#654321']),
        ]);
        $task = Task::create(['room_id' => $room->id, 'title' => 'Mission compatible', 'recurrence' => 'daily', 'interval' => 1, 'effort_size' => 'L', 'next_due_date' => today()]);
        $task->members()->sync($members->modelKeys());

        return [$task, $members];
    }
}
