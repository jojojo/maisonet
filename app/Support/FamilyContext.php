<?php

namespace App\Support;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

class FamilyContext
{
    private ?int $familyId = null;

    public function id(): ?int
    {
        return auth()->user()?->family_id ?? $this->familyId;
    }

    public function setFallback(?int $familyId): void
    {
        $this->familyId = $familyId;
    }

    public function run(int $familyId, callable $callback): mixed
    {
        $previous = $this->familyId;
        $this->familyId = $familyId;
        try {
            return $callback();
        } finally {
            $this->familyId = $previous;
        }
    }

    public static function exists(string $table): Exists
    {
        return Rule::exists($table, 'id')->where('family_id', app(self::class)->id() ?? 0);
    }
}
