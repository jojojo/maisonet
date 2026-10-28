<?php

namespace App\Http\Controllers;

use App\Models\Room;
use Inertia\Inertia;
use Inertia\Response;

class RoomController extends Controller
{
    public function index(): Response
    {
        $today = today()->toDateString();

        $rooms = Room::query()
            ->withCount([
                'tasks',
                'tasks as overdue_count' => fn ($q) => $q->where('next_due_date', '<', $today),
                'tasks as today_count' => fn ($q) => $q->where('next_due_date', $today),
            ])
            ->orderBy('name')
            ->get();

        return Inertia::render('rooms/index', ['rooms' => $rooms]);
    }

    public function show(Room $room): Response
    {
        return Inertia::render('rooms/show', [
            'room' => $room,
            'tasks' => $room->tasks()
                ->with(['room', 'members'])
                ->orderByRaw('next_due_date is null')
                ->orderBy('next_due_date')
                ->get(),
        ]);
    }
}
