<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFamily;
use Illuminate\Database\Eloquent\Model;

class WeeklyGoal extends Model
{
    use BelongsToFamily;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['week_start' => 'date:Y-m-d', 'target_points' => 'integer', 'reward_stars' => 'integer'];
    }
}
