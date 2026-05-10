<?php

namespace App\Services;

use App\Models\StudentFee;

class UniqueCodeService
{
    public function generate(int $month, int $year): int
    {
        $used = StudentFee::where('month', $month)->where('year', $year)->pluck('unique_code')->all();

        do {
            $code = random_int(1, 999);
        } while (in_array($code, $used, true));

        return $code;
    }
}
