<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFamily;
use Illuminate\Database\Eloquent\Model;

class MountainGoal extends Model
{
    use BelongsToFamily;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['sequence' => 'integer', 'target_points' => 'integer', 'reward_stars' => 'integer', 'points' => 'decimal:2', 'legacy' => 'boolean', 'completed_at' => 'datetime'];
    }
}
