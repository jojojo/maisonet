<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskCompletion extends Model
{
    protected $fillable = ['task_id', 'member_id', 'completed_on', 'due_on', 'effort_points'];

    protected function casts(): array
    {
        return [
            'completed_on' => 'date:Y-m-d',
            'due_on' => 'date:Y-m-d',
            'effort_points' => 'integer',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
