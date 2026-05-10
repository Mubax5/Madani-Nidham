<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\MontessoriArea;
use App\Models\SchoolClass;
use App\Models\StudentFee;
use App\Support\ApiResponse;

class AnalyticsController extends Controller
{
    public function __invoke()
    {
        $weekStart = now()->subWeeks(7)->startOfWeek();

        $attendanceTrend = Attendance::where('date', '>=', $weekStart)
            ->orderBy('date')
            ->get()
            ->groupBy(fn (Attendance $attendance) => $attendance->date->format('o-\WW'))
            ->map(fn ($items, $week) => [
                'week' => $week,
                'hadir' => $items->where('status', 'hadir')->count(),
                'tidak_hadir' => $items->where('status', '!=', 'hadir')->count(),
            ])
            ->values();

        $attendanceDistribution = Attendance::whereMonth('date', now()->month)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->get();

        $milestoneProgress = MontessoriArea::query()
            ->leftJoin('montessori_milestones', 'montessori_areas.id', '=', 'montessori_milestones.area_id')
            ->leftJoin('student_milestones', 'montessori_milestones.id', '=', 'student_milestones.milestone_id')
            ->select('montessori_areas.name')
            ->selectRaw('COUNT(student_milestones.id) as total')
            ->selectRaw("SUM(CASE WHEN student_milestones.status = 'mastered' THEN 1 ELSE 0 END) as mastered")
            ->groupBy('montessori_areas.id', 'montessori_areas.name')
            ->orderBy('montessori_areas.sort_order')
            ->get();

        $feeRows = StudentFee::where('year', now()->year)
            ->select('month')
            ->selectRaw('SUM(total_billed) as target')
            ->selectRaw('SUM(paid_amount) as paid')
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $studentsPerClass = SchoolClass::withCount(['students' => fn ($q) => $q->wherePivot('status', 'active')])
            ->orderBy('level')
            ->get(['id', 'name', 'level']);

        return ApiResponse::success([
            'attendance_trend' => $attendanceTrend,
            'attendance_distribution' => $attendanceDistribution,
            'milestone_progress' => $milestoneProgress,
            'fee_collection' => $feeRows,
            'students_per_class' => $studentsPerClass,
        ], 'Analitik berhasil diambil.');
    }
}
