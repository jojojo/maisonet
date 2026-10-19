<?php

namespace App\Support;

class RewardCatalogue
{
    public static function templates(): array
    {
        return array_map(fn (array $row) => [
            'template_key' => $row[0], 'category' => $row[1], 'title' => $row[2],
            'description' => $row[3], 'icon' => $row[4], 'star_cost' => $row[5], 'audience' => $row[6],
        ], config('reward-templates.rewards'));
    }
}
