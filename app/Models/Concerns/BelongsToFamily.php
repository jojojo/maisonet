<?php

namespace App\Models\Concerns;

use App\Support\FamilyContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use LogicException;

trait BelongsToFamily
{
    protected static function bootBelongsToFamily(): void
    {
        static::addGlobalScope('family', function (Builder $query) {
            $query->where($query->getModel()->qualifyColumn('family_id'), app(FamilyContext::class)->id() ?? 0);
        });
        static::creating(function (Model $model) {
            $familyId = app(FamilyContext::class)->id();
            if (! $familyId) {
                throw new LogicException('An explicit family context is required.');
            }
            $model->setAttribute('family_id', $familyId);
        });
        static::updating(function (Model $model) {
            if ($model->isDirty('family_id')) {
                throw new LogicException('Records cannot be moved between families.');
            }
        });
    }
}
