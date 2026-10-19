<?php

namespace Tests\Feature;

use App\Models\Reward;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RewardTest extends TestCase
{
    use RefreshDatabase;

    private function parentAccount(): User
    {
        return User::factory()->create(['is_parent' => true]);
    }

    private function reward(array $attributes = []): Reward
    {
        return Reward::create([
            'title' => 'Une soirée jeux', 'category' => 'together', 'star_cost' => 2,
            'audience' => 'family', 'is_active' => false, ...$attributes,
        ]);
    }

    public function test_rewards_require_login(): void
    {
        $this->get(route('rewards.index'))->assertRedirect(route('login'));
        $this->post(route('rewards.store'), [])->assertRedirect(route('login'));
    }

    public function test_other_family_accounts_only_see_active_rewards(): void
    {
        $this->actingAs(User::factory()->create());
        $this->reward(['is_active' => true]);
        $this->reward(['title' => 'Surprise inactive']);

        $this->get(route('rewards.index'))->assertInertia(fn (Assert $page) => $page
            ->component('rewards/index')->where('canManage', false)->has('rewards', 1)
            ->where('rewards.0.title', 'Une soirée jeux')->has('templates', 0)->has('accounts', 0));
    }

    public function test_only_parents_can_activate_edit_or_grant_access(): void
    {
        $parent = $this->parentAccount();
        $child = User::factory()->create();
        $reward = $this->reward();
        $this->actingAs($child);

        $this->post(route('rewards.store'), ['template_key' => 'choose-film', 'is_active' => true])->assertForbidden();
        $this->patch(route('rewards.update', $reward), ['is_active' => true, 'star_cost' => 1])->assertForbidden();
        $this->patch(route('rewards.parents.update', $child), ['is_parent' => true])->assertForbidden();
        $this->patch(route('rewards.parents.update', $parent), ['is_parent' => false])->assertForbidden();
        $this->assertFalse($reward->fresh()->is_active);
        $this->assertFalse($child->fresh()->is_parent);
        $this->assertSame(1, Reward::count());
    }

    public function test_parent_catalogue_starts_with_no_reward_activated(): void
    {
        $this->actingAs($this->parentAccount());
        $this->get(route('rewards.index'))->assertInertia(fn (Assert $page) => $page
            ->where('canManage', true)->has('templates', 28)->has('categories', 5)
            ->has('rewards', 0)->has('accounts', 1)->where('templates.0.reward', null));
        $this->assertSame(0, Reward::count());
    }

    public function test_activation_and_reactivation_preserve_personalisation(): void
    {
        $this->actingAs($this->parentAccount());
        $payload = ['template_key' => 'choose-film', 'is_active' => true];
        $this->post(route('rewards.store'), $payload)->assertSessionHasNoErrors();
        $reward = Reward::firstOrFail();
        $this->assertSame('Choisir le film familial', $reward->title);
        $this->assertSame(1, $reward->star_cost);
        $this->assertTrue($reward->is_active);

        $this->patch(route('rewards.update', $reward), [
            'title' => 'Notre film du samedi', 'star_cost' => 3, 'is_active' => false,
        ])->assertSessionHasNoErrors();
        $this->post(route('rewards.store'), $payload)->assertSessionHasNoErrors();
        $this->assertSame(1, Reward::count());
        $this->assertSame('Notre film du samedi', $reward->fresh()->title);
        $this->assertSame(3, $reward->fresh()->star_cost);
        $this->assertTrue($reward->fresh()->is_active);
    }

    public function test_parents_can_create_and_deactivate_custom_rewards(): void
    {
        $parent = $this->parentAccount();
        $child = User::factory()->create();
        $this->actingAs($parent)->post(route('rewards.store'), [
            'title' => 'Notre défi cuisine', 'description' => 'Une recette à inventer ensemble.',
            'icon' => '🍳', 'category' => 'together', 'star_cost' => 4,
            'audience' => 'family', 'is_active' => true,
        ])->assertSessionHasNoErrors();
        $reward = Reward::firstOrFail();
        $this->assertNull($reward->template_key);
        $this->assertSame('family', $reward->audience);

        $this->actingAs($child)->get(route('rewards.index'))->assertInertia(fn (Assert $page) => $page
            ->has('rewards', 1)->where('rewards.0.star_cost', 4));
        $this->actingAs($parent)->patch(route('rewards.update', $reward), ['is_active' => false])->assertSessionHasNoErrors();
        $this->actingAs($child)->get(route('rewards.index'))->assertInertia(fn (Assert $page) => $page->has('rewards', 0));
        $this->assertSame(1, Reward::count());
    }

    public function test_template_can_be_personalised_before_activation(): void
    {
        $this->actingAs($this->parentAccount())->post(route('rewards.store'), [
            'template_key' => 'picnic', 'title' => 'Notre pique-nique au lac',
            'description' => 'Quand la météo le permet.', 'star_cost' => 4, 'is_active' => false,
        ])->assertSessionHasNoErrors();
        $reward = Reward::firstOrFail();
        $this->assertSame('Notre pique-nique au lac', $reward->title);
        $this->assertSame(4, $reward->star_cost);
        $this->assertFalse($reward->is_active);
        $this->assertSame('outings', $reward->category);
    }

    public function test_invalid_costs_templates_and_categories_are_rejected(): void
    {
        $this->actingAs($this->parentAccount());
        foreach ([
            ['template_key' => 'unknown', 'is_active' => true],
            ['template_key' => 'choose-film', 'star_cost' => 0, 'is_active' => true],
            ['template_key' => 'choose-film', 'star_cost' => 101, 'is_active' => true],
            ['template_key' => 'choose-film', 'audience' => 'unknown', 'is_active' => true],
            ['template_key' => 'choose-film', 'category' => 'unknown', 'is_active' => true],
            ['title' => 'Sans coût', 'is_active' => true],
        ] as $payload) {
            $this->post(route('rewards.store'), $payload)->assertSessionHasErrors();
            $this->assertSame(0, Reward::count());
        }
    }

    public function test_parent_access_can_be_shared_but_last_parent_cannot_be_removed(): void
    {
        $parent = $this->parentAccount();
        $other = User::factory()->create();
        $this->actingAs($parent);
        $this->patch(route('rewards.parents.update', $parent), ['is_parent' => false])->assertSessionHasErrors('parent_access');
        $this->assertTrue($parent->fresh()->is_parent);
        $this->patch(route('rewards.parents.update', $other), ['is_parent' => true])->assertSessionHasNoErrors();
        $this->assertTrue($other->fresh()->is_parent);
        $this->patch(route('rewards.parents.update', $parent), ['is_parent' => false])->assertSessionHasNoErrors();
        $this->assertFalse($parent->fresh()->is_parent);
    }

    public function test_registration_cannot_claim_parent_access(): void
    {
        $data = ['name' => 'Parent', 'email' => 'parent@example.com', 'password' => 'password', 'password_confirmation' => 'password'];
        $this->post(route('register'), $data)->assertSessionHasNoErrors();
        $this->assertTrue(User::firstWhere('email', $data['email'])->is_parent);
        $this->post(route('logout'));
        $this->post(route('register'), [...$data, 'name' => 'Enfant', 'email' => 'child@example.com', 'is_parent' => true])->assertSessionHasNoErrors();
        $this->assertFalse(User::firstWhere('email', 'child@example.com')->is_parent);
    }

    public function test_last_parent_must_assign_another_parent_before_deleting_account(): void
    {
        $parent = $this->parentAccount();
        $other = User::factory()->create();
        $this->actingAs($parent)->delete(route('profile.destroy'), ['password' => 'password'])->assertSessionHasErrors('password');
        $this->assertNotNull($parent->fresh());
        $other->forceFill(['is_parent' => true])->save();
        $this->delete(route('profile.destroy'), ['password' => 'password'])->assertSessionHasNoErrors();
        $this->assertNull($parent->fresh());
    }
}
