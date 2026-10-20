<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'title' => $this->title, 'notes' => $this->notes,
            'room' => $this->room?->only(['id', 'name', 'icon']),
            'members' => $this->members->map->only(['id', 'name', 'color']),
            'recurrence' => $this->recurrence->value, 'interval' => $this->interval,
            'next_due_date' => $this->next_due_date?->toDateString(),
            'last_completed_at' => $this->last_completed_at?->toDateString(),
            'effort_size' => $this->effort_size?->value, 'effort_points' => $this->effort_points,
            'status' => $this->status, 'dirt_level' => $this->dirt_level,
            'can_earn_points' => $this->can_earn_points, 'points_available_on' => $this->points_available_on,
            'completion_info' => $this->completion_info,
        ];
    }
}
