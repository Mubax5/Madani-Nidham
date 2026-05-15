<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\UploadsFiles;
use App\Http\Controllers\Controller;
use App\Models\AbsenceRequest;
use App\Models\Attendance;
use App\Models\SchoolNotification;
use App\Models\Student;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AbsenceRequestController extends Controller
{
    use UploadsFiles;

    public function index(Request $request)
    {
        $query = AbsenceRequest::with(['student.classes', 'requester', 'reviewer'])->latest('id');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('date')) {
            $request->validate(['date' => ['date', 'before_or_equal:today']]);
            $query->whereDate('date', $request->date('date'));
        }
        if ($request->filled('class_id')) {
            $classId = $request->integer('class_id');
            $query->whereHas('student.classes', fn ($q) => $q->where('classes.id', $classId));
        }

        return ApiResponse::fromPaginator($query->paginate(min(max((int) $request->integer('perPage', 15), 1), 100)), 'Permohonan izin berhasil diambil.');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'studentId' => ['required', 'exists:students,id'],
            'date' => ['required', 'date', 'before_or_equal:today'],
            'type' => ['required', Rule::in(['sakit', 'izin'])],
            'reason' => ['required', 'string'],
            'document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf,doc,docx', 'max:5120'],
            'documentUrl' => ['nullable', 'url'],
        ]);

        if ($request->user()->hasRole('orang_tua')) {
            abort_unless($request->user()->children()->where('students.id', $data['studentId'])->exists(), 403);
        }

        $documentUrl = $data['documentUrl'] ?? null;
        if ($request->hasFile('document')) {
            $documentUrl = $this->storePublicFile($request->file('document'), 'absence-requests');
        }

        $absence = AbsenceRequest::create([
            'student_id' => $data['studentId'],
            'requested_by' => $request->user()->id,
            'date' => $data['date'],
            'type' => $data['type'],
            'reason' => $data['reason'],
            'document_url' => $documentUrl,
        ]);

        $student = Student::with('classes.teacher')->find($data['studentId']);
        $teacher = $student?->active_class?->teacher;
        if ($teacher) {
            SchoolNotification::create([
                'user_id' => $teacher->id,
                'title' => 'Permohonan izin baru',
                'body' => ($student->nickname ?? $student->full_name).' menunggu persetujuan izin.',
                'data' => ['type' => 'absence_request', 'id' => $absence->id],
            ]);
        }

        return ApiResponse::success($absence->load(['student', 'requester']), 'Permohonan izin berhasil dikirim.', [], 201);
    }

    public function show(AbsenceRequest $absenceRequest)
    {
        return ApiResponse::success($absenceRequest->load(['student.classes', 'requester', 'reviewer']), 'Permohonan izin berhasil diambil.');
    }

    public function review(Request $request, AbsenceRequest $absenceRequest)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'notes' => ['nullable', 'string'],
        ]);

        $absenceRequest->update([
            'status' => $data['status'],
            'reviewer_notes' => $data['notes'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        if ($data['status'] === 'approved') {
            $student = $absenceRequest->student()->with('classes')->first();
            $class = $student?->active_class;
            if ($student && $class) {
                Attendance::updateOrCreate(
                    ['student_id' => $student->id, 'date' => $absenceRequest->date->toDateString()],
                    [
                        'class_id' => $class->id,
                        'status' => $absenceRequest->type,
                        'notes' => $absenceRequest->reason,
                        'recorded_by' => $request->user()->id,
                    ],
                );
            }
        }

        foreach ($absenceRequest->student->parents as $parent) {
            SchoolNotification::create([
                'user_id' => $parent->id,
                'title' => $data['status'] === 'approved' ? 'Izin disetujui' : 'Izin ditolak',
                'body' => $data['notes'] ?? 'Status permohonan izin telah diperbarui.',
                'data' => ['type' => 'absence_request', 'id' => $absenceRequest->id],
            ]);
        }

        return ApiResponse::success($absenceRequest->fresh(['student', 'reviewer']), 'Permohonan izin berhasil direview.');
    }

    public function destroy(AbsenceRequest $absenceRequest)
    {
        if ($absenceRequest->status === 'approved') {
            Attendance::query()
                ->where('student_id', $absenceRequest->student_id)
                ->whereDate('date', $absenceRequest->date->toDateString())
                ->where('status', $absenceRequest->type)
                ->delete();
        }

        $absenceRequest->delete();

        return ApiResponse::success(null, 'Permohonan izin berhasil dihapus.');
    }

    public function my(Request $request)
    {
        $studentIds = $request->user()->children()->pluck('students.id');

        return ApiResponse::success(
            AbsenceRequest::with(['student', 'reviewer'])->whereIn('student_id', $studentIds)->latest('id')->get(),
            'Riwayat izin berhasil diambil.',
        );
    }
}
