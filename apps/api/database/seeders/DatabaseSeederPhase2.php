<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeederPhase2 extends Seeder
{
    public function run(): void
    {
        $this->call([
            HafalanSurahsSeeder::class,
            DoaDailySeeder::class,
            ParentingArticlesSampleSeeder::class,
            SchoolBankAccountSeeder::class,
        ]);
    }
}
