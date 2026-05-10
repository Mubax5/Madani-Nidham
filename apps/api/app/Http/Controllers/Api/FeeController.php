<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\UploadsFiles;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\EnrollmentUpdate;
use App\Models\FeePayment;
use App\Models\FeeType;
use App\Models\SchoolBankAccount;
use App\Models\Student;
use App\Models\StudentFee;
use App\Services\FeeService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FeeController extends Controller
{
    use UploadsFiles;

    public function schoolAccounts()
    {
        return ApiResponse::success(SchoolBankAccount::latest('id')->get(), 'Rekening sekolah berhasil diambil.');
    }

    public function storeSchoolAccount(Request $request)
    {
        $data = $request->validate([
            'bankName' => ['required', 'string', 'max:80'],
            'accountNumber' => ['required', 'string', 'max:30'],
            'accountHolder' => ['required', 'string', 'max:120'],
            'isActive' => ['boolean'],
        ]);

        $account = SchoolBankAccount::create([
            'bank_name' => $data['bankName'],
            'account_number' => $data['accountNumber'],
            'account_holder' => $data['accountHolder'],
            'is_active' => $data['isActive'] ?? true,
        ]);

        return ApiResponse::success($account, 'Rekening sekolah berhasil dibuat.', [], 201);
    }

    public function updateSchoolAccount(Request $request, SchoolBankAccount $account)
    {
        $data = $request->validate([
            'bankName' => ['required', 'string', 'max:80'],
            'accountNumber' => ['required', 'string', 'max:30'],
            'accountHolder' => ['required', 'string', 'max:120'],
            'isActive' => ['boolean'],
        ]);

        $account->update([
            'bank_name' => $data['bankName'],
            'account_number' => $data['accountNumber'],
            'account_holder' => $data['accountHolder'],
            'is_active' => $data['isActive'] ?? $account->is_active,
        ]);

        return ApiResponse::success($account, 'Rekening sekolah berhasil diperbarui.');
    }

    public function feeTypes()
    {
        return ApiResponse::success(FeeType::latest('id')->get(), 'Jenis tagihan berhasil diambil.');
    }

    public function storeFeeType(Request $request)
    {
        $feeType = FeeType::create($this->feeTypePayload($request));

        return ApiResponse::success($feeType, 'Jenis tagihan berhasil dibuat.', [], 201);
    }

    public function updateFeeType(Request $request, FeeType $feeType)
    {
        $feeType->update($this->feeTypePayload($request));

        return ApiResponse::success($feeType, 'Jenis tagihan berhasil diperbarui.');
    }

    public function index(Request $request)
    {
        $query = StudentFee::with(['student.classes', 'feeType', 'academicYear', 'bankAccount', 'confirmer', 'payments.bankAccount'])->latest('year')->latest('month')->latest('id');

        foreach (['student_id', 'month', 'year', 'status'] as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->input($field));
            }
        }

        if ($request->filled('aging')) {
            match ($request->input('aging')) {
                'overdue' => $query->whereIn('status', ['unpaid', 'partial'])->whereDate('due_date', '<', now()->toDateString()),
                'due_soon' => $query->whereIn('status', ['unpaid', 'partial'])->whereBetween('due_date', [now()->toDateString(), now()->addDays(7)->toDateString()]),
                default => null,
            };
        }

        return ApiResponse::fromPaginator($query->paginate(min(max((int) $request->integer('perPage', 15), 1), 100)), 'Tagihan berhasil diambil.');
    }

    public function generate(Request $request, FeeService $service)
    {
        $data = $request->validate([
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'academicYearId' => ['nullable', 'exists:academic_years,id'],
        ]);

        $academicYearId = $data['academicYearId'] ?? AcademicYear::where('is_active', true)->value('id') ?? AcademicYear::latest('id')->value('id');
        abort_unless($academicYearId, 422, 'Tahun ajaran belum tersedia.');

        $count = $service->generateMonthly($data['month'], $data['year'], (int) $academicYearId);

        return ApiResponse::success(['generated' => $count], "{$count} tagihan berhasil digenerate.");
    }

    public function show(StudentFee $fee)
    {
        return ApiResponse::success($fee->load(['student.classes', 'feeType', 'academicYear', 'bankAccount', 'confirmer', 'payments.bankAccount', 'payments.uploader', 'payments.confirmer']), 'Tagihan berhasil diambil.');
    }

    public function uploadProof(Request $request, StudentFee $fee)
    {
        $data = $request->validate([
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'proofUrl' => ['nullable', 'url'],
            'receivedAmount' => ['nullable', 'integer', 'min:1'],
            'bankAccountId' => ['nullable', 'exists:school_bank_accounts,id'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($request->user()->hasRole('orang_tua')) {
            abort_unless($request->user()->children()->where('students.id', $fee->student_id)->exists(), 403);
        }

        $proofUrl = $data['proofUrl'] ?? $fee->payment_proof_url;
        if ($request->hasFile('proof')) {
            $proofUrl = $this->storePublicFile($request->file('proof'), 'fees/'.$fee->id);
        }

        if (! empty($data['receivedAmount'])) {
            FeePayment::create([
                'student_fee_id' => $fee->id,
                'bank_account_id' => $data['bankAccountId'] ?? $fee->bank_account_id,
                'uploaded_by' => $request->user()->id,
                'received_amount' => $data['receivedAmount'],
                'proof_url' => $proofUrl,
                'payer_notes' => $data['notes'] ?? null,
                'status' => 'pending',
            ]);
        } else {
            $fee->update([
                'payment_proof_url' => $proofUrl,
                'bank_account_id' => $data['bankAccountId'] ?? $fee->bank_account_id,
                'notes' => $data['notes'] ?? $fee->notes,
            ]);
        }

        return ApiResponse::success($fee->fresh(['student', 'feeType', 'bankAccount', 'payments']), 'Bukti pembayaran berhasil diunggah.');
    }

    public function confirmPayment(Request $request, StudentFee $fee, FeeService $service)
    {
        $data = $request->validate([
            'receivedAmount' => ['required', 'integer', 'min:1'],
            'bankAccountId' => ['nullable', 'exists:school_bank_accounts,id'],
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'proofUrl' => ['nullable', 'url'],
            'notes' => ['nullable', 'string'],
        ]);

        $proofUrl = $data['proofUrl'] ?? null;
        if ($request->hasFile('proof')) {
            $proofUrl = $this->storePublicFile($request->file('proof'), 'fees/'.$fee->id);
        }

        $service->confirmPayment(
            $fee,
            $data['receivedAmount'],
            $request->user()->id,
            $data['bankAccountId'] ?? null,
            $proofUrl,
            $data['notes'] ?? null,
        );

        return ApiResponse::success($fee->fresh(['student', 'feeType', 'bankAccount', 'payments']), 'Pembayaran berhasil dikonfirmasi.');
    }

    public function createPayment(Request $request, StudentFee $fee)
    {
        $data = $request->validate([
            'receivedAmount' => ['required', 'integer', 'min:1'],
            'bankAccountId' => ['nullable', 'exists:school_bank_accounts,id'],
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'proofUrl' => ['nullable', 'url'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($request->user()->hasRole('orang_tua')) {
            abort_unless($request->user()->children()->where('students.id', $fee->student_id)->exists(), 403);
        }

        $proofUrl = $data['proofUrl'] ?? null;
        if ($request->hasFile('proof')) {
            $proofUrl = $this->storePublicFile($request->file('proof'), 'fees/'.$fee->id);
        }

        $payment = FeePayment::create([
            'student_fee_id' => $fee->id,
            'bank_account_id' => $data['bankAccountId'] ?? $fee->bank_account_id,
            'uploaded_by' => $request->user()->id,
            'received_amount' => $data['receivedAmount'],
            'proof_url' => $proofUrl,
            'payer_notes' => $data['notes'] ?? null,
            'status' => 'pending',
        ]);

        return ApiResponse::success($payment->load(['fee.student', 'bankAccount', 'uploader']), 'Pembayaran masuk menunggu konfirmasi.', [], 201);
    }

    public function confirmFeePayment(Request $request, FeePayment $payment, FeeService $service)
    {
        $data = $request->validate([
            'confirmedAmount' => ['nullable', 'integer', 'min:1'],
            'adminNotes' => ['nullable', 'string'],
        ]);

        $fee = $service->confirmFeePayment(
            $payment,
            $data['confirmedAmount'] ?? $payment->received_amount,
            $request->user()->id,
            $data['adminNotes'] ?? null,
        );

        return ApiResponse::success($fee->load(['payments.bankAccount', 'student', 'feeType', 'bankAccount']), 'Pembayaran berhasil dikonfirmasi.');
    }

    public function rejectFeePayment(Request $request, FeePayment $payment, FeeService $service)
    {
        $data = $request->validate([
            'adminNotes' => ['nullable', 'string'],
        ]);

        $payment = $service->rejectFeePayment($payment, $request->user()->id, $data['adminNotes'] ?? null);

        return ApiResponse::success($payment->fresh(['fee.student', 'bankAccount']), 'Pembayaran ditolak.');
    }

    public function student(Request $request, Student $student)
    {
        if ($request->user()->hasRole('orang_tua')) {
            abort_unless($request->user()->children()->where('students.id', $student->id)->exists(), 403);
        }

        return ApiResponse::success($student->fees()->with(['feeType', 'bankAccount', 'payments'])->latest('year')->latest('month')->get(), 'Tagihan murid berhasil diambil.');
    }

    public function summary(Request $request)
    {
        $month = $request->integer('month', now()->month);
        $year = $request->integer('year', now()->year);
        $query = StudentFee::where('month', $month)->where('year', $year);
        $target = (int) (clone $query)->sum('total_billed');
        $paid = (int) (clone $query)->sum('paid_amount');
        $overdueQuery = (clone $query)->whereIn('status', ['unpaid', 'partial'])->whereDate('due_date', '<', now()->toDateString());
        $overdueTarget = (int) (clone $overdueQuery)->sum('total_billed');
        $overduePaid = (int) (clone $overdueQuery)->sum('paid_amount');
        $enrollmentYear = AcademicYear::where('name', '2026/2027')->first()
            ?? AcademicYear::where('is_active', true)->first()
            ?? AcademicYear::latest('id')->first();
        $enrollmentQuery = EnrollmentUpdate::query()
            ->whereIn('category', EnrollmentUpdate::FINANCIAL_CATEGORIES)
            ->when($enrollmentYear, fn ($q) => $q->where('academic_year_id', $enrollmentYear->id));
        $enrollmentRows = (clone $enrollmentQuery)->get();
        $enrollmentTarget = (int) $enrollmentRows->sum(fn (EnrollmentUpdate $row) => max((int) ($row->target_amount ?? 0), (int) $row->paid_amount));
        $enrollmentPaid = (int) $enrollmentRows->sum('paid_amount');
        $enrollmentOutstanding = (int) $enrollmentRows->sum(fn (EnrollmentUpdate $row) => max(max((int) ($row->target_amount ?? 0), (int) $row->paid_amount) - (int) $row->paid_amount, 0));

        return ApiResponse::success([
            'month' => $month,
            'year' => $year,
            'target' => $target,
            'paid' => $paid,
            'outstanding' => max($target - $paid, 0),
            'overdue' => max($overdueTarget - $overduePaid, 0),
            'overdue_count' => (clone $overdueQuery)->count(),
            'unpaid_count' => (clone $query)->where('status', 'unpaid')->count(),
            'partial_count' => (clone $query)->where('status', 'partial')->count(),
            'paid_count' => (clone $query)->where('status', 'paid')->count(),
            'waived_count' => (clone $query)->where('status', 'waived')->count(),
            'enrollment_summary' => [
                'academic_year_id' => $enrollmentYear?->id,
                'academic_year' => $enrollmentYear?->name,
                'target' => $enrollmentTarget,
                'paid' => $enrollmentPaid,
                'outstanding' => $enrollmentOutstanding,
                'count' => (clone $enrollmentQuery)->count(),
                'paid_count' => (clone $enrollmentQuery)->where('payment_status', 'paid')->count(),
                'partial_count' => (clone $enrollmentQuery)->where('payment_status', 'partial')->count(),
                'unpaid_count' => (clone $enrollmentQuery)->where('payment_status', 'unpaid')->count(),
            ],
        ], 'Ringkasan SPP berhasil diambil.');
    }

    public function aging(Request $request)
    {
        $rows = StudentFee::query()
            ->with(['student', 'feeType', 'bankAccount'])
            ->whereIn('status', ['unpaid', 'partial'])
            ->when($request->filled('month'), fn ($query) => $query->where('month', $request->integer('month')))
            ->when($request->filled('year'), fn ($query) => $query->where('year', $request->integer('year')))
            ->get()
            ->map(function (StudentFee $fee) {
                $daysPastDue = $fee->due_date ? max($fee->due_date->diffInDays(now(), false), 0) : 0;

                return [
                    'id' => $fee->id,
                    'invoice_number' => $fee->invoice_number,
                    'student' => $fee->student,
                    'fee_type' => $fee->feeType,
                    'status' => $fee->status,
                    'due_date' => $fee->due_date,
                    'days_past_due' => $daysPastDue,
                    'outstanding' => max($fee->total_billed - $fee->paid_amount, 0),
                    'bucket' => match (true) {
                        $daysPastDue >= 31 => '31+ hari',
                        $daysPastDue >= 15 => '15-30 hari',
                        $daysPastDue >= 1 => '1-14 hari',
                        default => 'Belum jatuh tempo',
                    },
                ];
            });

        return ApiResponse::success([
            'rows' => $rows,
            'summary' => $rows->groupBy('bucket')->map(fn ($items) => [
                'count' => $items->count(),
                'outstanding' => $items->sum('outstanding'),
            ])->values(),
        ], 'Aging tagihan berhasil diambil.');
    }

    public function export(Request $request)
    {
        $rows = StudentFee::with(['student', 'feeType'])
            ->when($request->filled('month'), fn ($q) => $q->where('month', $request->integer('month')))
            ->when($request->filled('year'), fn ($q) => $q->where('year', $request->integer('year')))
            ->get()
            ->map(fn (StudentFee $fee) => [
                'student' => $fee->student?->full_name,
                'fee_type' => $fee->feeType?->name,
                'invoice_number' => $fee->invoice_number,
                'month' => $fee->month,
                'year' => $fee->year,
                'due_date' => optional($fee->due_date)->toDateString(),
                'total_billed' => $fee->total_billed,
                'paid_amount' => $fee->paid_amount,
                'outstanding' => max($fee->total_billed - $fee->paid_amount, 0),
                'status' => $fee->status,
            ]);

        return ApiResponse::success($rows, 'Export tagihan berhasil diambil.');
    }

    private function feeTypePayload(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'integer', 'min:0'],
            'dueDay' => ['nullable', 'integer', 'min:1', 'max:31'],
            'applicableLevels' => ['nullable', 'array'],
            'isRecurring' => ['boolean'],
            'isActive' => ['boolean'],
        ]);

        return [
            'name' => $data['name'],
            'amount' => $data['amount'],
            'due_day' => $data['dueDay'] ?? 10,
            'applicable_levels' => $data['applicableLevels'] ?? [],
            'is_recurring' => $data['isRecurring'] ?? true,
            'is_active' => $data['isActive'] ?? true,
        ];
    }
}
