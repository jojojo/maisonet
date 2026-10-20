<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFamily;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Member extends Model
{
    use BelongsToFamily;

    protected $fillable = ['name', 'color'];

    protected function casts(): array
    {
        return ['weekly_target' => 'integer', 'weekly_stars' => 'integer'];
    }

    public function targetReward(): BelongsTo
    {
        return $this->belongsTo(Reward::class, 'target_reward_id');
    }

    public function tasks(): BelongsToMany
    {
        return $this->belongsToMany(Task::class);
    }
}
