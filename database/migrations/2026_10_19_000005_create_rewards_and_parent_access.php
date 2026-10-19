<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_parent')->default(false);
        });
        $firstUserId = DB::table('users')->min('id');
        if ($firstUserId !== null) {
            DB::table('users')->where('id', $firstUserId)->update(['is_parent' => true]);
        }

        Schema::create('rewards', function (Blueprint $table) {
            $table->id();
            $table->string('template_key', 80)->nullable()->unique();
            $table->string('title', 120);
            $table->text('description')->nullable();
            $table->string('icon', 16)->default('🎁');
            $table->string('category', 30);
            $table->unsignedSmallInteger('star_cost');
            $table->string('audience', 15)->default('individual');
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rewards');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('is_parent'));
    }
};
