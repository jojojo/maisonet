<?php

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mountain_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_id')->constrained()->restrictOnDelete();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('sequence');
            $table->unsignedSmallInteger('target_points');
            $table->unsignedSmallInteger('reward_stars');
            $table->decimal('points', 12, 2)->default(0);
            $table->boolean('legacy')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['member_id', 'sequence']);
        });
        Schema::table('point_entries', fn (Blueprint $table) => $table->foreignId('mountain_goal_id')->nullable()->constrained()->restrictOnDelete());
        Schema::table('star_transactions', function (Blueprint $table) {
            $table->foreignId('mountain_goal_id')->nullable()->constrained()->restrictOnDelete();
            $table->unique('mountain_goal_id');
        });

        // Already rewarded weeks become historical summits. Their points must not earn twice.
        foreach (DB::table('members')->orderBy('id')->get() as $member) {
            $sequence = 0;
            $awards = DB::table('star_transactions as s')->join('weekly_goals as w', 'w.id', '=', 's.weekly_goal_id')
                ->where('s.member_id', $member->id)->where('s.type', 'goal')->where('s.amount', '>', 0)
                ->orderBy('w.week_start')->get(['s.id', 's.amount', 's.created_at', 'w.week_start', 'w.target_points']);
            foreach ($awards as $award) {
                $start = CarbonImmutable::parse($award->week_start)->startOfDay();
                $entries = DB::table('point_entries')->where('member_id', $member->id)
                    ->where('completed_on', '>=', $start->toDateString())->where('completed_on', '<', $start->addWeek()->toDateString());
                $points = (clone $entries)->where('is_void', false)->sum('points');
                $id = DB::table('mountain_goals')->insertGetId([
                    'family_id' => $member->family_id, 'member_id' => $member->id, 'sequence' => ++$sequence,
                    'target_points' => $award->target_points, 'reward_stars' => $award->amount,
                    'points' => $points, 'legacy' => true, 'completed_at' => $award->created_at,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $entries->update(['mountain_goal_id' => $id]);
                DB::table('star_transactions')->where('id', $award->id)->update(['mountain_goal_id' => $id]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('star_transactions', function (Blueprint $table) {
            $table->dropUnique(['mountain_goal_id']);
            $table->dropConstrainedForeignId('mountain_goal_id');
        });
        Schema::table('point_entries', fn (Blueprint $table) => $table->dropConstrainedForeignId('mountain_goal_id'));
        Schema::dropIfExists('mountain_goals');
    }
};
