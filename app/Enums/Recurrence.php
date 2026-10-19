<?php

namespace App\Enums;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

enum Recurrence: string
{
    case Once = 'once';
    case Daily = 'daily';
    case Weekly = 'weekly';
    case Monthly = 'monthly';
    case Yearly = 'yearly';

    public function isRecurring(): bool
    {
        return $this !== self::Once;
    }

    /** Date following $from after $interval periods, or null for a one-off task. */
    public function advance(CarbonInterface $from, int $interval = 1): ?CarbonImmutable
    {
        $date = CarbonImmutable::instance($from)->startOfDay();
        $interval = max(1, $interval);

        return match ($this) {
            self::Once => null,
            self::Daily => $date->addDays($interval),
            self::Weekly => $date->addWeeks($interval),
            self::Monthly => $date->addMonthsNoOverflow($interval),
            self::Yearly => $date->addYearsNoOverflow($interval),
        };
    }
}
