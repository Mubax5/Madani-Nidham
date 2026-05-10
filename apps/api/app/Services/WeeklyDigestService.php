<?php

namespace App\Services;

use App\Models\SchoolNotification;
use App\Models\Student;

class WeeklyDigestService
{
    public function sendAll(): void
    {
        Student::where('status', 'active')->with('parents')->chunk(20, function ($students) {
            foreach ($students as $student) {
                $this->sendToStudent($student);
            }
        });
    }

    public function preview(Student $student): array
    {
        $weekStart = now()->startOfWeek();
        $weekEnd = now()->endOfWeek();
        $nama = $student->nickname ?? $student->full_name;

        $journals = $student->journals()->whereBetween('date', [$weekStart, $weekEnd])->count();
        $newMastered = $student->studentMilestones()
            ->where('status', 'mastered')
            ->whereBetween('updated_at', [$weekStart, $weekEnd])
            ->count();
        $hadir = $student->attendances()
            ->where('status', 'hadir')
            ->whereBetween('date', [$weekStart, $weekEnd])
            ->count();
        $hafalan = $student->hafalan()
            ->whereIn('status', ['lancar', 'mutqin'])
            ->whereBetween('updated_at', [$weekStart, $weekEnd])
            ->count();

        $body = "{$journals} catatan jurnal";
        if ($newMastered > 0) {
            $body .= ", {$newMastered} pencapaian Montessori baru";
        }
        if ($hafalan > 0) {
            $body .= ", {$hafalan} hafalan baru";
        }
        $body .= " minggu ini.";

        return [
            'title' => "Ringkasan Minggu {$nama}",
            'body' => $body,
            'journals' => $journals,
            'new_mastered_milestones' => $newMastered,
            'present_days' => $hadir,
            'hafalan_completed' => $hafalan,
        ];
    }

    private function sendToStudent(Student $student): void
    {
        $student->loadMissing('parents');
        $payload = $this->preview($student);

        foreach ($student->parents as $parent) {
            SchoolNotification::create([
                'user_id' => $parent->id,
                'title' => $payload['title'],
                'body' => $payload['body'],
                'data' => ['type' => 'weekly_digest', 'student_id' => $student->id],
            ]);
        }
    }
}
