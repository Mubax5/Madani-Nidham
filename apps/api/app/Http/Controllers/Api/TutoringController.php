<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolNotification;
use App\Models\Student;
use App\Models\TutoringBooking;
use App\Models\TutoringSession;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TutoringController extends Controller
{
    public function sessions(Request $request)
    {
        $query = TutoringSession::with(['student.classes', 'teacher'])->orderBy('scheduled_at');

        foreach (['teacher_id', 'student_id', 'status'] as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->input($field));
            }
        }
        if ($request->filled('week')) {
            $start = now()->setISODate((int) now()->year, (int) $request->integer('week'))->startOfWeek();
            $query->whereBetween('scheduled_at', [$start, (clone $start)->endOfWeek()]);
        }

        return ApiResponse::success($query->get(), 'Sesi bimbel berhasil diambil.');
    }

    public function storeSession(Request $request)
    {
        $session = TutoringSession::create($this->sessionPayload($request));

        return ApiResponse::success($session->load(['student', 'teacher']), 'Sesi bimbel berhasil dibuat.', [], 201);
    }

    public function updateSession(Request $request, TutoringSession $session)
    {
        $session->update($this->sessionPayload($request, false));

        return ApiResponse::success($session->fresh(['student', 'teacher']), 'Sesi bimbel berhasil diperbarui.');
    }

    public function complete(Request $request, TutoringSession $session)
    {
        $data = $request->validate([
            'sessionNotes' => ['nullable', 'string'],
            'homeworkNotes' => ['nullable', 'string'],
        ]);

        $session->update([
            'status' => 'completed',
            'session_notes' => $data['sessionNotes'] ?? null,
            'homework_notes' => $data['homeworkNotes'] ?? null,
        ]);

        return ApiResponse::success($session, 'Sesi bimbel selesai.');
    }

    public function cancel(Request $request, TutoringSession $session)
    {
        $data = $request->validate(['cancelReason' => ['nullable', 'string']]);
        $session->update(['status' => 'cancelled', 'cancel_reason' => $data['cancelReason'] ?? null]);

        return ApiResponse::success($session, 'Sesi bimbel dibatalkan.');
    }

    public function schedule(Request $request)
    {
        $query = TutoringSession::with(['student', 'teacher'])->orderBy('scheduled_at');
        if ($request->filled('teacher_id')) {
            $query->where('teacher_id', $request->integer('teacher_id'));
        }
        if ($request->filled('week')) {
            $start = now()->setISODate((int) now()->year, (int) $request->integer('week'))->startOfWeek();
            $query->whereBetween('scheduled_at', [$start, (clone $start)->endOfWeek()]);
        }

        return ApiResponse::success($query->get()->groupBy(fn ($item) => $item->scheduled_at->toDateString()), 'Jadwal bimbel berhasil diambil.');
    }

    public function storeBooking(Request $request)
    {
        $data = $request->validate([
            'studentId' => ['required', 'exists:students,id'],
            'teacherId' => ['nullable', 'exists:users,id'],
            'type' => ['required', Rule::in(['calistung', 'pendampingan_belajar', 'bahasa'])],
            'preferredAt' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($request->user()->hasRole('orang_tua')) {
            abort_unless($request->user()->children()->where('students.id', $data['studentId'])->exists(), 403);
        }

        $booking = TutoringBooking::create([
            'student_id' => $data['studentId'],
            'requested_by' => $request->user()->id,
            'teacher_id' => $data['teacherId'] ?? null,
            'type' => $data['type'],
            'preferred_at' => $data['preferredAt'],
            'notes' => $data['notes'] ?? null,
        ]);

        return ApiResponse::success($booking->load(['student', 'teacher', 'requester']), 'Booking bimbel berhasil dikirim.', [], 201);
    }

    public function bookings(Request $request)
    {
        $query = TutoringBooking::with(['student.classes', 'teacher', 'requester', 'session'])->latest('id');
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return ApiResponse::success($query->get(), 'Booking bimbel berhasil diambil.');
    }

    public function confirmBooking(Request $request, TutoringBooking $booking)
    {
        $data = $request->validate([
            'teacherId' => ['nullable', 'exists:users,id'],
            'scheduledAt' => ['nullable', 'date'],
            'durationMinutes' => ['nullable', 'integer', 'min:15', 'max:240'],
        ]);

        $session = TutoringSession::create([
            'student_id' => $booking->student_id,
            'teacher_id' => $data['teacherId'] ?? $booking->teacher_id,
            'type' => $booking->type,
            'scheduled_at' => $data['scheduledAt'] ?? $booking->preferred_at,
            'duration_minutes' => $data['durationMinutes'] ?? 60,
            'status' => 'scheduled',
        ]);

        $booking->update([
            'status' => 'confirmed',
            'teacher_id' => $session->teacher_id,
            'confirmed_session_id' => $session->id,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $student = Student::with('parents')->find($booking->student_id);
        foreach ($student?->parents ?? [] as $parent) {
            SchoolNotification::create([
                'user_id' => $parent->id,
                'title' => 'Booking bimbel dikonfirmasi',
                'body' => 'Jadwal bimbel telah dikonfirmasi sekolah.',
                'data' => ['type' => 'tutoring_session', 'session_id' => $session->id],
            ]);
        }

        return ApiResponse::success($booking->fresh(['student', 'teacher', 'session']), 'Booking bimbel berhasil dikonfirmasi.');
    }

    private function sessionPayload(Request $request, bool $required = true): array
    {
        $rules = [
            'studentId' => [$required ? 'required' : 'sometimes', 'exists:students,id'],
            'teacherId' => [$required ? 'required' : 'sometimes', 'exists:users,id'],
            'type' => [$required ? 'required' : 'sometimes', Rule::in(['calistung', 'pendampingan_belajar', 'bahasa'])],
            'scheduledAt' => [$required ? 'required' : 'sometimes', 'date'],
            'durationMinutes' => ['nullable', 'integer', 'min:15', 'max:240'],
            'status' => ['nullable', Rule::in(['scheduled', 'completed', 'cancelled', 'rescheduled'])],
            'sessionNotes' => ['nullable', 'string'],
            'homeworkNotes' => ['nullable', 'string'],
        ];
        $data = $request->validate($rules);

        return array_filter([
            'student_id' => $data['studentId'] ?? null,
            'teacher_id' => $data['teacherId'] ?? null,
            'type' => $data['type'] ?? null,
            'scheduled_at' => $data['scheduledAt'] ?? null,
            'duration_minutes' => $data['durationMinutes'] ?? 60,
            'status' => $data['status'] ?? 'scheduled',
            'session_notes' => $data['sessionNotes'] ?? null,
            'homework_notes' => $data['homeworkNotes'] ?? null,
        ], fn ($value) => $value !== null);
    }
}
