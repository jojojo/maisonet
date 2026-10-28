<?php

namespace App\Support;

use App\Models\Member;
use Illuminate\Validation\ValidationException;

class CompletionParticipants
{
    public static function normalize(array $ids): array
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));
        sort($ids);
        if (Member::whereIn('id', $ids)->count() !== count($ids)) {
            throw ValidationException::withMessages(['member_ids' => 'Un participant ne fait plus partie du foyer.']);
        }

        return $ids;
    }
}
