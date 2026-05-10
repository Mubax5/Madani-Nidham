<?php

namespace App\Services\Ai;

use App\Models\AcademicYear;
use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\EnrollmentUpdate;
use App\Models\FinanceEntry;
use App\Models\Journal;
use App\Models\MontessoriArea;
use App\Models\Registration;
use App\Models\SchoolAgenda;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\StudentHafalan;
use App\Models\TeacherPayroll;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AiDataAnswerService
{
    public function answer(string $intent, User $user, ?Student $student = null, ?string $message = null): ?string
    {
        if ($intent === AiIntentRouter::UNCLEAR) {
            return 'Tulis pertanyaan yang lebih spesifik, misalnya **absensi hari ini**, **daftar murid aktif**, **gaji guru**, atau **PPDB 2026/2027**.';
        }

        if ($intent === AiIntentRouter::OUT_OF_SCOPE) {
            return 'Kamu gabisa jawab itu dan silahkan jawab yang lain.';
        }

        if ($intent === AiIntentRouter::IDENTITY) {
            return $student ? $this->childIdentity($student) : $this->managerIdentity($user);
        }

        if ($student) {
            return match ($intent) {
                AiIntentRouter::CHILD_ATTENDANCE => $this->childAttendance($student),
                AiIntentRouter::CHILD_JOURNAL => $this->childJournal($student),
                AiIntentRouter::CHILD_MONTESSORI => $this->childMontessori($student),
                AiIntentRouter::CHILD_HAFALAN => $this->childHafalan($student),
                AiIntentRouter::AGENDA => $this->agenda(),
                default => null,
            };
        }

        return match ($intent) {
            AiIntentRouter::STUDENT_LIST => $this->studentList(),
            AiIntentRouter::STUDENT_COUNT => $this->studentCount(),
            AiIntentRouter::ATTENDANCE => $this->attendance(),
            AiIntentRouter::SPP => $this->finance('spp', $message ?? ''),
            AiIntentRouter::PAYROLL => $this->finance('payroll', $message ?? ''),
            AiIntentRouter::ENROLLMENT => $this->enrollment(),
            AiIntentRouter::FINANCE => $this->finance('overview', $message ?? ''),
            AiIntentRouter::AGENDA => $this->agenda(),
            AiIntentRouter::ANNOUNCEMENT => $this->announcements(),
            AiIntentRouter::LEARNING => $this->learning(),
            AiIntentRouter::USER_ROLES => $this->userRoles($message ?? ''),
            AiIntentRouter::SCHOOL_PROFILE => 'Data ringkasan belum memuat detail profil sekolah atau kepala sekolah. Silakan cek menu **Pengaturan** atau data **User Admin** untuk informasi tersebut.',
            default => null,
        };
    }

    public function contextFor(string $intent, User $user, ?Student $student = null): array
    {
        $key = 'ai_context:'.($student ? 'student:'.$student->id : 'manager').':'.$intent;

        return Cache::remember($key, 45, function () use ($intent, $student) {
            if ($student) {
                return $this->childContext($student, $intent);
            }

            return $this->managerContext($intent);
        });
    }

    private function studentList(): string
    {
        $students = Student::with('classes:id,name,level')
            ->where('status', 'active')
            ->orderBy('full_name')
            ->get(['id', 'nis', 'full_name', 'nickname'])
            ->groupBy(fn (Student $student) => $student->active_class?->name ?? 'Belum ada kelas')
            ->sortKeysUsing(fn (string $a, string $b) => $this->classOrder($a) <=> $this->classOrder($b));

        if ($students->isEmpty()) {
            return 'Belum ada murid aktif yang tercatat.';
        }

        $lines = ["Berikut daftar **{$students->flatten(1)->count()} murid aktif** berdasarkan kelas:"];
        foreach ($students as $className => $classStudents) {
            $lines[] = '';
            $lines[] = "**{$className} ({$classStudents->count()} murid)**";
            foreach ($classStudents->values() as $index => $student) {
                $nickname = $student->nickname && $student->nickname !== $student->full_name ? " ({$student->nickname})" : '';
                $nis = $student->nis ? " - {$student->nis}" : '';
                $lines[] = ($index + 1).". **{$student->full_name}**{$nickname}{$nis}";
            }
        }

        return implode("\n", $lines);
    }

    private function studentCount(): string
    {
        $total = Student::where('status', 'active')->count();
        $classes = $this->classCounts();
        $lines = ["Saat ini ada **{$total} murid aktif**."];

        foreach ($classes as $class) {
            $lines[] = "- {$class['kelas']}: **{$class['murid']} murid**";
        }

        return implode("\n", $lines);
    }

    private function userRoles(string $message): string
    {
        $roles = $this->requestedRoles($message);
        $showInactive = $this->hasAny($message, ['nonaktif', 'tidak aktif', 'inactive']);
        $lines = ['**Data akun berdasarkan role sistem**'];

        foreach ($roles as $role => $label) {
            $users = User::role($role)
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'phone', 'is_active']);
            $activeUsers = $users->where('is_active', true)->values();
            $inactiveUsers = $users->where('is_active', false)->values();

            $lines[] = '';
            $lines[] = "**{$label}**";
            $lines[] = "- Akun aktif: **{$activeUsers->count()}**";
            $lines[] = "- Total akun role ini: {$users->count()}";

            if ($activeUsers->isEmpty()) {
                $lines[] = '- Nama aktif: belum ada akun aktif';
            } else {
                $lines[] = '- Nama akun aktif:';
                foreach ($activeUsers->take(30) as $account) {
                    $email = $account->email ? " ({$account->email})" : '';
                    $phone = $account->phone ? " - {$account->phone}" : '';
                    $lines[] = "  - **{$account->name}**{$email}{$phone}";
                }

                if ($activeUsers->count() > 30) {
                    $lines[] = '  - ...dan '.($activeUsers->count() - 30).' akun aktif lain';
                }
            }

            if ($showInactive && $inactiveUsers->isNotEmpty()) {
                $lines[] = '- Akun nonaktif:';
                foreach ($inactiveUsers->take(15) as $account) {
                    $email = $account->email ? " ({$account->email})" : '';
                    $lines[] = "  - {$account->name}{$email}";
                }
            }
        }

        $lines[] = '';
        $lines[] = 'Catatan: angka ini diambil dari **akun user + role**, bukan dari data gaji atau kelas.';

        return implode("\n", $lines);
    }

    private function attendance(): string
    {
        $today = now()->toDateString();
        $row = Attendance::whereDate('date', $today)
            ->selectRaw("SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) as hadir")
            ->selectRaw("SUM(CASE WHEN status = 'izin' THEN 1 ELSE 0 END) as izin")
            ->selectRaw("SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) as sakit")
            ->selectRaw("SUM(CASE WHEN status = 'alfa' THEN 1 ELSE 0 END) as alfa")
            ->first();

        return implode("\n", [
            "**Absensi hari ini (".$this->dateLabel($today).")**",
            "- Hadir: **".(int) ($row?->hadir ?? 0)."**",
            "- Izin: **".(int) ($row?->izin ?? 0)."**",
            "- Sakit: **".(int) ($row?->sakit ?? 0)."**",
            "- Alfa: **".(int) ($row?->alfa ?? 0)."**",
            '',
            'Untuk isi atau cek detail per anak, buka menu **Absensi**.',
        ]);
    }

    private function finance(string $topic, string $message = ''): string
    {
        $period = $this->financePeriod($message);
        $month = now()->month;
        $year = now()->year;
        $feeQuery = StudentFee::where('month', $month)->where('year', $year);
        $enrollmentRows = $this->enrollmentRows();
        $payrollRows = TeacherPayroll::with('teacher:id,name')->where('month', $month)->where('year', $year)->get();
        $financeEntries = FinanceEntry::whereMonth('entry_date', $month)->whereYear('entry_date', $year)->get();

        $sppPaid = (int) (clone $feeQuery)->sum('paid_amount');
        $sppTarget = (int) (clone $feeQuery)->sum('total_billed');
        $enrollmentPaid = (int) $enrollmentRows->sum('paid_amount');
        $enrollmentTarget = (int) $enrollmentRows->sum(fn (EnrollmentUpdate $row) => max((int) ($row->target_amount ?? 0), (int) $row->paid_amount));
        $payrollTotal = (int) $payrollRows->sum('total_amount');
        $payrollPaid = (int) $payrollRows->where('status', 'paid')->sum('total_amount');
        $manualIncome = (int) $financeEntries->where('type', 'income')->sum('amount');
        $manualExpense = (int) $financeEntries->where('type', 'expense')->sum('amount');
        $income = $sppPaid + $enrollmentPaid + $manualIncome;
        $expense = $payrollPaid + $manualExpense;
        $periodLedger = $this->financeLedger($period['start'], $period['end']);
        $periodIncome = (int) $periodLedger->where('type', 'income')->sum('amount');
        $periodExpense = (int) $periodLedger->where('type', 'expense')->sum('amount');
        $periodNet = $periodIncome - $periodExpense;
        $incomeRows = $periodLedger->where('type', 'income')->values();
        $expenseRows = $periodLedger->where('type', 'expense')->values();

        return match ($topic) {
            'spp' => implode("\n", [
                "**SPP bulan ini**",
                "- Terbayar: **{$this->rupiah($sppPaid)}**",
                "- Target tagihan: {$this->rupiah($sppTarget)}",
                "- Belum/kurang bayar: {$this->rupiah(max($sppTarget - $sppPaid, 0))}",
                '',
                'Detail per siswa ada di menu **Keuangan > SPP**.',
            ]),
            'payroll' => implode("\n", [
                "**Gaji guru bulan ini**",
                "- Total gaji tercatat: **{$this->rupiah($payrollTotal)}**",
                "- Sudah dibayar: {$this->rupiah($payrollPaid)}",
                "- Belum keluar: {$this->rupiah(max($payrollTotal - $payrollPaid, 0))}",
                "- Jumlah data gaji: {$payrollRows->count()}",
                '',
                $this->payrollNames($payrollRows),
            ]),
            default => implode("\n", [
                "**Ringkasan keuangan {$period['label']}**",
                "- Pemasukan {$period['label']}: **{$this->rupiah($periodIncome)}**",
                "- Pengeluaran {$period['label']}: **{$this->rupiah($periodExpense)}**",
                "- Saldo/net {$period['label']}: **{$this->rupiah($periodNet)}**",
                "- Periode data: {$period['start']->toDateString()} s/d {$period['end']->toDateString()}",
                '',
                "**Pemasukan tercatat**",
                $incomeRows->isEmpty() ? '- Belum ada pemasukan pada periode ini.' : $this->ledgerLines($incomeRows),
                '',
                "**Pengeluaran tercatat**",
                $expenseRows->isEmpty() ? '- Belum ada pengeluaran pada periode ini.' : $this->ledgerLines($expenseRows),
                '',
                "**Kontrol silang bulan ini**",
                "- Pemasukan bulan ini: {$this->rupiah($income)}",
                "- Pengeluaran bulan ini: {$this->rupiah($expense)}",
                "- Saldo bulan ini: {$this->rupiah($income - $expense)}",
                '',
                "**Catatan angka**",
                "- Pemasukan = semua uang masuk bruto pada periode itu.",
                "- Saldo/net = pemasukan dikurangi pengeluaran, bukan total pemasukan.",
                "- Sumber ledger: SPP, uang pendaftaran, kas manual, dan gaji dibayar.",
            ]),
        };
    }

    private function enrollment(): string
    {
        $rows = $this->enrollmentRows(false);
        $financialRows = $rows->whereIn('category', EnrollmentUpdate::FINANCIAL_CATEGORIES);
        $target = (int) $financialRows->sum(fn (EnrollmentUpdate $row) => max((int) ($row->target_amount ?? 0), (int) $row->paid_amount));
        $paid = (int) $financialRows->sum('paid_amount');
        $confirmed = $rows->whereIn('confirmation_status', ['confirmed', 'continuing', 'graduated'])->count();
        $pending = Registration::where('status', 'pending')->count();

        return implode("\n", [
            "**PPDB / Pendaftaran 2026/2027**",
            "- Total data update: **{$rows->count()}**",
            "- Terkonfirmasi/lanjut/lulus: {$confirmed}",
            "- PPDB pending: {$pending}",
            "- Pembayaran masuk: **{$this->rupiah($paid)}**",
            "- Target tercatat: {$this->rupiah($target)}",
            "- Sisa estimasi: {$this->rupiah(max($target - $paid, 0))}",
            '',
            'Update manual ada di **Keuangan > Uang Pendaftaran**.',
        ]);
    }

    private function agenda(): string
    {
        $today = now()->toDateString();
        $agendas = SchoolAgenda::where('start_date', '>=', $today)
            ->orderBy('start_date')
            ->limit(5)
            ->get(['title', 'start_date', 'location', 'type']);

        if ($agendas->isEmpty()) {
            return 'Belum ada agenda terdekat yang tercatat.';
        }

        $lines = ['**Agenda terdekat**'];
        foreach ($agendas as $index => $agenda) {
            $date = $agenda->start_date?->format('d/m/Y') ?? '-';
            $location = $agenda->location ? " - {$agenda->location}" : '';
            $lines[] = ($index + 1).". **{$agenda->title}** ({$date}){$location}";
        }

        return implode("\n", $lines);
    }

    private function announcements(): string
    {
        $items = Announcement::latest('id')->limit(5)->get(['title', 'published_at', 'is_urgent']);
        if ($items->isEmpty()) {
            return 'Belum ada pengumuman yang tercatat.';
        }

        $lines = ['**Pengumuman terbaru**'];
        foreach ($items as $index => $item) {
            $urgent = $item->is_urgent ? ' - penting' : '';
            $lines[] = ($index + 1).". **{$item->title}**{$urgent}";
        }

        return implode("\n", $lines);
    }

    private function learning(): string
    {
        $montessori = MontessoriArea::query()
            ->leftJoin('montessori_milestones', 'montessori_areas.id', '=', 'montessori_milestones.area_id')
            ->leftJoin('student_milestones', 'montessori_milestones.id', '=', 'student_milestones.milestone_id')
            ->selectRaw("SUM(CASE WHEN student_milestones.status = 'mastered' THEN 1 ELSE 0 END) as mastered")
            ->selectRaw('COUNT(student_milestones.id) as total')
            ->first();
        $hafalan = StudentHafalan::selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');

        return implode("\n", [
            "**Ringkasan pembelajaran**",
            "- Montessori mastered: **".(int) ($montessori?->mastered ?? 0)."** dari ".(int) ($montessori?->total ?? 0)." catatan",
            "- Hafalan lancar: ".(int) ($hafalan['lancar'] ?? 0),
            "- Hafalan mutqin: ".(int) ($hafalan['mutqin'] ?? 0),
            "- Sedang dihafal: ".(int) ($hafalan['sedang_dihafal'] ?? 0),
        ]);
    }

    private function childIdentity(Student $student): string
    {
        $name = $student->nickname ?? $student->full_name;

        return "Saya asisten AI Madani Nidham. Saya membantu Ayah/Bunda membaca data {$name} yang tersimpan di sistem, seperti absensi, jurnal, Montessori, hafalan, agenda, dan informasi sekolah. Saya hanya menjawab berdasarkan data sistem.";
    }

    private function managerIdentity(User $user): string
    {
        return "Saya asisten AI manajerial Madani Nidham. Saya membantu {$user->name} membaca ringkasan data sekolah dari sistem, termasuk murid, absensi, jurnal, Montessori, hafalan, PPDB, agenda, dan keuangan. Saya tidak mengambil data dari internet.";
    }

    private function childAttendance(Student $student): string
    {
        $name = $student->nickname ?? $student->full_name;
        $today = $student->attendances()->whereDate('date', now()->toDateString())->latest('id')->first();
        $month = $student->attendances()
            ->whereMonth('date', now()->month)
            ->whereYear('date', now()->year)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return implode("\n", [
            "**Absensi {$name}**",
            "- Hari ini: **".($today?->status ?? 'belum ada catatan')."**",
            "- Hadir bulan ini: ".(int) ($month['hadir'] ?? 0),
            "- Izin: ".(int) ($month['izin'] ?? 0),
            "- Sakit: ".(int) ($month['sakit'] ?? 0),
            "- Alfa: ".(int) ($month['alfa'] ?? 0),
        ]);
    }

    private function childJournal(Student $student): string
    {
        $name = $student->nickname ?? $student->full_name;
        $journal = $student->journals()->where('is_published', true)->latest('date')->latest('id')->first(['date', 'content', 'mood']);

        if (! $journal) {
            return "Belum ada jurnal published untuk {$name}.";
        }

        return "**Jurnal terakhir {$name}**\n".$this->dateLabel($journal->date)." - {$journal->content}\n\nMood: **".($journal->mood ?? '-').'**';
    }

    private function childMontessori(Student $student): string
    {
        $name = $student->nickname ?? $student->full_name;
        $rows = $student->studentMilestones()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');

        return implode("\n", [
            "**Perkembangan Montessori {$name}**",
            "- Mastered: ".(int) ($rows['mastered'] ?? 0),
            "- In progress: ".(int) ($rows['in_progress'] ?? 0),
            "- Introduced: ".(int) ($rows['introduced'] ?? 0),
            "- Belum mulai: ".(int) ($rows['not_started'] ?? 0),
        ]);
    }

    private function childHafalan(Student $student): string
    {
        $name = $student->nickname ?? $student->full_name;
        $hafalan = $student->hafalan()->with('surah:id,name_latin')->latest('updated_at')->limit(5)->get()
            ->map(fn (StudentHafalan $row) => ($row->surah?->name_latin ?? 'Surah').' - '.$row->status);
        $doa = $student->doaProgress()->with('doa:id,name')->latest('updated_at')->limit(5)->get()
            ->map(fn ($row) => ($row->doa?->name ?? 'Doa').' - '.$row->status);

        return implode("\n", [
            "**Hafalan {$name}**",
            $hafalan->isEmpty() ? 'Belum ada catatan hafalan.' : $hafalan->map(fn ($item) => "- {$item}")->implode("\n"),
            '',
            "**Doa**",
            $doa->isEmpty() ? 'Belum ada catatan doa.' : $doa->map(fn ($item) => "- {$item}")->implode("\n"),
        ]);
    }

    private function managerContext(string $intent): array
    {
        return match ($intent) {
            AiIntentRouter::STUDENT_LIST, AiIntentRouter::STUDENT_COUNT => [
                'murid' => [
                    'aktif' => Student::where('status', 'active')->count(),
                    'per_kelas' => $this->classCounts(),
                ],
            ],
            AiIntentRouter::ATTENDANCE => ['absensi' => ['hari_ini' => $this->attendance()]],
            AiIntentRouter::SPP, AiIntentRouter::PAYROLL, AiIntentRouter::ENROLLMENT, AiIntentRouter::FINANCE => ['keuangan' => $this->financeContext()],
            AiIntentRouter::AGENDA => ['agenda' => $this->agenda()],
            AiIntentRouter::ANNOUNCEMENT => ['pengumuman' => $this->announcements()],
            AiIntentRouter::LEARNING => ['pembelajaran' => $this->learning()],
            AiIntentRouter::USER_ROLES => ['akun_user' => $this->userRoles('')],
            default => ['ringkasan' => 'Data sistem tersedia untuk murid, absensi, jurnal, Montessori, hafalan, PPDB, agenda, pengumuman, dan keuangan.'],
        };
    }

    private function childContext(Student $student, string $intent): array
    {
        $student->loadMissing(['classes']);

        return [
            'profil' => [
                'nama' => $student->full_name,
                'panggilan' => $student->nickname,
                'kelas' => $student->active_class?->name,
            ],
            'ringkasan' => match ($intent) {
                AiIntentRouter::CHILD_ATTENDANCE => $this->childAttendance($student),
                AiIntentRouter::CHILD_JOURNAL => $this->childJournal($student),
                AiIntentRouter::CHILD_MONTESSORI => $this->childMontessori($student),
                AiIntentRouter::CHILD_HAFALAN => $this->childHafalan($student),
                default => 'Data anak tersedia untuk absensi, jurnal, Montessori, hafalan, dan agenda.',
            },
        ];
    }

    private function financeContext(): array
    {
        return [
            'overview' => $this->finance('overview', 'hari ini'),
            'bulan_ini' => $this->finance('overview', 'bulan ini'),
            'spp' => $this->finance('spp'),
            'gaji' => $this->finance('payroll'),
            'pendaftaran' => $this->enrollment(),
        ];
    }

    private function financePeriod(string $message): array
    {
        $text = Str::of($message)->lower()->squish()->value();

        if ($this->hasAny($text, ['7 hari', 'seminggu', 'minggu ini'])) {
            return [
                'label' => '7 hari terakhir',
                'start' => now()->subDays(6)->startOfDay(),
                'end' => now()->endOfDay(),
            ];
        }

        if ($this->hasAny($text, ['bulan ini', 'bulanan', 'bulan berjalan'])) {
            return [
                'label' => 'bulan ini ('.now()->locale('id')->translatedFormat('F Y').')',
                'start' => now()->startOfMonth(),
                'end' => now()->endOfDay(),
            ];
        }

        $asksToday = $this->hasAny($text, ['hari ini', 'today', 'sekarang']);
        $asksYesterday = $this->hasAny($text, ['kemarin', 'kemaren', 'yesterday']);
        $negatesToday = $this->isNegatedPeriod($text, 'hari ini|today|sekarang');
        $negatesYesterday = $this->isNegatedPeriod($text, 'kemarin|kemaren|yesterday');

        if ($asksToday && ! $negatesToday) {
            return [
                'label' => 'hari ini ('.$this->dateLabel(now()).')',
                'start' => now()->startOfDay(),
                'end' => now()->endOfDay(),
            ];
        }

        if ($asksYesterday && ! $negatesYesterday) {
            $day = now()->subDay();

            return [
                'label' => 'kemarin ('.$this->dateLabel($day).')',
                'start' => $day->copy()->startOfDay(),
                'end' => $day->copy()->endOfDay(),
            ];
        }

        return [
            'label' => 'hari ini ('.$this->dateLabel(now()).')',
            'start' => now()->startOfDay(),
            'end' => now()->endOfDay(),
        ];
    }

    private function financeLedger($start, $end)
    {
        $rows = collect();

        StudentFee::with(['student:id,full_name', 'feeType:id,name'])
            ->where('paid_amount', '>', 0)
            ->whereDate('updated_at', '>=', $start->toDateString())
            ->whereDate('updated_at', '<=', $end->toDateString())
            ->get()
            ->each(function (StudentFee $fee) use ($rows) {
                $rows->push([
                    'date' => $fee->updated_at,
                    'type' => 'income',
                    'source' => 'SPP',
                    'title' => trim(($fee->feeType?->name ?? 'SPP').' - '.($fee->student?->full_name ?? 'Murid')),
                    'amount' => (int) $fee->paid_amount,
                ]);
            });

        $this->enrollmentRows()
            ->where('paid_amount', '>', 0)
            ->filter(fn (EnrollmentUpdate $row) => $row->updated_at && $row->updated_at->betweenIncluded($start, $end))
            ->each(function (EnrollmentUpdate $row) use ($rows) {
                $rows->push([
                    'date' => $row->updated_at,
                    'type' => 'income',
                    'source' => 'Uang Pendaftaran',
                    'title' => $row->full_name,
                    'amount' => (int) $row->paid_amount,
                ]);
            });

        FinanceEntry::whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->get()
            ->each(function (FinanceEntry $entry) use ($rows) {
                $rows->push([
                    'date' => $entry->entry_date,
                    'type' => $entry->type,
                    'source' => $entry->category,
                    'title' => $entry->title,
                    'amount' => (int) $entry->amount,
                ]);
            });

        TeacherPayroll::with('teacher:id,name')
            ->where('status', 'paid')
            ->whereDate('paid_at', '>=', $start->toDateString())
            ->whereDate('paid_at', '<=', $end->toDateString())
            ->get()
            ->each(function (TeacherPayroll $payroll) use ($rows) {
                $rows->push([
                    'date' => $payroll->paid_at,
                    'type' => 'expense',
                    'source' => 'Gaji Guru',
                    'title' => $payroll->teacher?->name ?? 'Guru',
                    'amount' => (int) $payroll->total_amount,
                ]);
            });

        return $rows->sortByDesc(fn (array $row) => (string) $row['date'])->values();
    }

    private function ledgerLines($rows): string
    {
        return $rows
            ->take(8)
            ->map(fn (array $row) => '- '.$this->dateLabel($row['date']).' - '.$row['source'].' - '.$row['title'].': **'.$this->rupiah((int) $row['amount']).'**')
            ->implode("\n");
    }

    private function isNegatedPeriod(string $text, string $periodPattern): bool
    {
        $negation = 'bukan|jangan|ga|gak|nggak|enggak|bkn';

        return (bool) preg_match('/\b('.$negation.')\b.{0,32}\b('.$periodPattern.')\b/u', $text);
    }

    private function classCounts(): array
    {
        return SchoolClass::query()
            ->leftJoin('student_classes', function ($join) {
                $join->on('classes.id', '=', 'student_classes.class_id')
                    ->where('student_classes.status', '=', 'active');
            })
            ->select('classes.name', 'classes.level')
            ->selectRaw('COUNT(student_classes.student_id) as students_count')
            ->groupBy('classes.id', 'classes.name', 'classes.level')
            ->orderBy('classes.level')
            ->get()
            ->map(fn ($class) => ['kelas' => $class->name, 'level' => $class->level, 'murid' => (int) $class->students_count])
            ->all();
    }

    private function enrollmentRows(bool $financialOnly = true)
    {
        $enrollmentYear = AcademicYear::where('name', '2026/2027')->first()
            ?? AcademicYear::where('is_active', true)->first()
            ?? AcademicYear::latest('id')->first();

        return EnrollmentUpdate::query()
            ->when($financialOnly, fn ($query) => $query->whereIn('category', EnrollmentUpdate::FINANCIAL_CATEGORIES))
            ->when($enrollmentYear, fn ($query) => $query->where('academic_year_id', $enrollmentYear->id))
            ->get();
    }

    private function payrollNames($payrollRows): string
    {
        if ($payrollRows->isEmpty()) {
            return 'Belum ada data gaji guru untuk periode ini.';
        }

        return "**Data guru tercatat**\n".$payrollRows->take(8)->map(fn (TeacherPayroll $row) => '- '.($row->teacher?->name ?? 'Guru').' - '.$this->rupiah($row->total_amount).' ('.$row->status.')')->implode("\n");
    }

    private function requestedRoles(string $message): array
    {
        $text = Str::of($message)->lower()->squish()->value();
        $roles = [];

        if ($this->hasAny($text, ['super admin', 'superadmin'])) {
            $roles['super_admin'] = 'Super Admin';
        }

        if ($this->hasAny($text, ['kepala sekolah', 'kepsek'])) {
            $roles['kepala_sekolah'] = 'Kepala Sekolah';
        }

        if ($this->hasAny($text, ['admin', 'staf', 'staff'])) {
            $roles['admin'] = 'Admin';
        }

        if ($this->hasAny($text, ['guru', 'teacher', 'ustadzah', 'ustadz'])) {
            $roles['guru'] = 'Guru';
        }

        if ($this->hasAny($text, ['orang tua', 'ortu', 'wali murid', 'parent'])) {
            $roles['orang_tua'] = 'Orang Tua';
        }

        if ($roles !== []) {
            return $roles;
        }

        return [
            'super_admin' => 'Super Admin',
            'kepala_sekolah' => 'Kepala Sekolah',
            'admin' => 'Admin',
            'guru' => 'Guru',
            'orang_tua' => 'Orang Tua',
        ];
    }

    private function hasAny(string $text, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($text, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function classOrder(string $className): int
    {
        return match ($className) {
            'KB' => 1,
            'TK A' => 2,
            'TK B' => 3,
            'TK C' => 4,
            default => 99,
        };
    }

    private function rupiah(int $amount): string
    {
        return 'Rp'.number_format($amount, 0, ',', '.');
    }

    private function dateLabel($value): string
    {
        if (! $value) {
            return '-';
        }

        return \Carbon\Carbon::parse($value)->locale('id')->translatedFormat('d F Y');
    }
}
