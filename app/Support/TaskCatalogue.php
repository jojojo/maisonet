<?php

namespace App\Support;

use App\Enums\EffortSize;
use Illuminate\Support\Str;

class TaskCatalogue
{
    public static function templates(): array
    {
        return array_map(fn (array $row) => [
            'key' => $row[0], 'category' => $row[1], 'title' => $row[2],
            'recurrence' => $row[3], 'interval' => $row[4], 'effort_size' => $row[5],
            'effort_points' => EffortSize::from($row[5])->points(),
            'essential' => $row[6], 'notes' => $row[7] ?? null,
        ], config('task-templates.tasks'));
    }

    public static function normalizeTitle(string $title): string
    {
        return trim(preg_replace('/[^a-z0-9]+/', ' ', Str::lower(Str::ascii($title))));
    }

    public static function suggestCategory(string $roomName): string
    {
        $name = self::normalizeTitle($roomName);

        return match (true) {
            Str::contains($name, ['salle a manger', 'repas']) => 'dining',
            Str::contains($name, ['bain', 'douche']) => 'bathroom',
            Str::contains($name, ['toilette', 'wc']) => 'toilet',
            Str::contains($name, ['chambre']) => 'bedroom',
            Str::contains($name, ['cuisine']) => 'kitchen',
            Str::contains($name, ['salon', 'sejour']) => 'living',
            Str::contains($name, ['entree', 'couloir', 'hall']) => 'entrance',
            Str::contains($name, ['buanderie', 'linge']) => 'laundry',
            Str::contains($name, ['escalier']) => 'stairs',
            Str::contains($name, ['jardin', 'terrasse', 'balcon']) => 'outdoor',
            default => 'common',
        };
    }
}
