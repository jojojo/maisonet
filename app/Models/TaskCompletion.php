<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFamily;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TaskCompletion extends Model
{
    use BelongsToFamily;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'completed_on' => 'date:Y-m-d',
            'due_on' => 'date:Y-m-d',
            'effort_points' => 'integer',
            'awards_points' => 'boolean',
            'points_next_available_on' => 'date:Y-m-d',
            'reviewed_at' => 'datetime',
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

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(Member::class, 'completion_participants')->withPivot('points');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }
}
