<?php

namespace App\Services;

use App\Models\FeePayment;
use App\Models\FeeType;
use App\Models\SchoolBankAccount;
use App\Models\SchoolNotification;
use App\Models\Student;
use App\Models\StudentFee;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FeeService
{
    public function generateMonthly(int $month, int $year, int $academicYearId): int
    {
        $students = Student::where('status', 'active')->with('classes')->get();
        $bankAccount = SchoolBankAccount::where('is_active', true)->first();
        $count = 0;

        foreach ($students as $student) {
            $level = $student->active_class?->level;
            $levels = array_filter([$level, str_replace(' ', '', (string) $level)]);
            $programType = $student->program_type ?? $student->active_class?->pivot?->program_type ?? 'regular';
            $feeTypes = FeeType::where('is_active', true)
                ->where('is_recurring', true)
                ->where(function ($query) use ($levels) {
                    $query->whereNull('applicable_levels');
                    $query->orWhereJsonLength('applicable_levels', 0);
                    foreach ($levels as $level) {
                        $query->orWhereJsonContains('applicable_levels', $level);
                    }
                })
                ->where(function ($query) use ($programType) {
                    $query->whereNull('applicable_programs')
                        ->orWhereJsonLength('applicable_programs', 0)
                        ->orWhereJsonContains('applicable_programs', $programType);
                })
                ->get();

            foreach ($feeTypes as $feeType) {
                $exists = StudentFee::where([
                    'student_id' => $student->id,
                    'fee_type_id' => $feeType->id,
                    'month' => $month,
                    'year' => $year,
                ])->exists();

                if ($exists) {
                    continue;
                }

                $uniqueCode = app(UniqueCodeService::class)->generate($month, $year);
                $dueDate = $this->dueDate($month, $year, (int) $feeType->due_day);
                StudentFee::create([
                    'invoice_number' => $this->invoiceNumber($year, $month, $student->id, $feeType->id),
                    'student_id' => $student->id,
                    'fee_type_id' => $feeType->id,
                    'academic_year_id' => $academicYearId,
                    'month' => $month,
                    'year' => $year,
                    'due_date' => $dueDate,
                    'issued_at' => now(),
                    'amount' => $feeType->amount,
                    'discount' => 0,
                    'unique_code' => $uniqueCode,
                    'total_billed' => $feeType->amount + $uniqueCode,
                    'status' => 'unpaid',
                    'bank_account_id' => $bankAccount?->id,
                ]);
                $count++;
            }
        }

        return $count;
    }

    public function confirmPayment(StudentFee $fee, int $receivedAmount, int $confirmedBy, ?int $bankAccountId = null, ?string $proofUrl = null, ?string $notes = null): void
    {
        $payment = FeePayment::create([
            'student_fee_id' => $fee->id,
            'bank_account_id' => $bankAccountId ?? $fee->bank_account_id,
            'uploaded_by' => $confirmedBy,
            'received_amount' => $receivedAmount,
            'proof_url' => $proofUrl ?? $fee->payment_proof_url,
            'payer_notes' => $notes,
            'status' => 'pending',
        ]);

        $this->confirmFeePayment($payment, $receivedAmount, $confirmedBy, $notes);
    }

    public function confirmFeePayment(FeePayment $payment, int $confirmedAmount, int $confirmedBy, ?string $notes = null): StudentFee
    {
        return DB::transaction(function () use ($payment, $confirmedAmount, $confirmedBy, $notes) {
            $payment = FeePayment::whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($payment->status !== 'pending') {
                abort(422, 'Pembayaran ini sudah diproses.');
            }

            $payment->update([
                'confirmed_amount' => $confirmedAmount,
                'status' => 'confirmed',
                'admin_notes' => $notes,
                'confirmed_by' => $confirmedBy,
                'confirmed_at' => now(),
            ]);

            $fee = $this->syncFeePaymentState($payment->fee()->lockForUpdate()->firstOrFail(), $confirmedBy);
            $this->notifyParents($fee);

            return $fee;
        });
    }

    public function rejectFeePayment(FeePayment $payment, int $rejectedBy, ?string $notes = null): FeePayment
    {
        if ($payment->status !== 'pending') {
            abort(422, 'Pembayaran ini sudah diproses.');
        }

        $payment->update([
            'status' => 'rejected',
            'admin_notes' => $notes,
            'rejected_by' => $rejectedBy,
            'rejected_at' => now(),
        ]);

        return $payment;
    }

    private function syncFeePaymentState(StudentFee $fee, int $confirmedBy): StudentFee
    {
        $confirmedPayments = $fee->payments()
            ->where('status', 'confirmed')
            ->orderBy('confirmed_at')
            ->get();

        $paidAmount = (int) $confirmedPayments->sum(fn (FeePayment $payment) => $payment->confirmed_amount ?? $payment->received_amount);
        $fee->paid_amount = $paidAmount;
        $fee->status = $paidAmount <= 0 ? 'unpaid' : ($paidAmount >= $fee->total_billed ? 'paid' : 'partial');
        $fee->paid_at = $fee->status === 'paid' ? now() : null;
        $fee->confirmed_by = $confirmedBy;
        $fee->payment_history = $confirmedPayments->map(fn (FeePayment $payment) => [
            'amount' => $payment->confirmed_amount ?? $payment->received_amount,
            'proof_url' => $payment->proof_url,
            'uploaded_at' => $payment->created_at?->toIso8601String(),
            'confirmed_at' => $payment->confirmed_at?->toIso8601String(),
            'confirmed_by_id' => $payment->confirmed_by,
            'bank_account_id' => $payment->bank_account_id,
            'notes' => $payment->admin_notes,
        ])->values()->all();

        $latestPayment = $confirmedPayments->last();
        if ($latestPayment?->proof_url) {
            $fee->payment_proof_url = $latestPayment->proof_url;
        }
        if ($latestPayment?->bank_account_id) {
            $fee->bank_account_id = $latestPayment->bank_account_id;
        }

        $fee->save();

        return $fee->fresh(['student.parents', 'feeType', 'bankAccount', 'payments']);
    }

    private function notifyParents(StudentFee $fee): void
    {
        $student = $fee->student()->with('parents')->first();
        if (! $student) {
            return;
        }

        $nama = $student->nickname ?? $student->full_name;
        $bulan = \Carbon\Carbon::createFromDate($fee->year, $fee->month, 1)->translatedFormat('F Y');
        $sisa = max($fee->total_billed - $fee->paid_amount, 0);

        foreach ($student->parents as $parent) {
            SchoolNotification::create([
                'user_id' => $parent->id,
                'title' => $fee->status === 'paid' ? "Pembayaran SPP {$nama} Lunas" : 'Pembayaran Sebagian Diterima',
                'body' => $fee->status === 'paid'
                    ? "SPP {$bulan} {$nama} telah dikonfirmasi. Terima kasih."
                    : 'Pembayaran diterima. Sisa tagihan: Rp '.number_format($sisa, 0, ',', '.'),
                'data' => ['type' => 'fee_payment', 'fee_id' => $fee->id, 'student_id' => $student->id],
            ]);
        }
    }

    private function dueDate(int $month, int $year, int $dueDay): Carbon
    {
        $date = Carbon::createFromDate($year, $month, 1);

        return $date->copy()->day(min(max($dueDay, 1), $date->daysInMonth));
    }

    private function invoiceNumber(int $year, int $month, int $studentId, int $feeTypeId): string
    {
        return sprintf('INV-%04d%02d-%05d-%03d', $year, $month, $studentId, $feeTypeId);
    }
}
