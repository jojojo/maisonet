<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\FamilyContext;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function scopeInFamily($query)
    {
        return $query->where('family_id', app(FamilyContext::class)->id() ?? 0);
    }

    public function resolveRouteBindingQuery($query, $value, $field = null)
    {
        return parent::resolveRouteBindingQuery($query, $value, $field)->where('family_id', app(FamilyContext::class)->id() ?? 0);
    }

    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $attributes = ['is_parent' => false];

    protected static function booted(): void
    {
        static::updated(function (User $user) {
            if ($user->wasChanged('password')) {
                $user->tokens()->delete();
            }
        });
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_parent' => 'boolean',
            'family_id' => 'integer',
            'member_id' => 'integer',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
