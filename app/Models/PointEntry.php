<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFamily;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointEntry extends Model
{
    use BelongsToFamily;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['points' => 'decimal:2', 'is_void' => 'boolean', 'completed_on' => 'date:Y-m-d'];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
