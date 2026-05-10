<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\EnrollmentUpdate;
use App\Models\Registration;
use App\Models\Student;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EnrollmentUpdateController extends Controller
{
    private const CATEGORIES = [
        'new_student',
        're_registration',
        'graduated',
        'prep_class',
        'not_continuing',
        'unconfirmed',
    ];

    private const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'not_applicable'];
    private const CONFIRMATION_STATUSES = ['pending', 'confirmed', 'graduated', 'continuing', 'not_continuing', 'unconfirmed'];

    public function index(Request $request)
    {
        $yearId = $request->integer('academicYearId') ?: $this->defaultAcademicYear()?->id;
        $query = EnrollmentUpdate::query()
            ->with(['academicYear', 'registration', 'student'])
            ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('paymentStatus'), fn ($q) => $q->where('payment_status', $request->string('paymentStatus')))
            ->when($request->filled('confirmationStatus'), fn ($q) => $q->where('confirmation_status', $request->string('confirmationStatus')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->string('search');
                $q->where(fn ($inner) => $inner
                    ->where('full_name', 'like', "%$search%")
                    ->orWhere('address', 'like', "%$search%")
                    ->orWhere('source_text', 'like', "%$search%"));
            });

        $rows = $query->get()->sortBy([
            fn (EnrollmentUpdate $a, EnrollmentUpdate $b) => array_search($a->category, self::CATEGORIES, true) <=> array_search($b->category, self::CATEGORIES, true),
            fn (EnrollmentUpdate $a, EnrollmentUpdate $b) => $a->id <=> $b->id,
        ])->values();

        return ApiResponse::success($rows, 'Update pendaftaran berhasil diambil.');
    }

    public function summary(Request $request)
    {
        $yearId = $request->integer('academicYearId') ?: $this->defaultAcademicYear()?->id;
        $query = EnrollmentUpdate::query()
            ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId));
        $financial = (clone $query)->whereIn('category', EnrollmentUpdate::FINANCIAL_CATEGORIES);
        $financialRows = (clone $financial)->get();
        $target = (int) $financialRows->sum(fn (EnrollmentUpdate $row) => max((int) ($row->target_amount ?? 0), (int) $row->paid_amount));
        $paid = (int) $financialRows->sum('paid_amount');
        $outstanding = (int) $financialRows->sum(fn (EnrollmentUpdate $row) => max(max((int) ($row->target_amount ?? 0), (int) $row->paid_amount) - (int) $row->paid_amount, 0));

        return ApiResponse::success([
            'academic_year_id' => $yearId,
            'total_count' => (clone $query)->count(),
            'financial_count' => (clone $financial)->count(),
            'target' => $target,
            'paid' => $paid,
            'outstanding' => $outstanding,
            'paid_count' => (clone $financial)->where('payment_status', 'paid')->count(),
            'partial_count' => (clone $financial)->where('payment_status', 'partial')->count(),
            'unpaid_count' => (clone $financial)->where('payment_status', 'unpaid')->count(),
            'by_category' => (clone $query)->get()->groupBy('category')->map(fn ($items, string $category) => [
                'category' => $category,
                'count' => $items->count(),
                'target' => (int) $items->sum(fn (EnrollmentUpdate $row) => max((int) ($row->target_amount ?? 0), (int) $row->paid_amount)),
                'paid' => (int) $items->sum('paid_amount'),
            ])->values(),
        ], 'Ringkasan update pendaftaran berhasil diambil.');
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $row = new EnrollmentUpdate($this->payload($request, $data));
        $this->attachExistingRecords($row);
        $row->save();

        return ApiResponse::success($row->fresh(['academicYear', 'registration', 'student']), 'Update pendaftaran berhasil dibuat.', [], 201);
    }

    public function update(Request $request, EnrollmentUpdate $enrollmentUpdate)
    {
        $data = $this->validated($request, partial: true);
        $enrollmentUpdate->fill($this->payload($request, $data, $enrollmentUpdate));
        $this->attachExistingRecords($enrollmentUpdate);
        $enrollmentUpdate->save();

        return ApiResponse::success($enrollmentUpdate->fresh(['academicYear', 'registration', 'student']), 'Update pendaftaran berhasil diperbarui.');
    }

    public function destroy(EnrollmentUpdate $enrollmentUpdate)
    {
        $enrollmentUpdate->delete();

        return ApiResponse::success(null, 'Update pendaftaran berhasil dihapus.');
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'academicYearId' => ['nullable', 'exists:academic_years,id'],
            'registrationId' => ['nullable', 'exists:registrations,id'],
            'studentId' => ['nullable', 'exists:students,id'],
            'category' => [$required, Rule::in(self::CATEGORIES)],
            'fullName' => [$required, 'string', 'max:150'],
            'programLevel' => ['nullable', Rule::in(['KB', 'TK A', 'TK B', 'TK C'])],
            'address' => ['nullable', 'string', 'max:180'],
            'targetAmount' => ['nullable', 'integer', 'min:0'],
            'paidAmount' => ['nullable', 'integer', 'min:0'],
            'paymentStatus' => ['nullable', Rule::in(self::PAYMENT_STATUSES)],
            'confirmationStatus' => ['nullable', Rule::in(self::CONFIRMATION_STATUSES)],
            'sourceText' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);
    }

    private function payload(Request $request, array $data, ?EnrollmentUpdate $current = null): array
    {
        $category = $data['category'] ?? $current?->category;
        $targetAmount = array_key_exists('targetAmount', $data) ? $data['targetAmount'] : $current?->target_amount;
        $paidAmount = array_key_exists('paidAmount', $data) ? (int) ($data['paidAmount'] ?? 0) : (int) ($current?->paid_amount ?? 0);
        $isFinancial = in_array($category, EnrollmentUpdate::FINANCIAL_CATEGORIES, true);
        $requestedPaymentStatus = $data['paymentStatus'] ?? null;

        return [
            'academic_year_id' => $data['academicYearId'] ?? $current?->academic_year_id ?? $this->defaultAcademicYear()?->id,
            'registration_id' => $data['registrationId'] ?? $current?->registration_id,
            'student_id' => $data['studentId'] ?? $current?->student_id,
            'category' => $category,
            'full_name' => $data['fullName'] ?? $current?->full_name,
            'program_level' => $data['programLevel'] ?? $current?->program_level,
            'address' => $data['address'] ?? $current?->address,
            'target_amount' => $targetAmount,
            'paid_amount' => $paidAmount,
            'payment_status' => $isFinancial
                ? ($requestedPaymentStatus && $requestedPaymentStatus !== 'not_applicable' ? $requestedPaymentStatus : $this->paymentStatus($targetAmount, $paidAmount))
                : 'not_applicable',
            'confirmation_status' => $isFinancial
                ? ($data['confirmationStatus'] ?? $this->confirmationStatus($category, $paidAmount))
                : $this->confirmationStatus($category, $paidAmount),
            'source_text' => $data['sourceText'] ?? $current?->source_text,
            'notes' => $data['notes'] ?? $current?->notes,
            'updated_by' => $request->user()?->id,
        ];
    }

    private function paymentStatus(?int $targetAmount, int $paidAmount): string
    {
        if ($targetAmount !== null && $targetAmount > 0 && $paidAmount >= $targetAmount) {
            return 'paid';
        }

        return $paidAmount > 0 ? 'partial' : 'unpaid';
    }

    private function confirmationStatus(?string $category, int $paidAmount): string
    {
        return match ($category) {
            'graduated' => 'graduated',
            'prep_class' => 'continuing',
            'not_continuing' => 'not_continuing',
            'unconfirmed' => 'unconfirmed',
            default => $paidAmount > 0 ? 'confirmed' : 'pending',
        };
    }

    private function attachExistingRecords(EnrollmentUpdate $row): void
    {
        $normalized = $this->normalizeName($row->full_name);

        if (! $row->student_id) {
            $row->student_id = Student::get(['id', 'full_name', 'nickname'])
                ->first(fn (Student $student) => $this->normalizeName($student->full_name) === $normalized || $this->normalizeName($student->nickname ?? '') === $normalized)
                ?->id;
        }

        if (! $row->registration_id) {
            $row->registration_id = Registration::get(['id', 'child_name'])
                ->first(fn (Registration $registration) => $this->normalizeName($registration->child_name) === $normalized)
                ?->id;
        }
    }

    private function normalizeName(?string $name): string
    {
        return Str::of($name ?? '')
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/i', '')
            ->toString();
    }

    private function defaultAcademicYear(): ?AcademicYear
    {
        return AcademicYear::where('name', '2026/2027')->first()
            ?? AcademicYear::where('is_active', true)->first()
            ?? AcademicYear::latest('id')->first();
    }
}
