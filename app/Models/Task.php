<?php

namespace App\Models;

use App\Enums\EffortSize;
use App\Enums\Recurrence;
use App\Models\Concerns\BelongsToFamily;
use App\Services\CompletionService;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Task extends Model
{
    use BelongsToFamily;

    protected $fillable = [
        'room_id', 'member_id', 'title', 'notes', 'effort_size', 'template_key',
        'recurrence', 'interval', 'next_due_date', 'last_completed_at',
    ];

    protected $appends = ['status', 'dirt_level', 'effort_points', 'points_available_on', 'can_earn_points', 'completion_info'];

    protected $with = ['latestPointAward', 'latestCompletion'];

    protected $hidden = ['latestPointAward', 'latestCompletion'];

    protected function casts(): array
    {
        return [
            'recurrence' => Recurrence::class,
            'effort_size' => EffortSize::class,
            'interval' => 'integer',
            'next_due_date' => 'date:Y-m-d',
            'last_completed_at' => 'date:Y-m-d',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function completions(): HasMany
    {
        return $this->hasMany(TaskCompletion::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Member::class)->orderBy('name');
    }

    public function latestPointAward(): HasOne
    {
        return $this->hasOne(TaskCompletion::class)->ofMany(['id' => 'max'], fn ($query) => $query->where('awards_points', true)->where('status', '!=', 'rejected'));
    }

    public function latestCompletion(): HasOne
    {
        return $this->hasOne(TaskCompletion::class)->ofMany(['id' => 'max'], fn ($query) => $query->where('status', '!=', 'rejected'));
    }

    protected function pointsAvailableOn(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->latestPointAward?->points_next_available_on?->toDateString());
    }

    protected function canEarnPoints(): Attribute
    {
        return Attribute::get(fn (): bool => ($this->effort_points ?? 0) > 0 && $this->next_due_date !== null
            && (! $this->latestPointAward || ($this->latestPointAward->points_next_available_on !== null && today()->gte($this->latestPointAward->points_next_available_on))));
    }

    protected function completionInfo(): Attribute
    {
        return Attribute::get(fn (): ?array => $this->latestCompletion ? [
            'id' => $this->latestCompletion->id, 'status' => $this->latestCompletion->status,
            'completed_on' => $this->latestCompletion->completed_on->toDateString(),
            'submitted_by' => $this->latestCompletion->submitted_by,
            'due_on' => $this->latestCompletion->due_on?->toDateString(),
            'skip_reason' => $this->latestCompletion->skip_reason,
        ] : null);
    }

    protected function effortPoints(): Attribute
    {
        return Attribute::get(fn (): ?int => $this->effort_size?->points());
    }

    /** One of: overdue, today, upcoming, done. */
    protected function status(): Attribute
    {
        return Attribute::get(function () {
            if ($this->next_due_date === null) {
                return 'done';
            }

            $today = today();

            return match (true) {
                $this->next_due_date->lt($today) => 'overdue',
                $this->next_due_date->eq($today) => 'today',
                default => 'upcoming',
            };
        });
    }

    /** Estimated cycle progress; no cleaning history uses one interval before the due date. */
    protected function dirtLevel(): Attribute
    {
        return Attribute::get(function (): ?int {
            if (! $this->recurrence->isRecurring() || $this->next_due_date === null) {
                return null;
            }

            $due = $this->next_due_date->copy()->startOfDay();
            if ($due->lte(today())) {
                return 100;
            }

            $start = $this->last_completed_at?->copy()->startOfDay() ?? match ($this->recurrence) {
                Recurrence::Daily => $due->copy()->subDays($this->interval),
                Recurrence::Weekly => $due->copy()->subWeeks($this->interval),
                Recurrence::Monthly => $due->copy()->subMonthsNoOverflow($this->interval),
                Recurrence::Yearly => $due->copy()->subYearsNoOverflow($this->interval),
                default => $due->copy(),
            };

            $duration = max(1, $start->diffInDays($due, false));
            $elapsed = $start->diffInDays(today(), false);

            return (int) round(max(0, min(100, $elapsed / $duration * 100)));
        });
    }

    /** Record a completion and compute the next due date from the completion day. */
    public function complete(?int $memberId = null, ?CarbonInterface $on = null): void
    {
        app(CompletionService::class)->complete($this, $memberId ? [$memberId] : $this->members()->pluck('members.id')->all(), null, $on);
    }

    /** Cancel the latest completion and restore the previous schedule. */
    public function undoLastCompletion(): void
    {
        app(CompletionService::class)->undo($this);
    }
}
