<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE classes MODIFY level ENUM('KB', 'TK A', 'TK B', 'TK C') NOT NULL");
        DB::statement("ALTER TABLE montessori_milestones MODIFY level ENUM('KB', 'TK A', 'TK B', 'TK C') NULL");
        DB::statement("ALTER TABLE registrations MODIFY program_applied ENUM('KB', 'TK A', 'TK B', 'TK C') NOT NULL");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE classes MODIFY level ENUM('KB', 'TK A', 'TK B', 'TK C') NOT NULL");
        DB::statement("ALTER TABLE montessori_milestones MODIFY level ENUM('KB', 'TK A', 'TK B', 'TK C') NULL");
        DB::statement("ALTER TABLE registrations MODIFY program_applied ENUM('KB', 'TK A', 'TK B', 'TK C') NOT NULL");
    }
};
