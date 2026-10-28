<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\Task;
use App\Support\FamilyContext;
use App\Support\TaskCatalogue;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaskTemplateController extends Controller
{
    public function index(Request $request): Response
    {
        $data = $request->validate(['room_id' => ['nullable', 'integer', FamilyContext::exists('rooms')]]);
        $tasks = Task::get(['room_id', 'title', 'template_key']);
        $existingRooms = [];
        foreach ($tasks as $task) {
            $existingRooms['title:'.TaskCatalogue::normalizeTitle($task->title)][$task->room_id] = true;
            if ($task->template_key !== null) {
                $existingRooms['key:'.$task->template_key][$task->room_id] = true;
            }
        }

        return Inertia::render('task-templates/index', [
            'categories' => config('task-templates.categories'),
            'templates' => collect(TaskCatalogue::templates())->map(fn ($template) => [
                ...$template,
                'existing_room_ids' => array_keys(($existingRooms['key:'.$template['key']] ?? [])
                    + ($existingRooms['title:'.TaskCatalogue::normalizeTitle($template['title'])] ?? [])),
            ]),
            'suggestions' => Room::all()->mapWithKeys(fn ($room) => [$room->id => TaskCatalogue::suggestCategory($room->name)]),
            'defaultRoomId' => isset($data['room_id']) ? (int) $data['room_id'] : null,
        ]);
    }
}
