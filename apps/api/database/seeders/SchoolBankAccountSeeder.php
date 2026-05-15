<?php

namespace Database\Seeders;

use App\Models\FeeType;
use App\Models\SchoolBankAccount;
use Illuminate\Database\Seeder;

class SchoolBankAccountSeeder extends Seeder
{
    public function run(): void
    {
        SchoolBankAccount::updateOrCreate(
            ['bank_name' => 'BCA', 'account_number' => '1234567890'],
            ['account_holder' => 'Madani Montessori', 'is_active' => true],
        );

        foreach ([
            ['SPP Reguler', ['regular'], ['KB', 'TK A', 'TK B', 'TK C']],
            ['SPP Half-day', ['half_day'], ['KB', 'TK A', 'TK B', 'TK C']],
            ['SPP Full-day', ['full_day'], ['TK B', 'TK C']],
        ] as [$name, $programs, $levels]) {
            FeeType::updateOrCreate(
                ['name' => $name],
                [
                    'amount' => 500000,
                    'due_day' => 10,
                    'applicable_levels' => $levels,
                    'applicable_programs' => $programs,
                    'is_recurring' => true,
                    'is_active' => true,
                ],
            );
        }
    }
}
