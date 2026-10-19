<?php

namespace Tests\Feature\Auth;

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

    public function test_family_registration_code_is_required_when_configured(): void
    {
        config(['auth.registration_code' => 'family-test-code']);
        $data = [
            'name' => 'Parent', 'email' => 'parent@example.com',
            'password' => 'password', 'password_confirmation' => 'password',
        ];

        $this->post('/register', $data)->assertSessionHasErrors('registration_code');
        $this->post('/register', [...$data, 'registration_code' => 'incorrect'])
            ->assertSessionHasErrors('registration_code');
        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);

        $this->post('/register', [...$data, 'registration_code' => 'family-test-code'])
            ->assertSessionHasNoErrors()->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticated();
    }
}
