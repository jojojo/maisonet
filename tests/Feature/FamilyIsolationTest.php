<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\Member;
use App\Models\PointEntry;
use App\Models\Reward;
use App\Models\RewardRequest;
use App\Models\Room;
use App\Models\Task;
use App\Models\User;
use App\Services\CompletionService;
use App\Services\RewardRequestService;
use App\Support\FamilyContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FamilyIsolationTest extends TestCase
{
    use RefreshDatabase;

    private array $one;

    private array $two;

    protected function setUp(): void
    {
        parent::setUp();
        $this->one = $this->household(Family::firstOrFail(), 'One');
        $this->two = $this->household(Family::create(['name' => 'Other household']), 'Two');
    }

    private function household(Family $family, string $name): array
    {
        return app(FamilyContext::class)->run($family->id, function () use ($family, $name) {
            $user = User::factory()->create(['family_id' => $family->id, 'is_parent' => true]);
            $room = Room::create(['name' => "Room $name", 'icon' => 'R']);
            $member = Member::create(['name' => "Member $name", 'color' => '#123456']);
            $member->forceFill(['weekly_target' => 5])->save();
            $task = Task::create(['room_id' => $room->id, 'title' => "Task $name", 'recurrence' => 'daily', 'interval' => 1, 'effort_size' => 'L', 'next_due_date' => today()]);
            $task->members()->sync([$member->id]);
            $completion = app(CompletionService::class)->complete($task, [$member->id], $user);
            $reward = Reward::create(['template_key' => 'shared-template', 'title' => "Reward $name", 'category' => 'together', 'icon' => 'G', 'star_cost' => 1, 'is_active' => true, 'audience' => 'family']);
            $request = app(RewardRequestService::class)->request($member, $reward, $user);

            return compact('family', 'user', 'room', 'member', 'task', 'completion', 'reward', 'request');
        });
    }

    public function test_family_lists_and_shared_props_exclude_other_households(): void
    {
        $this->actingAs($this->one['user']);
        foreach (['dashboard', 'planning', 'tasks.index', 'rooms.index', 'members.index', 'rewards.index', 'goals.index', 'family.index', 'task-templates.index'] as $route) {
            $this->get(route($route))->assertOk()->assertInertia(fn (Assert $page) => $page
                ->has('rooms', 1)->where('rooms.0.id', $this->one['room']->id)
                ->has('members', 1)->where('members.0.id', $this->one['member']->id)
                ->where('household.id', $this->one['family']->id));
        }
        $this->get(route('goals.index'))->assertInertia(fn (Assert $page) => $page
            ->has('accounts', 1)->where('accounts.0.id', $this->one['user']->id)
            ->has('pointHistory', 1)->where('pointHistory.0.task_title', 'Task One')
            ->has('requests', 1)->where('requests.0.id', $this->one['request']->id));
        $this->post(route('kiosk.enter'));
        $this->get(route('kiosk.index'))->assertInertia(fn (Assert $page) => $page->has('tasks', 1)->where('tasks.0.id', $this->one['task']->id));
    }

    public function test_foreign_resource_urls_are_not_bound(): void
    {
        $this->actingAs($this->one['user']);
        $this->get(route('rooms.show', $this->two['room']))->assertNotFound();
        $this->delete(route('rooms.destroy', $this->two['room']))->assertNotFound();
        $this->put(route('tasks.update', $this->two['task']), [])->assertNotFound();
        $this->post(route('tasks.complete', $this->two['task']), [])->assertNotFound();
        $this->delete(route('tasks.undo', $this->two['task']))->assertNotFound();
        $this->patch(route('rewards.update', $this->two['reward']), ['is_active' => false])->assertNotFound();
        $this->patch(route('rewards.parents.update', $this->two['user']), ['is_parent' => true])->assertNotFound();
        $this->patch(route('goals.link-account', $this->two['user']), ['member_id' => $this->one['member']->id])->assertNotFound();
        $this->patch(route('goals.settings', $this->two['member']), ['weekly_target' => 1, 'weekly_stars' => 10])->assertNotFound();
        $this->post(route('goals.review-completion', $this->two['completion']), ['decision' => 'approve'])->assertNotFound();
        $this->post(route('goals.review-request', $this->two['request']), ['action' => 'reject'])->assertNotFound();
        $this->assertDatabaseHas('tasks', ['id' => $this->two['task']->id, 'title' => 'Task Two']);
    }

    public function test_foreign_ids_cannot_be_assigned_in_payloads_or_filters(): void
    {
        $this->actingAs($this->one['user']);
        $payload = ['title' => 'Injected', 'room_id' => $this->two['room']->id, 'member_ids' => [$this->two['member']->id], 'recurrence' => 'daily', 'interval' => 1, 'next_due_date' => today()->toDateString(), 'family_id' => $this->two['family']->id];
        $this->post(route('tasks.store'), $payload)->assertSessionHasErrors(['room_id', 'member_ids.0']);
        $this->post(route('tasks.complete', $this->one['task']), ['member_ids' => [$this->two['member']->id]])->assertSessionHasErrors('member_ids.0');
        $this->post(route('task-templates.store'), ['room_id' => $this->two['room']->id, 'member_ids' => [$this->two['member']->id]])->assertSessionHasErrors(['room_id', 'member_ids.0']);
        $this->patch(route('goals.link-account', $this->one['user']), ['member_id' => $this->two['member']->id])->assertSessionHasErrors('member_id');
        $this->post(route('goals.target'), ['member_id' => $this->one['member']->id, 'reward_id' => $this->two['reward']->id])->assertSessionHasErrors('reward_id');
        $this->post(route('goals.request-reward'), ['member_id' => $this->two['member']->id, 'reward_id' => $this->two['reward']->id])->assertSessionHasErrors(['member_id', 'reward_id']);
        $this->get(route('goals.index', ['member_id' => $this->two['member']->id]))->assertSessionHasErrors('member_id');
        $this->post(route('tasks.store'), [...$payload, 'room_id' => $this->one['room']->id, 'member_ids' => [$this->one['member']->id]])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('tasks', ['title' => 'Injected', 'family_id' => $this->one['family']->id]);
    }

    public function test_the_last_parent_is_checked_within_the_family(): void
    {
        $this->actingAs($this->one['user']);
        $this->patch(route('rewards.parents.update', $this->one['user']), ['is_parent' => false])->assertSessionHasErrors('parent_access');
        User::factory()->create(['family_id' => $this->one['family']->id]);
        $this->delete(route('profile.destroy'), ['password' => 'password'])->assertSessionHasErrors('password');
        $this->assertTrue($this->one['user']->fresh()->is_parent);
    }

    public function test_codes_are_private_encrypted_and_rotatable(): void
    {
        $family = $this->one['family'];
        $code = $family->invitation_code;
        $this->assertNotSame($code, $family->getRawOriginal('invitation_code'));
        $this->assertArrayNotHasKey('invitation_code', $family->toArray());
        $this->actingAs($this->one['user'])->post(route('family.renew-code'))->assertSessionHasNoErrors();
        $newCode = $family->fresh()->invitation_code;
        $this->assertNotSame($code, $newCode);
        $this->post(route('logout'));
        $data = ['family_action' => 'join', 'name' => 'New child', 'email' => 'new@example.invalid', 'password' => 'password', 'password_confirmation' => 'password'];
        $this->post(route('register'), [...$data, 'family_code' => $code])->assertSessionHasErrors('family_code');
        $this->post(route('register'), [...$data, 'family_code' => $newCode])->assertSessionHasNoErrors();
        $this->assertAuthenticated();
        $this->assertFalse(auth()->user()->is_parent);
        $this->get(route('family.index'))->assertInertia(fn (Assert $page) => $page->where('invitationCode', null)->has('accounts', 0));
        $this->post(route('family.renew-code'))->assertForbidden();
        $this->patch(route('family.update'), ['name' => 'Changed'])->assertForbidden();
    }

    public function test_recurrence_points_and_rewards_remain_in_the_correct_family(): void
    {
        $this->actingAs($this->two['user']);
        $this->assertSame([$this->two['member']->id], Member::pluck('id')->all());
        $this->assertSame(1, Reward::where('template_key', 'shared-template')->count());
        $this->assertSame(5.0, (float) PointEntry::sum('points'));
        $this->assertSame(1, RewardRequest::count());
        $this->assertSame($this->two['completion']->id, $this->two['task']->fresh()->completion_info['id']);
        $this->assertDatabaseCount('rewards', 2);
    }

    public function test_families_cannot_be_changed_through_profile_or_family_payloads(): void
    {
        $this->actingAs($this->one['user']);
        $this->patch(route('family.update'), ['name' => 'Our new name', 'family_id' => $this->two['family']->id])->assertSessionHasNoErrors();
        $this->assertSame('Our new name', $this->one['family']->fresh()->name);
        $this->assertSame('Other household', $this->two['family']->fresh()->name);
        $this->patch(route('profile.update'), ['name' => 'New name', 'email' => $this->one['user']->email, 'family_id' => $this->two['family']->id, 'is_parent' => false])->assertSessionHasNoErrors();
        $this->assertSame($this->one['family']->id, $this->one['user']->fresh()->family_id);
        $this->assertTrue($this->one['user']->fresh()->is_parent);
    }

    public function test_queries_without_an_authenticated_or_explicit_family_fail_closed(): void
    {
        app(FamilyContext::class)->setFallback(null);
        $this->assertSame(0, Task::count());
        $this->assertSame(0, Member::count());
        $this->assertSame(0, PointEntry::count());
        $this->assertSame(2, DB::table('tasks')->count());
    }

    public function test_a_new_family_starts_with_its_own_parent_and_generic_rooms(): void
    {
        $this->post(route('register'), ['family_action' => 'create', 'family_name' => 'Fresh family', 'name' => 'New parent', 'email' => 'new-parent@example.invalid', 'password' => 'password', 'password_confirmation' => 'password'])->assertSessionHasNoErrors();
        $user = auth()->user();
        $this->assertTrue($user->is_parent);
        $this->assertNotContains($user->family_id, [$this->one['family']->id, $this->two['family']->id]);
        $this->assertSame('Fresh family', $user->family->name);
        $this->assertSame(5, Room::count());
        $this->assertSame(1, Member::count());
        $this->assertSame($user->member_id, Member::first()->id);
        $this->assertSame(0, Task::count());
        $this->assertSame(0, RewardRequest::count());
    }
}
