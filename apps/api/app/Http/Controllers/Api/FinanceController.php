<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\EnrollmentUpdate;
use App\Models\FeePayment;
use App\Models\FinanceEntry;
use App\Models\StudentFee;
use App\Models\TeacherPayroll;
use App\Models\User;
use App\Support\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class FinanceController extends Controller
{
    public function overview(Request $request)
    {
        $month = $request->input('month') === 'current' ? now()->month : $request->integer('month', now()->month);
        $year = $request->input('year') === 'current' ? now()->year : $request->integer('year', now()->year);

        $sppQuery = StudentFee::where('month', $month)->where('year', $year);
        $sppTarget = (int) (clone $sppQuery)->sum('total_billed');
        $sppPaid = (int) (clone $sppQuery)->sum('paid_amount');

        $enrollmentYear = AcademicYear::where('name', '2026/2027')->first()
            ?? AcademicYear::where('is_active', true)->first()
            ?? AcademicYear::latest('id')->first();
        $enrollmentRows = EnrollmentUpdate::query()
            ->whereIn('category', EnrollmentUpdate::FINANCIAL_CATEGORIES)
            ->when($enrollmentYear, fn ($query) => $query->where('academic_year_id', $enrollmentYear->id))
            ->get();
        $enrollmentTarget = (int) $enrollmentRows->sum(fn (EnrollmentUpdate $row) => max((int) ($row->target_amount ?? 0), (int) $row->paid_amount));
        $enrollmentPaid = (int) $enrollmentRows->sum('paid_amount');

        $payrolls = TeacherPayroll::with('teacher:id,name,email')
            ->where('month', $month)
            ->where('year', $year)
            ->latest('id')
            ->get();
        $payrollTarget = (int) $payrolls->sum('total_amount');
        $payrollPaid = (int) $payrolls->where('status', 'paid')->sum('total_amount');

        $entries = FinanceEntry::with(['creator:id,name', 'updater:id,name'])
            ->whereMonth('entry_date', $month)
            ->whereYear('entry_date', $year)
            ->latest('entry_date')
            ->latest('id')
            ->get();
        $manualIncome = (int) $entries->where('type', 'income')->sum('amount');
        $manualExpense = (int) $entries->where('type', 'expense')->sum('amount');
        $entryCategoryLabels = [
            'operational' => 'Operasional',
            'donation' => 'Donasi',
            'asset' => 'Aset',
            'maintenance' => 'Maintenance',
            'other' => 'Lainnya',
        ];
        $manualCategories = $entries
            ->groupBy(fn (FinanceEntry $entry) => $entry->type.'|'.$entry->category)
            ->map(function (Collection $items, string $key) use ($entryCategoryLabels) {
                [$type, $category] = explode('|', $key);
                $label = $entryCategoryLabels[$category] ?? ucfirst($category);

                return $this->categorySummary(
                    'manual_'.$type.'_'.$category,
                    $label.($type === 'income' ? ' Masuk' : ' Keluar'),
                    $type,
                    (int) $items->sum('amount'),
                    (int) $items->sum('amount'),
                    $items->count(),
                );
            })
            ->values()
            ->all();

        $categories = array_merge([
            $this->categorySummary('spp', 'Uang SPP', 'income', $sppTarget, $sppPaid, (clone $sppQuery)->count()),
            $this->categorySummary('enrollment', 'Uang Pendaftaran', 'income', $enrollmentTarget, $enrollmentPaid, $enrollmentRows->count()),
            $this->categorySummary('payroll', 'Gaji Guru', 'expense', $payrollTarget, $payrollPaid, $payrolls->count()),
        ], $manualCategories);

        $cashIn = $sppPaid + $enrollmentPaid + $manualIncome;
        $cashOut = $payrollPaid + $manualExpense;

        return ApiResponse::success([
            'module_name' => 'Pusat Keuangan',
            'month' => $month,
            'year' => $year,
            'cash_in' => $cashIn,
            'cash_out' => $cashOut,
            'net_cash' => $cashIn - $cashOut,
            'target_income' => $sppTarget + $enrollmentTarget + $manualIncome,
            'outstanding_income' => max($sppTarget - $sppPaid, 0) + max($enrollmentTarget - $enrollmentPaid, 0),
            'planned_expense' => $payrollTarget + $manualExpense,
            'categories' => $categories,
            'cash_flow' => [
                'three_months' => $this->cashFlowRows(90, 'month'),
                'one_month' => $this->cashFlowRows(30, 'day'),
                'seven_days' => $this->cashFlowRows(7, 'day'),
                'one_day' => $this->cashFlowRows(1, 'time'),
            ],
            'recent_entries' => $entries->take(8)->values(),
            'payrolls' => $payrolls,
        ], 'Ringkasan pusat keuangan berhasil diambil.');
    }

    public function entries(Request $request)
    {
        $query = FinanceEntry::with(['creator:id,name', 'updater:id,name'])->latest('entry_date')->latest('id');

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }

        if ($request->filled('month')) {
            $query->whereMonth('entry_date', $request->integer('month'));
        }

        if ($request->filled('year')) {
            $query->whereYear('entry_date', $request->integer('year'));
        }

        return ApiResponse::fromPaginator($query->paginate(min(max((int) $request->integer('perPage', 20), 1), 100)), 'Catatan kas berhasil diambil.');
    }

    public function audit(Request $request)
    {
        [$start, $end] = $this->auditWindow($request);
        $rows = collect();

        FeePayment::with(['fee.student:id,full_name', 'fee.feeType:id,name', 'confirmer:id,name'])
            ->where('status', 'confirmed')
            ->whereBetween('confirmed_at', [$start, $end])
            ->get()
            ->each(function (FeePayment $payment) use ($rows) {
                $rows->push([
                    'id' => 'fee-payment-'.$payment->id,
                    'record_id' => $payment->id,
                    'kind' => 'spp',
                    'type' => 'income',
                    'category' => 'SPP',
                    'title' => trim(($payment->fee?->feeType?->name ?? 'SPP').' - '.($payment->fee?->student?->full_name ?? 'Murid')),
                    'amount' => (int) ($payment->confirmed_amount ?? $payment->received_amount),
                    'date' => optional($payment->confirmed_at)->toDateString(),
                    'source' => 'Konfirmasi SPP',
                    'actor' => $payment->confirmer?->name,
                    'updated_at' => $payment->updated_at,
                ]);
            });

        StudentFee::with(['student:id,full_name', 'feeType:id,name', 'confirmer:id,name'])
            ->where('paid_amount', '>', 0)
            ->whereDoesntHave('payments', fn ($query) => $query->where('status', 'confirmed'))
            ->whereBetween('updated_at', [$start, $end])
            ->get()
            ->each(function (StudentFee $fee) use ($rows) {
                $rows->push([
                    'id' => 'student-fee-'.$fee->id,
                    'record_id' => $fee->id,
                    'kind' => 'spp',
                    'type' => 'income',
                    'category' => 'SPP',
                    'title' => trim(($fee->feeType?->name ?? 'SPP').' - '.($fee->student?->full_name ?? 'Murid')),
                    'amount' => (int) $fee->paid_amount,
                    'date' => optional($fee->paid_at ?? $fee->updated_at)->toDateString(),
                    'source' => 'Tagihan SPP',
                    'actor' => $fee->confirmer?->name,
                    'updated_at' => $fee->updated_at,
                ]);
            });

        EnrollmentUpdate::with('updater:id,name')
            ->whereIn('category', EnrollmentUpdate::FINANCIAL_CATEGORIES)
            ->where('paid_amount', '>', 0)
            ->whereBetween('updated_at', [$start, $end])
            ->get()
            ->each(function (EnrollmentUpdate $row) use ($rows) {
                $rows->push([
                    'id' => 'enrollment-'.$row->id,
                    'record_id' => $row->id,
                    'kind' => 'enrollment',
                    'type' => 'income',
                    'category' => 'Uang Pendaftaran',
                    'title' => $row->full_name,
                    'amount' => (int) $row->paid_amount,
                    'date' => optional($row->updated_at)->toDateString(),
                    'source' => 'PPDB/daftar ulang',
                    'actor' => $row->updater?->name,
                    'updated_at' => $row->updated_at,
                ]);
            });

        FinanceEntry::with(['creator:id,name', 'updater:id,name'])
            ->whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->get()
            ->each(function (FinanceEntry $entry) use ($rows) {
                $rows->push([
                    'id' => 'finance-entry-'.$entry->id,
                    'record_id' => $entry->id,
                    'kind' => 'manual',
                    'type' => $entry->type,
                    'category' => $entry->category,
                    'title' => $entry->title,
                    'amount' => (int) $entry->amount,
                    'date' => optional($entry->entry_date)->toDateString(),
                    'source' => $entry->source,
                    'actor' => $entry->updater?->name ?? $entry->creator?->name,
                    'updated_at' => $entry->updated_at,
                ]);
            });

        TeacherPayroll::with(['teacher:id,name,email', 'updater:id,name'])
            ->where('status', 'paid')
            ->whereDate('paid_at', '>=', $start->toDateString())
            ->whereDate('paid_at', '<=', $end->toDateString())
            ->get()
            ->each(function (TeacherPayroll $payroll) use ($rows) {
                $rows->push([
                    'id' => 'payroll-'.$payroll->id,
                    'record_id' => $payroll->id,
                    'kind' => 'payroll',
                    'type' => 'expense',
                    'category' => 'Gaji Guru',
                    'title' => $payroll->teacher?->name ?? 'Guru',
                    'amount' => (int) $payroll->total_amount,
                    'date' => optional($payroll->paid_at)->toDateString(),
                    'source' => 'Payroll',
                    'actor' => $payroll->updater?->name,
                    'updated_at' => $payroll->updated_at,
                ]);
            });

        if ($request->filled('search')) {
            $search = strtolower((string) $request->string('search'));
            $rows = $rows->filter(fn (array $row) => str_contains(strtolower(implode(' ', [
                $row['title'],
                $row['category'],
                $row['source'] ?? '',
                $row['actor'] ?? '',
                $row['type'],
            ])), $search));
        }

        if ($request->filled('type')) {
            $rows = $rows->where('type', (string) $request->string('type'));
        }

        $rows = $rows->sortByDesc(fn (array $row) => ($row['date'] ?? '').'|'.($row['updated_at'] ?? ''))->values();

        return ApiResponse::success([
            'range' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
            'summary' => [
                'cash_in' => (int) $rows->where('type', 'income')->sum('amount'),
                'cash_out' => (int) $rows->where('type', 'expense')->sum('amount'),
                'count' => $rows->count(),
            ],
            'rows' => $rows->values(),
        ], 'Audit pusat keuangan berhasil diambil.');
    }

    public function storeEntry(Request $request)
    {
        $entry = FinanceEntry::create([
            ...$this->entryPayload($request),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);
        $this->forgetDashboard();

        return ApiResponse::success($entry->load(['creator:id,name', 'updater:id,name']), 'Catatan kas berhasil dibuat.', [], 201);
    }

    public function updateEntry(Request $request, FinanceEntry $entry)
    {
        $entry->update([
            ...$this->entryPayload($request),
            'updated_by' => $request->user()->id,
        ]);
        $this->forgetDashboard();

        return ApiResponse::success($entry->fresh(['creator:id,name', 'updater:id,name']), 'Catatan kas berhasil diperbarui.');
    }

    public function deleteEntry(FinanceEntry $entry)
    {
        $entry->delete();
        $this->forgetDashboard();

        return ApiResponse::success(null, 'Catatan kas berhasil dihapus.');
    }

    public function payrolls(Request $request)
    {
        $query = TeacherPayroll::with(['teacher:id,name,email', 'creator:id,name', 'updater:id,name'])
            ->latest('year')
            ->latest('month')
            ->latest('id');

        if ($request->filled('teacherId')) {
            $query->where('teacher_id', $request->integer('teacherId'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('month')) {
            $query->where('month', $request->integer('month'));
        }

        if ($request->filled('year')) {
            $query->where('year', $request->integer('year'));
        }

        return ApiResponse::fromPaginator($query->paginate(min(max((int) $request->integer('perPage', 20), 1), 100)), 'Data gaji guru berhasil diambil.');
    }

    public function payrollTeachers()
    {
        return ApiResponse::success(
            User::role('guru')->where('is_active', true)->orderBy('name')->get(['id', 'name', 'email']),
            'Daftar guru berhasil diambil.',
        );
    }

    public function storePayroll(Request $request)
    {
        $payload = $this->payrollPayload($request);
        $payroll = TeacherPayroll::updateOrCreate([
            'teacher_id' => $payload['teacher_id'],
            'month' => $payload['month'],
            'year' => $payload['year'],
        ], [
            ...$payload,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);
        $this->forgetDashboard();

        return ApiResponse::success($payroll->load(['teacher:id,name,email', 'creator:id,name', 'updater:id,name']), 'Gaji guru berhasil disimpan.', [], 201);
    }

    public function updatePayroll(Request $request, TeacherPayroll $payroll)
    {
        $payroll->update([
            ...$this->payrollPayload($request),
            'updated_by' => $request->user()->id,
        ]);
        $this->forgetDashboard();

        return ApiResponse::success($payroll->fresh(['teacher:id,name,email', 'creator:id,name', 'updater:id,name']), 'Gaji guru berhasil diperbarui.');
    }

    public function deletePayroll(TeacherPayroll $payroll)
    {
        $payroll->delete();
        $this->forgetDashboard();

        return ApiResponse::success(null, 'Gaji guru berhasil dihapus.');
    }

    private function entryPayload(Request $request): array
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['income', 'expense'])],
            'category' => ['required', Rule::in(['operational', 'donation', 'asset', 'maintenance', 'other'])],
            'title' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'integer', 'min:0'],
            'entryDate' => ['required', 'date', 'before_or_equal:today'],
            'source' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
        ]);

        return [
            'type' => $data['type'],
            'category' => $data['category'],
            'title' => $data['title'],
            'amount' => $data['amount'],
            'entry_date' => Carbon::parse($data['entryDate'])->toDateString(),
            'source' => $data['source'] ?? null,
            'notes' => $data['notes'] ?? null,
        ];
    }

    private function payrollPayload(Request $request): array
    {
        $data = $request->validate([
            'teacherId' => ['required', 'exists:users,id'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'baseSalary' => ['required', 'integer', 'min:0'],
            'incentiveAmount' => ['nullable', 'integer', 'min:0'],
            'deductionAmount' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', Rule::in(['draft', 'approved', 'paid', 'cancelled'])],
            'paidAt' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        abort_unless(User::whereKey($data['teacherId'])->whereHas('roles', fn ($query) => $query->where('name', 'guru'))->exists(), 422, 'User yang dipilih bukan guru.');

        return [
            'teacher_id' => $data['teacherId'],
            'month' => $data['month'],
            'year' => $data['year'],
            'base_salary' => $data['baseSalary'],
            'incentive_amount' => $data['incentiveAmount'] ?? 0,
            'deduction_amount' => $data['deductionAmount'] ?? 0,
            'status' => $data['status'],
            'paid_at' => ($data['status'] === 'paid') ? ($data['paidAt'] ?? now()->toDateString()) : null,
            'notes' => $data['notes'] ?? null,
        ];
    }

    private function categorySummary(string $key, string $label, string $type, int $target, int $paid, int $count): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'type' => $type,
            'target' => $target,
            'paid' => $paid,
            'outstanding' => max($target - $paid, 0),
            'count' => $count,
        ];
    }

    private function cashFlowRows(int $days, string $bucket): array
    {
        $end = now()->endOfDay();
        $start = now()->subDays($days - 1)->startOfDay();
        $rows = collect();

        $this->pushFlowRows($rows, StudentFee::query()
            ->where('paid_amount', '>', 0)
            ->whereBetween('updated_at', [$start, $end])
            ->get(['paid_amount', 'paid_at', 'updated_at']), 'updated_at', 'paid_amount', 'income', 'SPP', fn (StudentFee $fee) => $fee->paid_at ?? $fee->updated_at);

        $this->pushFlowRows($rows, EnrollmentUpdate::query()
            ->whereIn('category', EnrollmentUpdate::FINANCIAL_CATEGORIES)
            ->where('paid_amount', '>', 0)
            ->whereBetween('updated_at', [$start, $end])
            ->get(['paid_amount', 'updated_at']), 'updated_at', 'paid_amount', 'income', 'Pendaftaran');

        $this->pushFlowRows($rows, FinanceEntry::query()
            ->whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->get(['type', 'amount', 'entry_date', 'category', 'created_at', 'updated_at']), 'entry_date', 'amount', null, 'Kas manual', fn (FinanceEntry $entry) => $this->flowDateWithRecordedTime($entry->entry_date, $entry->updated_at ?? $entry->created_at));

        $this->pushFlowRows($rows, TeacherPayroll::query()
            ->where('status', 'paid')
            ->whereDate('paid_at', '>=', $start->toDateString())
            ->whereDate('paid_at', '<=', $end->toDateString())
            ->get(['total_amount', 'paid_at', 'created_at', 'updated_at']), 'paid_at', 'total_amount', 'expense', 'Gaji guru', fn (TeacherPayroll $payroll) => $this->flowDateWithRecordedTime($payroll->paid_at, $payroll->updated_at ?? $payroll->created_at));

        $grouped = $rows
            ->groupBy(fn (array $row) => $this->flowBucketKey($row['date'], $bucket))
            ->map(function (Collection $items, string $key) use ($bucket) {
                $cashIn = (int) $items->where('type', 'income')->sum('amount');
                $cashOut = (int) $items->where('type', 'expense')->sum('amount');

                return [
                    'key' => $key,
                    'label' => $this->flowLabel($key, $bucket),
                    'time' => $bucket === 'time' ? Carbon::parse($key)->timestamp * 1000 : null,
                    'cash_in' => $cashIn,
                    'cash_out' => $cashOut,
                    'net_cash' => $cashIn - $cashOut,
                ];
            });

        $keys = collect();
        if ($bucket === 'month') {
            $cursor = $start->copy()->startOfMonth();
            while ($cursor <= $end) {
                $keys->push($cursor->format('Y-m'));
                $cursor->addMonth();
            }
        } elseif ($bucket === 'time') {
            $cursor = $start->copy()->startOfDay();
            $last = $end->copy()->endOfDay();
            while ($cursor <= $last) {
                $keys->push($cursor->format('Y-m-d H:i'));
                $cursor->addHour();
            }
            $keys = $keys->merge($grouped->keys())->unique()->sort()->values();
        } else {
            $cursor = $start->copy();
            while ($cursor <= $end) {
                $keys->push($cursor->toDateString());
                $cursor->addDay();
            }
        }

        return $keys->map(fn (string $key) => $grouped->get($key, [
            'key' => $key,
            'label' => $this->flowLabel($key, $bucket),
            'time' => $bucket === 'time' ? Carbon::parse($key)->timestamp * 1000 : null,
            'cash_in' => 0,
            'cash_out' => 0,
            'net_cash' => 0,
        ]))->values()->all();
    }

    private function auditWindow(Request $request): array
    {
        $end = now()->endOfDay();

        if ($request->filled('month') && $request->filled('year')) {
            $start = Carbon::create($request->integer('year'), $request->integer('month'), 1)->startOfDay();

            return [$start, $start->copy()->endOfMonth()->min($end)];
        }

        $start = match ($request->input('range', 'sevenDays')) {
            'oneDay' => now()->startOfDay(),
            'oneMonth' => now()->subMonth()->startOfDay(),
            'threeMonths' => now()->subMonths(3)->startOfDay(),
            default => now()->subDays(6)->startOfDay(),
        };

        return [$start, $end];
    }

    private function pushFlowRows(Collection $target, Collection $source, string $dateKey, string $amountKey, ?string $forcedType, string $sourceLabel, ?callable $dateResolver = null): void
    {
        foreach ($source as $item) {
            $type = $forcedType ?? $item->type;
            $target->push([
                'date' => $dateResolver ? $dateResolver($item) : $item->{$dateKey},
                'type' => $type,
                'source' => $sourceLabel,
                'amount' => (int) $item->{$amountKey},
            ]);
        }
    }

    private function flowBucketKey($date, string $bucket): string
    {
        $parsed = Carbon::parse($date);

        if ($bucket === 'month') {
            return $parsed->format('Y-m');
        }

        if ($bucket === 'time') {
            return $parsed->copy()->second(0)->format('Y-m-d H:i');
        }

        return $parsed->toDateString();
    }

    private function flowLabel(string $key, string $bucket): string
    {
        return match ($bucket) {
            'month' => Carbon::parse($key.'-01')->translatedFormat('M Y'),
            'time' => Carbon::parse($key)->format('H:i'),
            default => Carbon::parse($key)->format('d/m'),
        };
    }

    private function flowDateWithRecordedTime($date, $recordedAt): Carbon
    {
        $base = Carbon::parse($date)->startOfDay();

        if (! $recordedAt) {
            return $base;
        }

        $time = Carbon::parse($recordedAt);

        return $base->setTime($time->hour, $time->minute, $time->second);
    }

    private function forgetDashboard(): void
    {
        Cache::forget('dashboard:v1:'.now()->toDateString());
        Cache::forget('dashboard:v2:'.now()->toDateString());
        Cache::forget('dashboard:v3:'.now()->toDateString());
        Cache::forget('dashboard:v4:'.now()->toDateString());
        User::query()->pluck('id')->each(fn ($id) => Cache::forget('dashboard:v6:'.now()->toDateString().':'.$id));
    }
}
