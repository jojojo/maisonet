<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ParentGamesTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_must_sign_in(): void
    {
        $this->get(route('parents.games'))->assertRedirect(route('login'));
    }

    public function test_children_cannot_open_the_library_directly(): void
    {
        $this->actingAs(User::factory()->create(['is_parent' => false]))
            ->get(route('parents.games'))->assertForbidden();
    }

    public function test_parents_can_open_the_library_without_creating_activity_or_points(): void
    {
        $this->actingAs(User::factory()->create(['is_parent' => true]))
            ->get(route('parents.games'))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('parents/games'));

        $this->assertDatabaseCount('task_completions', 0);
        $this->assertDatabaseCount('point_entries', 0);
        $this->assertDatabaseCount('star_transactions', 0);
    }

    public function test_active_kiosk_cannot_bypass_the_parent_password_to_open_the_library(): void
    {
        $this->actingAs(User::factory()->create(['is_parent' => true]))
            ->withSession(['kiosk' => true])
            ->get(route('parents.games'))->assertRedirect(route('kiosk.index'));
    }
}
