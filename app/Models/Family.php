<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Family extends Model
{
    protected $fillable = ['name'];

    protected $hidden = ['invitation_code', 'invitation_code_hash'];

    protected function casts(): array
    {
        return ['invitation_code' => 'encrypted'];
    }

    protected static function booted(): void
    {
        static::creating(fn (Family $family) => $family->replaceInvitationCode());
    }

    public static function normalizeCode(string $code): string
    {
        return strtoupper(preg_replace('/[\s-]+/', '', $code));
    }

    public function replaceInvitationCode(): void
    {
        $code = strtoupper(Str::random(16));
        $this->invitation_code = implode('-', str_split($code, 4));
        $this->invitation_code_hash = hash('sha256', $code);
    }
}
