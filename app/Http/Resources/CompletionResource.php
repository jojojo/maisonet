<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompletionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'task_id' => $this->task_id, 'skip_reason' => $this->skip_reason,
            'task' => new TaskResource($this->whenLoaded('task')),
            'status' => $this->status, 'completed_on' => $this->completed_on->toDateString(),
            'effort_points' => $this->effort_points, 'awards_points' => $this->awards_points,
            'submitted_by' => $this->submitted_by, 'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'participants' => $this->participants->map(fn ($member) => [
                'id' => $member->id, 'name' => $member->name, 'color' => $member->color,
                'points' => (float) $member->pivot->points,
            ]),
        ];
    }
}
