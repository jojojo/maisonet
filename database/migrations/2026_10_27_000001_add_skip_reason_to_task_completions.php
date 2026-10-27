<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_completions', fn (Blueprint $table) => $table->string('skip_reason', 500)->nullable());
    }

    public function down(): void
    {
        Schema::table('task_completions', fn (Blueprint $table) => $table->dropColumn('skip_reason'));
    }
};
