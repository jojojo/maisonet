<?php

namespace App\Models;

use App\Enums\Recurrence;
use App\Enums\EffortSize;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Task extends Model
{
    protected $fillable = [
        'room_id', 'member_id', 'title', 'notes', 'effort_size', 'template_key',
        'recurrence', 'interval', 'next_due_date', 'last_completed_at',
    ];

    protected $appends = ['status', 'dirt_level', 'effort_points'];

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
        if ($this->next_due_date === null) {
            return;
        }

        $on = ($on ?? today())->copy()->startOfDay();

        DB::transaction(function () use ($memberId, $on) {
            $this->completions()->create([
                'member_id' => $memberId ?? ($this->members()->count() === 1 ? $this->members()->first()->id : null),
                'completed_on' => $on,
                'due_on' => $this->next_due_date,
                'effort_points' => $this->effort_points,
            ]);

            $this->forceFill([
                'last_completed_at' => $on,
                'next_due_date' => $this->recurrence->advance($on, $this->interval),
            ])->save();
        });
    }

    /** Cancel the latest completion and restore the previous schedule. */
    public function undoLastCompletion(): void
    {
        DB::transaction(function () {
            $last = $this->completions()->latest('id')->first();

            if ($last === null) {
                return;
            }

            $last->delete();

            $this->forceFill([
                'next_due_date' => $last->due_on,
                'last_completed_at' => $this->completions()->max('completed_on'),
            ])->save();
        });
    }
}
