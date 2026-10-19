<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RewardRequest extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['star_cost' => 'integer', 'reviewed_at' => 'datetime', 'fulfilled_at' => 'datetime'];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
