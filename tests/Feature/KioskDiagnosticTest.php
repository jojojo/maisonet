<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class KioskDiagnosticTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_write_diagnostics(): void
    {
        $this->postJson('/kiosk/diagnostics', ['message' => 'Error', 'kind' => 'runtime'])->assertUnauthorized();
    }

    public function test_locked_kiosk_can_record_a_bounded_diagnostic_without_unlocking(): void
    {
        $user = User::factory()->create(['is_parent' => true]);
        File::shouldReceive('append')->once()->withArgs(function ($path, $line, $lock) use ($user) {
            $record = json_decode($line, true);

            return $path === storage_path('app/kiosk-diagnostics.jsonl') && $lock
                && $record['user_id'] === $user->id && $record['family_id'] === $user->family_id
                && $record['message'] === 'Unsupported API' && $record['kind'] === 'render';
        })->andReturn(1);
        $this->actingAs($user)->withSession(['kiosk' => true, 'full_interface_trial' => true])
            ->postJson('/kiosk/diagnostics', ['message' => 'Unsupported API', 'stack' => 'kiosk.js:1', 'kind' => 'render'])
            ->assertNoContent()->assertSessionHas('kiosk', true);
    }

    public function test_invalid_diagnostics_are_rejected(): void
    {
        $this->actingAs(User::factory()->create(['is_parent' => true]))
            ->postJson('/kiosk/diagnostics', ['message' => str_repeat('x', 1001), 'kind' => 'other'])
            ->assertUnprocessable()->assertJsonValidationErrors(['message', 'kind']);
    }
}
