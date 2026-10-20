<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register()
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_joining_requires_a_valid_family_code_and_does_not_grant_parent_access(): void
    {
        $data = ['name' => 'Parent', 'email' => 'parent@example.com', 'password' => 'password', 'password_confirmation' => 'password'];
        $this->post('/register', [...$data, 'family_action' => 'create', 'family_name' => 'Our family'])->assertSessionHasNoErrors();
        $parent = User::firstWhere('email', $data['email']);
        $code = $parent->family->invitation_code;
        $this->post(route('logout'));
        $join = [...$data, 'family_action' => 'join', 'email' => 'child@example.com', 'is_parent' => true, 'family_id' => 999];
        $this->post('/register', [...$join, 'family_code' => 'INVALID'])->assertSessionHasErrors('family_code');
        $this->assertGuest();
        $this->post('/register', [...$join, 'family_code' => strtolower(str_replace('-', ' ', $code))])->assertSessionHasNoErrors();
        $child = User::firstWhere('email', 'child@example.com');
        $this->assertSame($parent->family_id, $child->family_id);
        $this->assertFalse($child->is_parent);
        $this->assertNull($child->member_id);
    }
}
