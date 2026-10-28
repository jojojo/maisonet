<?php

namespace App\Support;

use App\Models\Member;
use App\Models\User;

class MemberAccess
{
    public static function forUser(User $actor, int $id): Member
    {
        abort_if(! $actor->is_parent && $actor->member_id !== $id, 403);

        return Member::findOrFail($id);
    }
}
