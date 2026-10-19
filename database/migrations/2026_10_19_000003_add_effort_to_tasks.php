<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('effort_size', 2)->nullable();
        });
        Schema::table('task_completions', function (Blueprint $table) {
            $table->unsignedSmallInteger('effort_points')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('task_completions', fn (Blueprint $table) => $table->dropColumn('effort_points'));
        Schema::table('tasks', fn (Blueprint $table) => $table->dropColumn('effort_size'));
    }
};
