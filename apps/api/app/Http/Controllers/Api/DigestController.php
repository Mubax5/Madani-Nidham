<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\WeeklyDigestService;
use App\Support\ApiResponse;

class DigestController extends Controller
{
    public function send(WeeklyDigestService $digest)
    {
        $digest->sendAll();

        return ApiResponse::success(null, 'Weekly digest berhasil dikirim.');
    }

    public function preview(Student $student, WeeklyDigestService $digest)
    {
        return ApiResponse::success($digest->preview($student), 'Preview digest berhasil diambil.');
    }
}
