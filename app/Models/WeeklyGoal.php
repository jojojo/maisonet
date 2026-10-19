<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WeeklyGoal extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['week_start' => 'date:Y-m-d', 'target_points' => 'integer', 'reward_stars' => 'integer'];
    }
}
