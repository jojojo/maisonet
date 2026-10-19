<?php

use App\Enums\Recurrence;
use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->unsignedSmallInteger('weekly_target')->default(20);
            $table->unsignedSmallInteger('weekly_stars')->default(1);
            $table->foreignId('target_reward_id')->nullable()->constrained('rewards')->nullOnDelete();
        });
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('member_id')->nullable()->unique()->constrained()->nullOnDelete();
        });
        Schema::table('task_completions', function (Blueprint $table) {
            $table->string('status', 15)->default('legacy');
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->boolean('awards_points')->default(false);
            $table->date('points_next_available_on')->nullable();
            $table->index(['status', 'completed_on']);
        });
        Schema::create('completion_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_completion_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->decimal('points', 8, 2)->default(0);
            $table->unique(['task_completion_id', 'member_id']);
        });
        Schema::create('point_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->foreignId('task_completion_id')->nullable()->constrained()->nullOnDelete();
            $table->string('task_title');
            $table->date('completed_on');
            $table->decimal('points', 8, 2);
            $table->boolean('is_void')->default(false);
            $table->timestamps();
            $table->unique(['task_completion_id', 'member_id']);
            $table->index(['member_id', 'completed_on']);
        });
        Schema::create('weekly_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->date('week_start');
            $table->unsignedSmallInteger('target_points');
            $table->unsignedSmallInteger('reward_stars');
            $table->timestamps();
            $table->unique(['member_id', 'week_start']);
        });
        Schema::create('reward_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->foreignId('reward_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title', 120);
            $table->string('icon', 16);
            $table->unsignedSmallInteger('star_cost');
            $table->string('audience', 15);
            $table->string('status', 15)->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('fulfilled_at')->nullable();
            $table->timestamps();
        });
        Schema::create('star_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->foreignId('weekly_goal_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('reward_request_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('type', 20);
            $table->integer('amount');
            $table->timestamps();
            $table->unique(['weekly_goal_id', 'type']);
            $table->unique(['reward_request_id', 'type']);
        });

        // Historical graded completions require an explicit parent review before earning points.
        $available = [];
        $onceAwarded = [];
        $rows = DB::table('task_completions')->join('tasks', 'tasks.id', '=', 'task_completions.task_id')
            ->where('effort_points', '>', 0)->orderBy('completed_on')->orderBy('task_completions.id')
            ->get(['task_completions.*', 'tasks.recurrence', 'tasks.interval']);
        foreach ($rows as $row) {
            $day = CarbonImmutable::parse($row->completed_on);
            $recurrence = Recurrence::from($row->recurrence);
            $eligible = ! isset($onceAwarded[$row->task_id])
                && (! isset($available[$row->task_id]) || $day->gte($available[$row->task_id]));
            $next = $eligible ? $recurrence->advance($day, $row->interval) : null;
            if ($eligible) {
                if ($next) {
                    $available[$row->task_id] = $next;
                } else {
                    $onceAwarded[$row->task_id] = true;
                }
            }
            DB::table('task_completions')->where('id', $row->id)->update([
                'status' => 'pending', 'awards_points' => $eligible,
                'points_next_available_on' => $next?->toDateString(),
            ]);
            if ($row->member_id !== null) {
                DB::table('completion_participants')->insert([
                    'task_completion_id' => $row->id, 'member_id' => $row->member_id,
                    'points' => $eligible ? $row->effort_points : 0,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('star_transactions');
        Schema::dropIfExists('reward_requests');
        Schema::dropIfExists('weekly_goals');
        Schema::dropIfExists('point_entries');
        Schema::dropIfExists('completion_participants');
        Schema::table('task_completions', function (Blueprint $table) {
            $table->dropIndex(['status', 'completed_on']);
            $table->dropConstrainedForeignId('submitted_by');
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['status', 'reviewed_at', 'awards_points', 'points_next_available_on']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['member_id']);
            $table->dropConstrainedForeignId('member_id');
        });
        Schema::table('members', function (Blueprint $table) {
            $table->dropConstrainedForeignId('target_reward_id');
            $table->dropColumn(['weekly_target', 'weekly_stars']);
        });
    }
};
