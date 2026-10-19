<?php

namespace App\Enums;

enum EffortSize: string
{
    case XS = 'XS';
    case S = 'S';
    case M = 'M';
    case L = 'L';
    case XL = 'XL';

    public function points(): int
    {
        return match ($this) {
            self::XS => 1,
            self::S => 2,
            self::M => 3,
            self::L => 5,
            self::XL => 8,
        };
    }
}
