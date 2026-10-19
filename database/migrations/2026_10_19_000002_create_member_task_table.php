<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_task', function (Blueprint $table) {
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->primary(['task_id', 'member_id']);
        });

        DB::table('member_task')->insertUsing(
            ['task_id', 'member_id'],
            DB::table('tasks')->select('id', 'member_id')->whereNotNull('member_id'),
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('member_task');
    }
};
