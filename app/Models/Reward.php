<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFamily;
use Illuminate\Database\Eloquent\Model;

class Reward extends Model
{
    use BelongsToFamily;

    protected $fillable = ['template_key', 'title', 'description', 'icon', 'category', 'star_cost', 'audience', 'is_active'];

    protected function casts(): array
    {
        return ['star_cost' => 'integer', 'is_active' => 'boolean'];
    }
}
