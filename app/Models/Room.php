<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFamily;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    use BelongsToFamily;

    protected $fillable = ['name', 'icon'];

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
