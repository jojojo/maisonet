<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\Member;
use App\Models\PointEntry;
use App\Models\Room;
use App\Models\Task;
use App\Models\User;
use App\Services\GoalService;
use App\Support\FamilyContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MobileApiTest extends TestCase
{
    use RefreshDatabase;

    private User $parent;

    private User $child;

    private Member $member;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();
        $this->parent = User::factory()->create(['is_parent' => true]);
        $this->member = Member::create(['name' => 'Gabriel', 'color' => '#10b981']);
        $this->member->forceFill(['weekly_target' => 5])->save();
        $this->child = User::factory()->create(['member_id' => $this->member->id]);
        $room = Room::create(['name' => 'Cuisine', 'icon' => 'C']);
        $this->task = Task::create(['room_id' => $room->id, 'title' => 'Vaisselle', 'recurrence' => 'weekly', 'interval' => 1, 'effort_size' => 'L', 'next_due_date' => today()]);
        $this->task->members()->attach($this->member);
    }

    private function token(User $user): string
    {
        return $user->createToken('Test phone', ['mobile'], now()->addDays(30))->plainTextToken;
    }

    private function bearer(string $token): static
    {
        // HTTP requests must resolve the bearer afresh, including after logout or role changes.
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    public function test_real_login_issues_expiring_hashed_token_and_private_bootstrap(): void
    {
        $response = $this->postJson('/api/v1/auth/login', ['email' => $this->child->email, 'password' => 'password', 'device_name' => 'iPad cuisine']);
        $response->assertCreated()->assertJsonPath('token_type', 'Bearer')->assertJsonStructure(['access_token', 'expires_at']);
        $token = $response->json('access_token');
        $this->assertNotSame($token, $this->child->tokens()->sole()->token);
        $this->assertTrue($this->child->tokens()->sole()->expires_at->isFuture());
        $this->bearer($token)->get('/api/v1/me')->assertOk()
            ->assertJsonPath('data.id', $this->child->id)->assertJsonPath('data.is_parent', false)
            ->assertJsonPath('data.family.id', $this->child->family_id)->assertJsonCount(1, 'data.members')
            ->assertJsonMissingPath('data.family.invitation_code')->assertJsonMissingPath('data.password')
            ->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_guest_bad_expired_tokens_and_web_sessions_cannot_access_mobile_api(): void
    {
        $this->get('/api/v1/tasks')->assertUnauthorized()->assertJsonStructure(['message']);
        $this->bearer('invalid')->get('/api/v1/tasks')->assertUnauthorized();
        $expired = $this->child->createToken('Expired', ['mobile'], now()->subMinute())->plainTextToken;
        $this->bearer($expired)->get('/api/v1/tasks')->assertUnauthorized();
        $this->withHeader('Authorization', '')->actingAs($this->parent, 'web')->get('/api/v1/tasks')->assertUnauthorized();
    }

    public function test_bad_credentials_are_generic_and_account_attempts_are_limited(): void
    {
        foreach (range(1, 5) as $_) {
            $this->postJson('/api/v1/auth/login', ['email' => $this->child->email, 'password' => 'wrong', 'device_name' => 'Phone'])->assertUnprocessable()->assertJsonValidationErrors('email');
        }
        $this->postJson('/api/v1/auth/login', ['email' => $this->child->email, 'password' => 'password', 'device_name' => 'Phone'])->assertStatus(429)->assertHeader('Retry-After');
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_child_completion_waits_for_parent_and_review_is_idempotent(): void
    {
        $childToken = $this->token($this->child);
        $parentToken = $this->token($this->parent);
        $response = $this->bearer($childToken)->postJson('/api/v1/tasks/'.$this->task->id.'/complete');
        $response->assertSuccessful()->assertJsonPath('data.status', 'pending')->assertJsonPath('data.participants.0.id', $this->member->id);
        $id = $response->json('data.id');
        $this->assertDatabaseCount('point_entries', 0);
        $this->bearer($childToken)->postJson('/api/v1/tasks/'.$this->task->id.'/complete')->assertSuccessful()->assertJsonPath('data.id', $id);
        $this->bearer($childToken)->get('/api/v1/completions/pending')->assertForbidden();
        $this->bearer($childToken)->postJson('/api/v1/completions/'.$id.'/review', ['decision' => 'approve', 'member_ids' => [$this->member->id]])->assertForbidden();
        $this->bearer($parentToken)->get('/api/v1/completions/pending')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.task.title', 'Vaisselle');
        foreach ([1, 2] as $_) {
            $this->bearer($parentToken)->postJson('/api/v1/completions/'.$id.'/review', ['decision' => 'approve', 'member_ids' => [$this->member->id]])->assertOk()->assertJsonPath('data.status', 'approved');
        }
        $this->assertSame(5.0, app(GoalService::class)->points($this->member));
        $this->assertSame(1, app(GoalService::class)->balance($this->member));
        $this->assertDatabaseCount('point_entries', 1);
        $this->bearer($parentToken)->get('/api/v1/completions/pending')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_parent_completion_is_approved_and_rejection_reopens_child_work(): void
    {
        $childToken = $this->token($this->child);
        $parentToken = $this->token($this->parent);
        $id = $this->bearer($childToken)->postJson('/api/v1/tasks/'.$this->task->id.'/complete')->json('data.id');
        $this->bearer($parentToken)->postJson('/api/v1/completions/'.$id.'/review', ['decision' => 'reject'])->assertOk()->assertJsonPath('data.status', 'rejected');
        $this->assertTrue($this->task->fresh()->next_due_date->isToday());
        $this->bearer($parentToken)->postJson('/api/v1/tasks/'.$this->task->id.'/complete')->assertSuccessful()->assertJsonPath('data.status', 'approved');
        $this->assertSame(5.0, app(GoalService::class)->points($this->member));
    }

    public function test_unlinked_child_cannot_claim_another_member_and_closed_task_conflicts(): void
    {
        $unlinked = User::factory()->create();
        $this->bearer($this->token($unlinked))->postJson('/api/v1/tasks/'.$this->task->id.'/complete', ['member_ids' => [$this->member->id]])->assertUnprocessable()->assertJsonValidationErrors('member_ids');
        $this->bearer($this->token($this->child))->postJson('/api/v1/tasks/'.$this->task->id.'/complete', ['member_ids' => []])->assertUnprocessable();
        $this->task->update(['next_due_date' => null]);
        $this->bearer($this->token($this->parent))->postJson('/api/v1/tasks/'.$this->task->id.'/complete')->assertStatus(409);
    }

    public function test_family_isolation_covers_routes_payloads_lists_and_pending_reviews(): void
    {
        $otherFamily = Family::create(['name' => 'Autre famille']);
        [$otherMember, $otherTask, $completion] = app(FamilyContext::class)->run($otherFamily->id, function () {
            $member = Member::create(['name' => 'Autre enfant', 'color' => '#123456']);
            $room = Room::create(['name' => 'Autre pièce', 'icon' => 'X']);
            $task = Task::create(['room_id' => $room->id, 'title' => 'Secret', 'recurrence' => 'daily', 'interval' => 1, 'next_due_date' => today()]);
            $completion = $task->completions()->create(['completed_on' => today(), 'status' => 'pending']);

            return [$member, $task, $completion];
        });
        $token = $this->token($this->parent);
        $this->bearer($token)->get('/api/v1/tasks')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $this->task->id);
        $this->bearer($token)->get('/api/v1/tasks/'.$otherTask->id)->assertNotFound();
        $this->bearer($token)->postJson('/api/v1/tasks/'.$otherTask->id.'/complete')->assertNotFound();
        $this->bearer($token)->postJson('/api/v1/tasks/'.$this->task->id.'/complete', ['member_ids' => [$otherMember->id]])->assertUnprocessable();
        $this->bearer($token)->postJson('/api/v1/completions/'.$completion->id.'/review', ['decision' => 'approve'])->assertNotFound();
        $this->bearer($token)->get('/api/v1/completions/pending')->assertOk()->assertJsonCount(0, 'data');
        $this->bearer($token)->get('/api/v1/me')->assertOk()->assertJsonCount(1, 'data.members')->assertJsonCount(1, 'data.rooms');
        $otherParent = User::factory()->create(['family_id' => $otherFamily->id, 'is_parent' => true]);
        $otherToken = $this->token($otherParent);
        $this->bearer($otherToken)->get('/api/v1/tasks')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $otherTask->id);
        $this->bearer($otherToken)->get('/api/v1/tasks/'.$this->task->id)->assertNotFound();
        $this->bearer($otherToken)->get('/api/v1/me')->assertOk()->assertJsonPath('data.family.id', $otherFamily->id);
    }

    public function test_personal_tasks_filters_and_pagination(): void
    {
        $this->bearer($this->token($this->child))->get('/api/v1/tasks?mine=1&status=today&per_page=1')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $this->task->id);
        $unlinked = User::factory()->create();
        $this->bearer($this->token($unlinked))->get('/api/v1/tasks?mine=1')->assertOk()->assertJsonCount(0, 'data');
        $this->get('/api/v1/tasks?per_page=1000')->assertUnprocessable();
    }

    public function test_logout_revokes_only_current_device_and_device_access_is_private(): void
    {
        $first = $this->token($this->child);
        $second = $this->token($this->child);
        $other = $this->token($this->parent);
        $foreignId = $this->parent->tokens()->sole()->id;
        $this->bearer($first)->get('/api/v1/auth/devices')->assertOk()->assertJsonCount(2, 'data')->assertJsonMissingPath('data.0.token');
        $this->bearer($first)->delete('/api/v1/auth/devices/'.$foreignId)->assertNotFound();
        $this->bearer($first)->post('/api/v1/auth/logout')->assertNoContent();
        $this->bearer($first)->get('/api/v1/me')->assertUnauthorized();
        $this->bearer($second)->get('/api/v1/me')->assertOk();
        $this->bearer($other)->get('/api/v1/me')->assertOk();
        $id = $this->child->tokens()->sole()->id;
        $this->bearer($second)->delete('/api/v1/auth/devices/'.$id)->assertNoContent();
        $this->bearer($second)->get('/api/v1/me')->assertUnauthorized();
    }

    public function test_password_change_revokes_tokens_and_parent_role_changes_apply_immediately(): void
    {
        $token = $this->token($this->parent);
        $this->parent->forceFill(['is_parent' => false])->save();
        $this->bearer($token)->get('/api/v1/completions/pending')->assertForbidden();
        $this->parent->update(['password' => Hash::make('new-password')]);
        $this->bearer($token)->get('/api/v1/me')->assertUnauthorized();
        $this->assertSame(0, PointEntry::count());
    }
}
