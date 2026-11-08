<?php

namespace App\Enums;

enum DayPeriod: string
{
    case AllDay = 'all_day';
    case Morning = 'morning';
    case Midday = 'midday';
    case Afternoon = 'afternoon';
    case Evening = 'evening';
    case Bedtime = 'bedtime';

    public function label(): string
    {
        return match ($this) {
            self::AllDay => 'Toute la journée',
            self::Morning => 'Matin',
            self::Midday => 'Midi',
            self::Afternoon => 'Après-midi',
            self::Evening => 'Soirée',
            self::Bedtime => 'Coucher',
        };
    }
}
