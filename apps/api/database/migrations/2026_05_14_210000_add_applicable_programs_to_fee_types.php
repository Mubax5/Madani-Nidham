<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('fee_types', 'applicable_programs')) {
            Schema::table('fee_types', function (Blueprint $table) {
                $table->json('applicable_programs')->nullable()->after('applicable_levels');
            });
        }

        $base = DB::table('fee_types')->where('name', 'SPP Bulanan')->first()
            ?? DB::table('fee_types')->where('name', 'SPP Reguler')->first();

        $amount = (int) ($base->amount ?? 500000);
        $dueDay = (int) ($base->due_day ?? 10);
        $allLevels = json_encode(['KB', 'TK A', 'TK B', 'TK C']);

        if ($base) {
            DB::table('fee_types')->where('id', $base->id)->update([
                'name' => 'SPP Reguler',
                'amount' => $amount,
                'due_day' => $dueDay,
                'applicable_levels' => $allLevels,
                'applicable_programs' => json_encode(['regular']),
                'is_recurring' => true,
                'is_active' => true,
                'updated_at' => now(),
            ]);
        } else {
            DB::table('fee_types')->insert([
                'name' => 'SPP Reguler',
                'amount' => $amount,
                'due_day' => $dueDay,
                'applicable_levels' => $allLevels,
                'applicable_programs' => json_encode(['regular']),
                'is_recurring' => true,
                'is_active' => true,
                'updated_at' => now(),
                'created_at' => now(),
            ]);
        }

        DB::table('fee_types')->updateOrInsert(
            ['name' => 'SPP Half-day'],
            [
                'amount' => $amount,
                'due_day' => $dueDay,
                'applicable_levels' => $allLevels,
                'applicable_programs' => json_encode(['half_day']),
                'is_recurring' => true,
                'is_active' => true,
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        DB::table('fee_types')->updateOrInsert(
            ['name' => 'SPP Full-day'],
            [
                'amount' => $amount,
                'due_day' => $dueDay,
                'applicable_levels' => json_encode(['TK B', 'TK C']),
                'applicable_programs' => json_encode(['full_day']),
                'is_recurring' => true,
                'is_active' => true,
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );
    }

    public function down(): void
    {
        if (Schema::hasColumn('fee_types', 'applicable_programs')) {
            Schema::table('fee_types', function (Blueprint $table) {
                $table->dropColumn('applicable_programs');
            });
        }
    }
};
