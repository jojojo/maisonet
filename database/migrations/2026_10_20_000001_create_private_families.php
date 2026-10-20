<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private array $tables = ['users', 'rooms', 'members', 'tasks', 'task_completions', 'rewards', 'point_entries', 'weekly_goals', 'reward_requests', 'star_transactions'];

    public function up(): void
    {
        Schema::create('families', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->text('invitation_code');
            $table->string('invitation_code_hash', 64)->unique();
            $table->timestamps();
        });
        $code = strtoupper(Str::random(16));
        $legacy = DB::table('families')->insertGetId([
            'name' => 'Notre famille', 'invitation_code' => Crypt::encryptString(implode('-', str_split($code, 4))),
            'invitation_code_hash' => hash('sha256', $code), 'created_at' => now(), 'updated_at' => now(),
        ]);
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, fn (Blueprint $table) => $table->foreignId('family_id')->nullable()->constrained('families')->restrictOnDelete());
            DB::table($tableName)->update(['family_id' => $legacy]);
            Schema::table($tableName, fn (Blueprint $table) => $table->unsignedBigInteger('family_id')->nullable(false)->change());
            Schema::table($tableName, fn (Blueprint $table) => $table->index('family_id'));
        }
        Schema::table('rewards', function (Blueprint $table) {
            $table->dropUnique(['template_key']);
            $table->unique(['family_id', 'template_key']);
        });
    }

    public function down(): void
    {
        // Never merge the private data of several households during rollback.
        if (DB::table('families')->count() > 1) {
            throw new RuntimeException('Multi-family data requires an explicit restore, not an automatic rollback.');
        }
        Schema::table('rewards', function (Blueprint $table) {
            $table->dropUnique(['family_id', 'template_key']);
            $table->unique('template_key');
        });
        foreach (array_reverse($this->tables) as $tableName) {
            Schema::table($tableName, fn (Blueprint $table) => $table->dropIndex(['family_id']));
            Schema::table($tableName, fn (Blueprint $table) => $table->dropConstrainedForeignId('family_id'));
        }
        Schema::dropIfExists('families');
    }
};
