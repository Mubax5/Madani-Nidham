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

        FeeType::updateOrCreate(
            ['name' => 'SPP Bulanan'],
            [
                'amount' => 500000,
                'due_day' => 10,
                'applicable_levels' => ['KB', 'TK A', 'TK B', 'TK C', 'TKA', 'TKB', 'TKC'],
                'is_recurring' => true,
                'is_active' => true,
            ],
        );
    }
}
