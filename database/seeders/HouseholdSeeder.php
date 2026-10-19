<?php

namespace Database\Seeders;

use App\Models\Member;
use App\Models\Room;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class HouseholdSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            foreach ([
                ['Chambre parents', '🛏️'],
                ['Chambre Clément', '🛏️'],
                ['Chambre Valentine', '🛏️'],
                ['Chambre Gabriel', '🛏️'],
                ['Entrée', '🚪'],
                ['Salle de bain bis', '🛁'],
                ['Buanderie', '🧺'],
                ['Toilettes du bas', '🚽'],
                ['Escaliers', '🪜'],
                ['Cuisine', '🍳'],
                ['Salle à manger', '🍽️'],
                ['Salon', '🛋️'],
                ['Salle de bain principale', '🛁'],
                ['Toilettes étage', '🚽'],
            ] as [$name, $icon]) {
                Room::firstOrCreate(['name' => $name], ['icon' => $icon]);
            }

            foreach ([
                ['Johan', '#3b82f6'],
                ['Vanessa', '#ec4899'],
                ['Gabriel', '#10b981'],
                ['Valentine', '#8b5cf6'],
                ['Clément', '#f59e0b'],
            ] as [$name, $color]) {
                Member::firstOrCreate(['name' => $name], ['color' => $color]);
            }
        });
    }
}
