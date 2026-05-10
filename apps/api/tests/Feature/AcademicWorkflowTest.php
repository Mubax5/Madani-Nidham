<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\MontessoriArea;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcademicWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->seed();
        Sanctum::actingAs(User::where('email', 'admin@madani-nidham.local')->first());
    }

    public function test_attendance_journal_milestone_and_report_publish_workflow(): void
    {
        $student = Student::where('nis', 'MDN-001')->firstOrFail();
        $class = SchoolClass::firstOrFail();
        $year = AcademicYear::where('is_active', true)->firstOrFail();
        $area = MontessoriArea::where('name', 'Practical Life')->firstOrFail();

        $milestone = $this->postJson('/api/v1/montessori/milestones', [
            'areaId' => $area->id,
            'name' => 'Menuang air tanpa tumpah',
            'level' => 'TK A',
        ])->assertCreated()->json('data');

        $this->postJson('/api/v1/milestones/student/'.$student->id.'/update', [
            'milestoneId' => $milestone['id'],
            'status' => 'mastered',
            'observationNotes' => 'Anak dapat melakukan aktivitas dengan fokus.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'mastered');

        $this->postJson('/api/v1/attendance/batch', [
            'classId' => $class->id,
            'date' => now()->toDateString(),
            'records' => [
                ['studentId' => $student->id, 'status' => 'hadir', 'checkInTime' => '08:00'],
            ],
        ])->assertOk()
            ->assertJsonPath('data.0.status', 'hadir');

        $this->postJson('/api/v1/journals', [
            'studentId' => $student->id,
            'classId' => $class->id,
            'date' => now()->toDateString(),
            'content' => 'Hari ini anak mengikuti kegiatan practical life dengan baik.',
            'mood' => 'happy',
            'activities' => ['practical_life'],
        ])->assertCreated()
            ->assertJsonPath('data.mood', 'happy');

        $report = $this->postJson('/api/v1/reports', [
            'studentId' => $student->id,
            'classId' => $class->id,
            'academicYearId' => $year->id,
            'semester' => '1',
            'generalNotes' => 'Perkembangan baik.',
            'characterNotes' => 'Mandiri dan tertib.',
            'recommendation' => 'Lanjutkan pembiasaan di rumah.',
        ])->assertCreated()->json('data');

        $this->postJson('/api/v1/reports/'.$report['id'].'/publish')
            ->assertOk()
            ->assertJsonPath('data.signatureStatus', 'visual_signed')
            ->assertJsonStructure(['data' => ['pdfUrl']]);
    }
}
