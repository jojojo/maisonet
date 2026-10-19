<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\Room;
use App\Models\Task;
use App\Models\User;
use App\Support\TaskCatalogue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TaskTemplateTest extends TestCase
{
    use RefreshDatabase;

    private function room(string $name = 'Chambre Clément'): Room
    {
        return Room::create(['name' => $name, 'icon' => '🏠']);
    }

    private function payload(Room $room, array $extra = []): array
    {
        return [
            'room_id' => $room->id, 'start_date' => '2026-10-19', 'schedule' => 'spread',
            'items' => [['key' => 'make-bed'], ['key' => 'sheets']],
            ...$extra,
        ];
    }

    public function test_catalogue_and_import_require_authentication(): void
    {
        $this->get(route('task-templates.index'))->assertRedirect(route('login'));
        $this->post(route('task-templates.store'), [])->assertRedirect(route('login'));
    }

    public function test_catalogue_suggests_room_type_and_marks_existing_tasks(): void
    {
        $this->actingAs(User::factory()->create());
        $room = $this->room();
        Task::create(['room_id' => $room->id, 'title' => '  PASSER L’ASPIRATEUR ', 'recurrence' => 'weekly']);

        $this->get(route('task-templates.index', ['room_id' => $room->id]))
            ->assertInertia(fn (Assert $page) => $page->component('task-templates/index')
                ->where('defaultRoomId', $room->id)
                ->where('suggestions.'.$room->id, 'bedroom')
                ->where('templates.0.key', 'vacuum')->where('templates.0.existing_room_ids', [$room->id]));
    }

    public function test_bulk_import_uses_template_defaults_and_shared_assignment(): void
    {
        $this->actingAs(User::factory()->create());
        $room = $this->room();
        $otherRoom = $this->room('Chambre Valentine');
        $johan = Member::create(['name' => 'Johan', 'color' => '#3b82f6']);
        $vanessa = Member::create(['name' => 'Vanessa', 'color' => '#ec4899']);

        $this->from(route('task-templates.index'))->post(route('task-templates.store'), $this->payload($room, [
            'member_ids' => [$johan->id, $vanessa->id],
        ]))->assertSessionHasNoErrors()->assertSessionHas('success');

        $this->assertSame(2, $room->tasks()->count());
        $this->assertSame(0, $otherRoom->tasks()->count());
        $bed = Task::firstWhere('template_key', 'make-bed');
        $sheets = Task::firstWhere('template_key', 'sheets');
        $this->assertSame('Faire le lit', $bed->title);
        $this->assertSame('2026-10-20', $bed->next_due_date->toDateString());
        $this->assertSame('2026-11-02', $sheets->next_due_date->toDateString());
        $this->assertSame(3, $sheets->effort_points);
        $this->assertEqualsCanonicalizing([$johan->id, $vanessa->id], $sheets->members->modelKeys());
        $this->assertNull($bed->last_completed_at);
        $this->assertCount(0, $bed->completions);
    }

    public function test_import_is_idempotent_per_room_even_after_task_is_renamed(): void
    {
        $this->actingAs(User::factory()->create());
        $room = $this->room();
        $otherRoom = $this->room('Chambre Gabriel');
        $payload = $this->payload($room);
        $this->post(route('task-templates.store'), $payload)->assertSessionHasNoErrors();
        Task::firstWhere('template_key', 'make-bed')->update(['title' => 'Mon lit personnalisé']);
        $this->post(route('task-templates.store'), $payload)->assertSessionHasNoErrors();
        $this->assertSame(2, $room->tasks()->count());
        $this->assertDatabaseHas('tasks', ['title' => 'Mon lit personnalisé']);

        $this->post(route('task-templates.store'), $this->payload($otherRoom))->assertSessionHasNoErrors();
        $this->assertSame(2, $otherRoom->tasks()->count());
    }

    public function test_manual_duplicates_are_skipped_without_modifying_existing_task(): void
    {
        $this->actingAs(User::factory()->create());
        $room = $this->room();
        $existing = Task::create([
            'room_id' => $room->id, 'title' => ' CHANGER LES DRAPS ', 'notes' => 'À conserver',
            'recurrence' => 'monthly', 'interval' => 1, 'effort_size' => 'L',
            'next_due_date' => '2026-12-01',
        ]);
        $this->post(route('task-templates.store'), $this->payload($room))->assertSessionHasNoErrors();
        $this->assertSame(2, $room->tasks()->count());
        $this->assertSame('À conserver', $existing->fresh()->notes);
        $this->assertSame('2026-12-01', $existing->fresh()->next_due_date->toDateString());
        $this->assertNull($existing->fresh()->template_key);
    }

    public function test_overrides_dates_and_points_are_validated_and_saved(): void
    {
        $this->actingAs(User::factory()->create());
        $room = $this->room('Cuisine');
        $this->post(route('task-templates.store'), $this->payload($room, [
            'start_date' => '2026-01-31',
            'items' => [
                ['key' => 'fridge', 'recurrence' => 'monthly', 'interval' => 1, 'effort_size' => 'XL', 'title' => 'Titre injecté'],
                ['key' => 'oven', 'recurrence' => 'once', 'interval' => 20, 'effort_size' => 'M'],
            ],
        ]))->assertSessionHasNoErrors();
        $fridge = Task::firstWhere('template_key', 'fridge');
        $oven = Task::firstWhere('template_key', 'oven');
        $this->assertSame('Nettoyer le frigo', $fridge->title);
        $this->assertSame('2026-02-28', $fridge->next_due_date->toDateString());
        $this->assertSame(8, $fridge->effort_points);
        $this->assertSame('2026-01-31', $oven->next_due_date->toDateString());
        $this->assertSame(1, $oven->interval);
        $this->assertCount(0, $fridge->members);

        $this->post(route('task-templates.store'), $this->payload($room, [
            'schedule' => 'same_date', 'items' => [['key' => 'sink']],
        ]))->assertSessionHasNoErrors();
        $this->assertSame('2026-10-19', Task::firstWhere('template_key', 'sink')->next_due_date->toDateString());
    }

    public function test_invalid_batch_does_not_partially_import_tasks(): void
    {
        $this->actingAs(User::factory()->create());
        $room = $this->room();
        foreach ([
            ['items' => [['key' => 'make-bed'], ['key' => 'not-a-template']]],
            ['items' => [['key' => 'make-bed'], ['key' => 'make-bed']]],
            ['items' => [['key' => 'make-bed', 'interval' => 0]]],
            ['items' => [['key' => 'make-bed', 'effort_size' => 'XXL']]],
            ['items' => []],
            ['member_ids' => [99999]],
            ['room_id' => 99999],
            ['start_date' => 'not-a-date'],
        ] as $invalid) {
            $this->post(route('task-templates.store'), $this->payload($room, $invalid))->assertSessionHasErrors();
            $this->assertSame(0, Task::count());
        }
    }

    public function test_room_suggestions_cover_household_room_names(): void
    {
        foreach ([
            'Chambre parents' => 'bedroom', 'Chambre Clément' => 'bedroom',
            'Chambre Valentine' => 'bedroom', 'Chambre Gabriel' => 'bedroom',
            'Entrée' => 'entrance', 'Salle de bain bis' => 'bathroom', 'Buanderie' => 'laundry',
            'Toilettes du bas' => 'toilet', 'Escaliers' => 'stairs', 'Cuisine' => 'kitchen',
            'Salle à manger' => 'dining', 'Salon' => 'living',
            'Salle de bain principale' => 'bathroom', 'Toilettes étage' => 'toilet',
        ] as $name => $category) {
            $this->assertSame($category, TaskCatalogue::suggestCategory($name));
        }
    }
}
