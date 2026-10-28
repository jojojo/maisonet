<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_completions', function (Blueprint $table) {
            $table->unsignedSmallInteger('awarded_points')->nullable();
            $table->string('review_note', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('task_completions', fn (Blueprint $table) => $table->dropColumn(['awarded_points', 'review_note']));
    }
};
