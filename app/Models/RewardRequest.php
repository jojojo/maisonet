<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFamily;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RewardRequest extends Model
{
    use BelongsToFamily;

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
