<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\AiChatHistory;
use App\Models\AiManagerChatHistory;
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
use App\Services\Ai\AiDataAnswerService;
use App\Services\Ai\AiIntentRouter;
use App\Services\Ai\AiProvider;
use App\Services\Ai\GeminiProvider;
use App\Services\Ai\GroqProvider;
use App\Support\ApiResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class GeminiService
{
    public function __construct(
        private AiQuotaService $quota,
        private AiIntentRouter $intentRouter,
        private AiDataAnswerService $dataAnswers,
        private GeminiProvider $geminiProvider,
        private GroqProvider $groqProvider,
    ) {}

    public function chat(User $user, Student $student, string $userMessage): array
    {
        return $this->chatChild($user, $student, $userMessage);
    }

    public function chatChild(User $user, Student $student, string $userMessage): array
    {
        $history = AiChatHistory::where('user_id', $user->id)
            ->where('student_id', $student->id)
            ->latest()
            ->take(6)
            ->get()
            ->reverse();

        return $this->respond(
            $user,
            $userMessage,
            $history,
            fn (string $reply, int $tokens) => $this->saveChildHistory($user, $student, $userMessage, $reply, $tokens),
            $student,
        );
    }

    public function chatManager(User $user, string $userMessage): array
    {
        $history = AiManagerChatHistory::where('user_id', $user->id)
            ->latest()
            ->take(6)
            ->get()
            ->reverse();

        return $this->respond(
            $user,
            $userMessage,
            $history,
            fn (string $reply, int $tokens) => $this->saveManagerHistory($user, $userMessage, $reply, $tokens),
        );
    }

    private function respond(User $user, string $userMessage, $history, callable $save, ?Student $student = null): array
    {
        $studentRoom = $student !== null;
        $intent = $this->intentRouter->detect($userMessage, $studentRoom);
        $answerMessage = $userMessage;

        if (in_array($intent, [AiIntentRouter::AI, AiIntentRouter::UNCLEAR], true) && $this->isFollowUpPrompt($userMessage)) {
            foreach ($history->reverse() as $item) {
                if ($item->role !== 'user') {
                    continue;
                }

                $previousIntent = $this->intentRouter->detect($item->message, $studentRoom);
                if (! in_array($previousIntent, [AiIntentRouter::AI, AiIntentRouter::UNCLEAR, AiIntentRouter::OUT_OF_SCOPE, AiIntentRouter::IDENTITY], true)) {
                    $intent = $previousIntent;
                    $answerMessage = $item->message;
                    break;
                }
            }
        }

        $localReply = $this->dataAnswers->answer($intent, $user, $student, $answerMessage);

        if ($localReply !== null) {
            return $this->finishLocalReply($user, $userMessage, $localReply, $save, $intent, $studentRoom, $student);
        }

        $messages = $history->map(fn ($item) => [
            'role' => $item->role === 'model' ? 'assistant' : 'user',
            'content' => $item->message,
        ])->values()->all();
        $messages[] = ['role' => 'user', 'content' => $userMessage];
        $context = $this->dataAnswers->contextFor($intent, $user, $student);
        $systemPrompt = $this->buildProviderPrompt($studentRoom, $student, $context);
        $estimatedTokens = $this->quota->estimateTokens($systemPrompt.json_encode($messages, JSON_UNESCAPED_UNICODE));
        $this->quota->assertCanSend($user, $estimatedTokens);

        foreach ([$this->groqProvider, $this->geminiProvider] as $provider) {
            $result = $this->tryProvider($provider, $systemPrompt, $messages);
            if (! $result) {
                continue;
            }

            $tokens = $result->tokensUsed > 0
                ? $result->tokensUsed
                : $this->quota->estimateTokens($systemPrompt.$userMessage.$result->text);
            $save($result->text, $tokens);
            $this->quota->record($user, $tokens);

            return [
                'reply' => $result->text,
                'source' => $provider->name(),
                'source_label' => $provider->label(),
            ];
        }

        $safeReply = 'AI eksternal sedang tidak stabil. Untuk pertanyaan data sekolah, coba tanyakan lebih spesifik seperti **daftar murid aktif**, **absensi hari ini**, **gaji guru**, atau **PPDB 2026/2027**.';
        $save($safeReply, 0);

        return [
            'reply' => $safeReply,
            'source' => 'safe',
            'source_label' => 'Jawaban aman sistem',
        ];
    }

    private function tryProvider(AiProvider $provider, string $systemPrompt, array $messages, array $options = [])
    {
        if (! $provider->isConfigured()) {
            return null;
        }

        try {
            return $provider->generate($systemPrompt, $messages, [
                'connect_timeout' => $options['connect_timeout'] ?? ($provider instanceof GroqProvider ? 2.0 : 1.0),
                'timeout' => $options['timeout'] ?? ($provider instanceof GeminiProvider ? 2.2 : 2.4),
                'max_tokens' => $options['max_tokens'] ?? 700,
                'temperature' => $options['temperature'] ?? 0.25,
            ]);
        } catch (Throwable $error) {
            Log::warning('AI provider failed', [
                'provider' => $provider->name(),
                'message' => $error->getMessage(),
            ]);

            return null;
        }
    }

    private function finishLocalReply(User $user, string $userMessage, string $reply, callable $save, string $intent, bool $studentRoom, ?Student $student): array
    {
        $finalReply = $reply;
        $source = 'local';
        $sourceLabel = 'Dijawab dari data sistem';
        $tokens = $this->quota->estimateTokens($userMessage.$reply);

        if ($this->shouldPolishLocalReply($intent, $reply)) {
            $polishPrompt = $this->buildLocalPolishPrompt($studentRoom, $student, $user, $userMessage, $reply);
            $this->quota->assertCanSend($user, $this->quota->estimateTokens($polishPrompt.$userMessage.$reply));

            foreach ([$this->groqProvider, $this->geminiProvider] as $provider) {
                $result = $this->tryProvider($provider, $polishPrompt, [
                    ['role' => 'user', 'content' => "Pertanyaan user:\n{$userMessage}\n\nData jawaban sistem:\n{$reply}"],
                ], [
                    'connect_timeout' => $provider instanceof GroqProvider ? 2.0 : 1.0,
                    'timeout' => $provider instanceof GroqProvider ? 2.4 : 2.0,
                    'max_tokens' => 650,
                    'temperature' => 0.35,
                ]);

                if (! $result) {
                    continue;
                }

                $finalReply = $result->text;
                $tokens = $result->tokensUsed > 0
                    ? $result->tokensUsed
                    : $this->quota->estimateTokens($polishPrompt.$userMessage.$reply.$finalReply);
                $source = $provider->name() === 'groq' ? 'local_groq' : 'local_gemini';
                $sourceLabel = $provider->name() === 'groq'
                    ? 'Data sistem, dipoles Groq'
                    : 'Data sistem, dipoles Gemini';
                break;
            }
        } else {
            $this->quota->assertCanSend($user, $tokens);
        }

        $save($finalReply, $tokens);
        $this->quota->record($user, $tokens);

        return [
            'reply' => $finalReply,
            'source' => $source,
            'source_label' => $sourceLabel,
        ];
    }

    private function shouldPolishLocalReply(string $intent, string $reply): bool
    {
        $lowerReply = Str::of($reply)->lower()->squish()->value();
        if (str_contains($lowerReply, 'belum ada') || str_contains($lowerReply, 'tidak tersedia')) {
            return false;
        }

        return ! in_array($intent, [
            AiIntentRouter::UNCLEAR,
            AiIntentRouter::OUT_OF_SCOPE,
            AiIntentRouter::USER_ROLES,
            AiIntentRouter::FINANCE,
            AiIntentRouter::SPP,
            AiIntentRouter::PAYROLL,
            AiIntentRouter::ENROLLMENT,
        ], true);
    }

    private function isFollowUpPrompt(string $message): bool
    {
        $text = Str::of($message)->lower()->squish()->value();

        return (bool) preg_match('/^(yang bener|yg bener|beneran|masa|kok beda|mana yang bener|jadi yang benar|terus|lanjut|jelasin lagi|maksudnya|siapa aja|siapa saja|namanya siapa|siapa namanya|listnya|daftarnya|rinciannya)\\??$/u', $text);
    }

    private function buildLocalPolishPrompt(bool $studentRoom, ?Student $student, User $user, string $userMessage, string $reply): string
    {
        $audience = $studentRoom
            ? 'orang tua murid '.($student?->nickname ?? $student?->full_name ?? 'ini')
            : $user->name.' sebagai admin manajerial';
        $styleSeed = random_int(1, 9999);
        $today = now()->locale('id')->translatedFormat('l, d F Y H:i');

        return <<<PROMPT
Kamu admin manusia di Madani Nidham yang sedang membalas chat {$audience}.

TUGAS:
Tulis ulang DATA JAWABAN SISTEM supaya terasa natural, interaktif, dan enak dibaca di bubble chat.

ATURAN KETAT:
1. Jangan tambah fakta, angka, nama, status, tanggal, atau menu yang tidak ada di DATA JAWABAN SISTEM.
2. Jangan ubah angka dan nama. Pertahankan semua nilai penting.
3. Jika DATA JAWABAN SISTEM punya format "Label: angka/status", salin label dan angka/status itu eksplisit. Contoh: "Hadir: 0" harus tetap "Hadir: **0**", jangan diparafrase jadi makna lain.
4. Jangan jawab dari internet.
5. Jangan pakai kalimat pembuka template yang sama berulang.
6. Boleh beri kalimat lanjutan ringan seperti "Mau saya rincikan per kelas?" jika relevan.
7. Gunakan Markdown rapi: **judul pendek**, bullet, numbering, line break, dan penekanan **bold** pada angka penting.
8. Maksimal 6 bullet atau 3 paragraf pendek.
9. Kalau data kosong, sampaikan jelas tanpa mengarang.

Tanggal sistem: {$today}
Variasi gaya: {$styleSeed}
PROMPT;
    }

    private function buildProviderPrompt(bool $studentRoom, ?Student $student, array $context): string
    {
        $json = json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $audience = $studentRoom
            ? 'orang tua murid bernama '.($student?->nickname ?? $student?->full_name ?? 'anak')
            : 'super admin, kepala sekolah, dan admin';

        return <<<PROMPT
Kamu adalah asisten AI internal TKIT Madani Montessori untuk {$audience}.

ATURAN:
1. Jawab HANYA berdasarkan DATA SISTEM. Jangan mengarang dan jangan mengambil data internet.
2. Jika data tidak ada, katakan data belum tersedia dan arahkan ke menu terkait.
3. Jawab padat, jelas, maksimal 5 bullet atau 3 paragraf pendek.
4. Gunakan Markdown sederhana: **bold**, bullet, numbering, dan line break.
5. Jika pertanyaan di luar data sistem sekolah, jawab persis: "Kamu gabisa jawab itu dan silahkan jawab yang lain."
6. Jika user bertanya pendek seperti "terus?", "lanjut", atau "jelasin lagi", pakai riwayat chat terakhir sebagai konteks. Jika konteks belum cukup, tanya balik dengan pilihan topik yang jelas.
7. Gaya seperti admin sekolah yang cek data: natural, ringkas, tidak kaku, tidak mengulang template yang sama.

DATA SISTEM:
{$json}
PROMPT;
    }

    private function fastReply(User $user, string $message, ?Student $student): ?string
    {
        $text = Str::of($message)->lower()->squish()->value();
        $simpleGreeting = preg_match('/^(halo|hai|hi|assalam|assalamu|test|tes)\b/u', $text);
        $identity = str_contains($text, 'ini siapa') || str_contains($text, 'kamu siapa') || str_contains($text, 'siapa kamu') || str_contains($text, 'ai siapa');

        if (! $simpleGreeting && ! $identity && $this->isOutOfSystemScope($text)) {
            return 'Kamu gabisa jawab itu dan silahkan jawab yang lain.';
        }

        if (! $simpleGreeting && ! $identity) {
            return null;
        }

        if ($student) {
            $nama = $student->nickname ?? $student->full_name;

            return "Saya asisten AI Madani Nidham. Saya membantu Ayah/Bunda membaca data {$nama} yang tersimpan di sistem, seperti absensi, jurnal, Montessori, hafalan, agenda, dan informasi sekolah. Saya hanya menjawab berdasarkan data sistem.";
        }

        return "Saya asisten AI manajerial Madani Nidham. Saya membantu {$user->name} membaca ringkasan data sekolah dari sistem, termasuk murid, absensi, jurnal, Montessori, hafalan, PPDB, agenda, dan keuangan. Saya tidak mengambil data dari internet.";
    }

    private function isOutOfSystemScope(string $text): bool
    {
        if ($text === '') {
            return false;
        }

        $systemTerms = [
            'madani',
            'sekolah',
            'murid',
            'siswa',
            'anak',
            'kelas',
            'kb',
            'tk',
            'absensi',
            'hadir',
            'izin',
            'sakit',
            'alfa',
            'jurnal',
            'montessori',
            'milestone',
            'hafalan',
            'doa',
            'surah',
            'ppdb',
            'pendaftaran',
            'uang',
            'keuangan',
            'spp',
            'tagihan',
            'gaji',
            'guru',
            'operasional',
            'kas',
            'agenda',
            'pengumuman',
            'galeri',
            'parenting',
            'raport',
            'laporan',
            'orang tua',
            'ayah',
            'bunda',
        ];

        if ($this->hasAny($text, $systemTerms)) {
            return false;
        }

        return $this->hasAny($text, [
            'presiden',
            'amerika',
            'indonesia',
            'pemilu',
            'politik',
            'berita',
            'cuaca',
            'resep',
            'masak',
            'sepak bola',
            'bola',
            'film',
            'artis',
            'saham',
            'crypto',
            'bitcoin',
            'coding',
            'programming',
            'javascript',
            'php',
            'laravel',
            'nextjs',
            'internet',
            'google',
            'youtube',
        ]);
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

    private function fastManagerStudentCountReply(): string
    {
        $total = Student::where('status', 'active')->count();
        $classes = SchoolClass::query()
            ->leftJoin('student_classes', function ($join) {
                $join->on('classes.id', '=', 'student_classes.class_id')
                    ->where('student_classes.status', '=', 'active');
            })
            ->select('classes.name')
            ->selectRaw('COUNT(student_classes.student_id) as students_count')
            ->groupBy('classes.id', 'classes.name', 'classes.level')
            ->orderBy('classes.level')
            ->get()
            ->map(fn ($class) => "{$class->name}: {$class->students_count}")
            ->implode(', ');

        return "Murid aktif saat ini {$total}. Sebaran kelas: {$classes}.";
    }

    private function fastManagerStudentListReply(): string
    {
        $students = Student::with('classes:id,name,level')
            ->where('status', 'active')
            ->orderBy('full_name')
            ->get(['id', 'nis', 'full_name', 'nickname'])
            ->groupBy(fn (Student $student) => $student->active_class?->name ?? 'Belum ada kelas')
            ->sortKeysUsing(fn (string $a, string $b) => $this->classOrder($a) <=> $this->classOrder($b));

        $lines = ["Berikut daftar **{$students->flatten(1)->count()} murid aktif** berdasarkan kelas:"];

        foreach ($students as $className => $classStudents) {
            $lines[] = "";
            $lines[] = "**Kelas {$className} ({$classStudents->count()} murid)**";
            foreach ($classStudents->values() as $index => $student) {
                $nickname = $student->nickname && $student->nickname !== $student->full_name ? " ({$student->nickname})" : '';
                $nis = $student->nis ? " - {$student->nis}" : '';
                $lines[] = ($index + 1).". **{$student->full_name}**{$nickname}{$nis}";
            }
        }

        return implode("\n", $lines);
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

    private function fastManagerAttendanceReply(): string
    {
        $row = Attendance::whereDate('date', now()->toDateString())
            ->selectRaw("sum(case when status = 'hadir' then 1 else 0 end) as hadir")
            ->selectRaw("sum(case when status in ('izin', 'sakit', 'alfa') then 1 else 0 end) as tidak_hadir")
            ->first();

        return 'Absensi hari ini: '.(int) ($row?->hadir ?? 0).' hadir dan '.(int) ($row?->tidak_hadir ?? 0).' tidak hadir.';
    }

    private function fastManagerFinanceReply(string $topic = 'overview'): string
    {
        $month = now()->month;
        $year = now()->year;
        $feeQuery = StudentFee::where('month', $month)->where('year', $year);
        $enrollmentYear = AcademicYear::where('name', '2026/2027')->first()
            ?? AcademicYear::where('is_active', true)->first()
            ?? AcademicYear::latest('id')->first();
        $enrollmentRows = EnrollmentUpdate::query()
            ->whereIn('category', EnrollmentUpdate::FINANCIAL_CATEGORIES)
            ->when($enrollmentYear, fn ($query) => $query->where('academic_year_id', $enrollmentYear->id))
            ->get();
        $payrollRows = TeacherPayroll::where('month', $month)->where('year', $year)->get();
        $financeEntries = FinanceEntry::whereMonth('entry_date', $month)->whereYear('entry_date', $year)->get();

        $sppPaid = (int) (clone $feeQuery)->sum('paid_amount');
        $sppTarget = (int) (clone $feeQuery)->sum('total_billed');
        $enrollmentPaid = (int) $enrollmentRows->sum('paid_amount');
        $payrollPaid = (int) $payrollRows->where('status', 'paid')->sum('total_amount');
        $manualIncome = (int) $financeEntries->where('type', 'income')->sum('amount');
        $manualExpense = (int) $financeEntries->where('type', 'expense')->sum('amount');
        $income = $sppPaid + $enrollmentPaid + $manualIncome;
        $expense = $payrollPaid + $manualExpense;
        $outstandingSpp = max($sppTarget - $sppPaid, 0);
        $enrollmentTarget = (int) $enrollmentRows->sum(fn (EnrollmentUpdate $row) => max((int) ($row->target_amount ?? 0), (int) $row->paid_amount));
        $enrollmentOutstanding = max($enrollmentTarget - $enrollmentPaid, 0);
        $payrollTotal = (int) $payrollRows->sum('total_amount');
        $payrollOutstanding = max($payrollTotal - $payrollPaid, 0);

        return match ($topic) {
            'spp' => implode("\n", [
                "**SPP bulan ini**",
                "- Terbayar: **{$this->rupiah($sppPaid)}**",
                "- Target tagihan: {$this->rupiah($sppTarget)}",
                "- Belum tertagih/kurang bayar: {$this->rupiah($outstandingSpp)}",
                "",
                "Cek menu **Keuangan > SPP** untuk rincian per siswa.",
            ]),
            'pendaftaran' => implode("\n", [
                "**Uang pendaftaran 2026/2027**",
                "- Masuk: **{$this->rupiah($enrollmentPaid)}**",
                "- Target tercatat: {$this->rupiah($enrollmentTarget)}",
                "- Sisa estimasi: {$this->rupiah($enrollmentOutstanding)}",
                "- Jumlah data: {$enrollmentRows->count()} calon/siswa",
                "",
                "Cek menu **Keuangan > Uang Pendaftaran** untuk update manual.",
            ]),
            'gaji' => implode("\n", [
                "**Gaji guru bulan ini**",
                "- Total gaji tercatat: **{$this->rupiah($payrollTotal)}**",
                "- Sudah dibayar: {$this->rupiah($payrollPaid)}",
                "- Belum keluar: {$this->rupiah($payrollOutstanding)}",
                "- Jumlah data gaji: {$payrollRows->count()}",
                "",
                "Cek menu **Keuangan > Gaji Guru** untuk status draft, disetujui, dan dibayar.",
            ]),
            'operasional' => implode("\n", [
                "**Operasional bulan ini**",
                "- Pemasukan manual: **{$this->rupiah($manualIncome)}**",
                "- Pengeluaran manual: {$this->rupiah($manualExpense)}",
                "- Selisih operasional: {$this->rupiah($manualIncome - $manualExpense)}",
                "",
                "Catatan kas manual masuk ke laporan **Pusat Keuangan**.",
            ]),
            default => implode("\n", [
                "**Ringkasan keuangan bulan ini**",
                "- Uang masuk: **{$this->rupiah($income)}**",
                "- Uang keluar: {$this->rupiah($expense)}",
                "- Estimasi saldo: {$this->rupiah($income - $expense)}",
                "",
                "**Komponen utama**",
                "- SPP terbayar: {$this->rupiah($sppPaid)} dari {$this->rupiah($sppTarget)}",
                "- Uang pendaftaran masuk: {$this->rupiah($enrollmentPaid)}",
                "- Gaji guru terbayar: {$this->rupiah($payrollPaid)}",
                "- Operasional keluar: {$this->rupiah($manualExpense)}",
                "",
                "Untuk rincian, tanya spesifik: **SPP**, **uang pendaftaran**, **gaji**, atau **operasional**.",
            ]),
        };
    }

    private function fastManagerEnrollmentReply(): string
    {
        $enrollmentYear = AcademicYear::where('name', '2026/2027')->first()
            ?? AcademicYear::where('is_active', true)->first()
            ?? AcademicYear::latest('id')->first();
        $rows = EnrollmentUpdate::query()
            ->when($enrollmentYear, fn ($query) => $query->where('academic_year_id', $enrollmentYear->id))
            ->get();
        $financialRows = $rows->whereIn('category', EnrollmentUpdate::FINANCIAL_CATEGORIES);
        $target = (int) $financialRows->sum(fn (EnrollmentUpdate $row) => max((int) ($row->target_amount ?? 0), (int) $row->paid_amount));
        $paid = (int) $financialRows->sum('paid_amount');
        $confirmed = $rows->where('confirmation_status', 'confirmed')->count();
        $pending = Registration::where('status', 'pending')->count();

        return 'Update pendaftaran 2026/2027: '.$rows->count().' data, '.$confirmed.' terkonfirmasi, PPDB pending '.$pending.'. Pembayaran masuk '.$this->rupiah($paid).' dari target '.$this->rupiah($target).'.';
    }

    private function fastManagerCommunicationReply(): string
    {
        $today = now()->toDateString();
        $agendas = SchoolAgenda::where('start_date', '>=', $today)
            ->orderBy('start_date')
            ->limit(3)
            ->get(['title', 'start_date', 'location'])
            ->map(fn (SchoolAgenda $agenda) => $agenda->title.' ('.$agenda->start_date?->format('d/m').($agenda->location ? ', '.$agenda->location : '').')')
            ->implode('; ');
        $announcements = Announcement::latest('id')
            ->limit(3)
            ->get(['title'])
            ->pluck('title')
            ->implode('; ');

        return 'Agenda terdekat: '.($agendas ?: 'belum ada agenda terdekat').'. Pengumuman terbaru: '.($announcements ?: 'belum ada pengumuman').'.';
    }

    private function fastManagerLearningReply(): string
    {
        $montessori = MontessoriArea::query()
            ->leftJoin('montessori_milestones', 'montessori_areas.id', '=', 'montessori_milestones.area_id')
            ->leftJoin('student_milestones', 'montessori_milestones.id', '=', 'student_milestones.milestone_id')
            ->selectRaw("SUM(CASE WHEN student_milestones.status = 'mastered' THEN 1 ELSE 0 END) as mastered")
            ->selectRaw('COUNT(student_milestones.id) as total')
            ->first();
        $hafalan = StudentHafalan::selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return 'Ringkasan pembelajaran: Montessori mastered '.(int) ($montessori?->mastered ?? 0).' dari '.(int) ($montessori?->total ?? 0).' catatan. Hafalan: lancar '.(int) ($hafalan['lancar'] ?? 0).', mutqin '.(int) ($hafalan['mutqin'] ?? 0).', sedang dihafal '.(int) ($hafalan['sedang_dihafal'] ?? 0).'.';
    }

    private function fastChildAttendanceReply(Student $student): string
    {
        $name = $student->nickname ?? $student->full_name;
        $today = $student->attendances()->whereDate('date', now()->toDateString())->latest('id')->first();
        $month = $student->attendances()
            ->whereMonth('date', now()->month)
            ->whereYear('date', now()->year)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return 'Absensi '.$name.' hari ini: '.($today?->status ?? 'belum ada catatan').'. Bulan ini: hadir '.(int) ($month['hadir'] ?? 0).', izin '.(int) ($month['izin'] ?? 0).', sakit '.(int) ($month['sakit'] ?? 0).', alfa '.(int) ($month['alfa'] ?? 0).'.';
    }

    private function fastChildJournalReply(Student $student): string
    {
        $name = $student->nickname ?? $student->full_name;
        $journal = $student->journals()
            ->where('is_published', true)
            ->latest('date')
            ->latest('id')
            ->first(['date', 'content', 'mood']);

        if (! $journal) {
            return "Belum ada jurnal published untuk {$name}.";
        }

        return 'Jurnal terakhir '.$name.' tanggal '.$journal->date?->format('d/m/Y').': '.$journal->content.' Mood: '.($journal->mood ?? '-').'.';
    }

    private function fastChildMontessoriReply(Student $student): string
    {
        $name = $student->nickname ?? $student->full_name;
        $rows = $student->studentMilestones()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return 'Perkembangan Montessori '.$name.': mastered '.(int) ($rows['mastered'] ?? 0).', in progress '.(int) ($rows['in_progress'] ?? 0).', introduced '.(int) ($rows['introduced'] ?? 0).', belum mulai '.(int) ($rows['not_started'] ?? 0).'.';
    }

    private function fastChildHafalanReply(Student $student): string
    {
        $name = $student->nickname ?? $student->full_name;
        $hafalan = $student->hafalan()
            ->with('surah:id,name_latin')
            ->latest('updated_at')
            ->limit(5)
            ->get()
            ->map(fn (StudentHafalan $row) => ($row->surah?->name_latin ?? 'Surah').' - '.$row->status)
            ->implode('; ');
        $doa = $student->doaProgress()
            ->with('doa:id,name')
            ->latest('updated_at')
            ->limit(5)
            ->get()
            ->map(fn ($row) => ($row->doa?->name ?? 'Doa').' - '.$row->status)
            ->implode('; ');

        return 'Hafalan '.$name.': '.($hafalan ?: 'belum ada catatan hafalan').'. Doa: '.($doa ?: 'belum ada catatan doa').'.';
    }

    private function rupiah(int $amount): string
    {
        return 'Rp'.number_format($amount, 0, ',', '.');
    }

    private function saveChildHistory(User $user, Student $student, string $message, string $reply, int $tokens): void
    {
        AiChatHistory::insert([
            ['user_id' => $user->id, 'student_id' => $student->id, 'role' => 'user', 'message' => $message, 'tokens_used' => null, 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => $user->id, 'student_id' => $student->id, 'role' => 'model', 'message' => $reply, 'tokens_used' => $tokens, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    private function saveManagerHistory(User $user, string $message, string $reply, int $tokens): void
    {
        AiManagerChatHistory::insert([
            ['user_id' => $user->id, 'role' => 'user', 'message' => $message, 'tokens_used' => null, 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => $user->id, 'role' => 'model', 'message' => $reply, 'tokens_used' => $tokens, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    private function buildChildContext(Student $student): array
    {
        $student->loadMissing(['classes', 'parents']);
        $today = now()->toDateString();
        $weekStart = now()->startOfWeek()->toDateString();
        $weekEnd = now()->endOfWeek()->toDateString();
        $activeClass = $student->active_class;

        return [
            'profil' => [
                'nama_lengkap' => $student->full_name,
                'nama_panggilan' => $student->nickname ?? $student->full_name,
                'usia' => $student->birth_date?->diffInYears(now()).' tahun',
                'kelas' => $activeClass?->name,
                'level' => $activeClass?->level,
            ],
            'jurnal_hari_ini' => optional(
                $student->journals()->whereDate('date', $today)->where('is_published', true)->latest('id')->first()
            )?->only(['content', 'mood', 'activities']),
            'jurnal_minggu_ini' => $student->journals()
                ->whereBetween('date', [$weekStart, $weekEnd])
                ->where('is_published', true)
                ->latest('date')
                ->limit(5)
                ->get(['date', 'content', 'mood'])
                ->toArray(),
            'kehadiran_bulan_ini' => $student->attendances()
                ->whereMonth('date', now()->month)
                ->whereYear('date', now()->year)
                ->selectRaw('status, COUNT(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status'),
            'milestone_ringkasan' => $student->studentMilestones()
                ->with('milestone.area')
                ->get()
                ->groupBy('milestone.area.name')
                ->map(fn ($group) => [
                    'total' => $group->count(),
                    'mastered' => $group->where('status', 'mastered')->count(),
                    'in_progress' => $group->where('status', 'in_progress')->count(),
                ]),
            'hafalan_status' => $student->hafalan()
                ->whereIn('status', ['lancar', 'mutqin', 'sedang_dihafal'])
                ->with('surah:id,name_latin')
                ->limit(20)
                ->get(['status', 'surah_id'])
                ->groupBy('status')
                ->map(fn ($group) => $group->pluck('surah.name_latin')),
            'agenda_minggu_ini' => SchoolAgenda::whereBetween('start_date', [$weekStart, $weekEnd])
                ->orderBy('start_date')
                ->limit(5)
                ->get(['title', 'start_date', 'type', 'location'])
                ->toArray(),
        ];
    }

    private function buildManagerContext(): array
    {
        $today = now()->toDateString();
        $month = now()->month;
        $year = now()->year;
        $activeStudents = Student::with('classes:id,name,level')
            ->where('status', 'active')
            ->orderBy('full_name')
            ->get(['id', 'nis', 'full_name', 'nickname', 'status']);
        $attendanceToday = Attendance::whereDate('date', $today)
            ->selectRaw("sum(case when status = 'hadir' then 1 else 0 end) as hadir")
            ->selectRaw("sum(case when status in ('izin', 'sakit', 'alfa') then 1 else 0 end) as tidak_hadir")
            ->first();
        $feeQuery = StudentFee::where('month', $month)->where('year', $year);
        $enrollmentYear = AcademicYear::where('name', '2026/2027')->first()
            ?? AcademicYear::where('is_active', true)->first()
            ?? AcademicYear::latest('id')->first();
        $enrollmentRows = EnrollmentUpdate::query()
            ->whereIn('category', EnrollmentUpdate::FINANCIAL_CATEGORIES)
            ->when($enrollmentYear, fn ($query) => $query->where('academic_year_id', $enrollmentYear->id))
            ->get();
        $payrollRows = TeacherPayroll::where('month', $month)->where('year', $year)->get();
        $financeEntries = FinanceEntry::whereMonth('entry_date', $month)->whereYear('entry_date', $year)->get();

        return [
            'tanggal' => $today,
            'murid' => [
                'aktif' => $activeStudents->count(),
                'per_kelas' => SchoolClass::query()
                    ->leftJoin('student_classes', function ($join) {
                        $join->on('classes.id', '=', 'student_classes.class_id')
                            ->where('student_classes.status', '=', 'active');
                    })
                    ->select('classes.name', 'classes.level')
                    ->selectRaw('COUNT(student_classes.student_id) as students_count')
                    ->groupBy('classes.id', 'classes.name', 'classes.level')
                    ->orderBy('classes.level')
                    ->get()
                    ->map(fn ($class) => ['kelas' => $class->name, 'level' => $class->level, 'murid' => $class->students_count]),
                'daftar_aktif' => $activeStudents->map(fn (Student $student) => [
                    'nis' => $student->nis,
                    'nama' => $student->full_name,
                    'panggilan' => $student->nickname,
                    'kelas' => $student->active_class?->name,
                ])->values(),
            ],
            'absensi' => [
                'hari_ini' => [
                    'hadir' => (int) ($attendanceToday?->hadir ?? 0),
                    'tidak_hadir' => (int) ($attendanceToday?->tidak_hadir ?? 0),
                ],
                'bulan_ini' => Attendance::whereMonth('date', $month)
                    ->whereYear('date', $year)
                    ->selectRaw('status, COUNT(*) as total')
                    ->groupBy('status')
                    ->pluck('total', 'status'),
            ],
            'jurnal' => [
                'hari_ini' => Journal::whereDate('date', $today)->count(),
                'minggu_ini' => Journal::whereBetween('date', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()])->count(),
            ],
            'montessori' => MontessoriArea::query()
                ->leftJoin('montessori_milestones', 'montessori_areas.id', '=', 'montessori_milestones.area_id')
                ->leftJoin('student_milestones', 'montessori_milestones.id', '=', 'student_milestones.milestone_id')
                ->select('montessori_areas.name')
                ->selectRaw('COUNT(student_milestones.id) as total')
                ->selectRaw("SUM(CASE WHEN student_milestones.status = 'mastered' THEN 1 ELSE 0 END) as mastered")
                ->groupBy('montessori_areas.id', 'montessori_areas.name')
                ->orderBy('montessori_areas.sort_order')
                ->get(),
            'hafalan' => StudentHafalan::selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
            'ppdb' => [
                'pending' => Registration::where('status', 'pending')->count(),
                'terbaru' => Registration::latest('id')->limit(8)->get(['child_name', 'status', 'created_at'])->toArray(),
            ],
            'keuangan' => [
                'spp' => [
                    'target' => (int) (clone $feeQuery)->sum('total_billed'),
                    'terbayar' => (int) (clone $feeQuery)->sum('paid_amount'),
                    'belum_bayar' => (clone $feeQuery)->where('status', 'unpaid')->count(),
                    'partial' => (clone $feeQuery)->where('status', 'partial')->count(),
                ],
                'pendaftaran' => [
                    'target' => (int) $enrollmentRows->sum(fn (EnrollmentUpdate $row) => max((int) ($row->target_amount ?? 0), (int) $row->paid_amount)),
                    'terbayar' => (int) $enrollmentRows->sum('paid_amount'),
                    'jumlah' => $enrollmentRows->count(),
                ],
                'gaji_guru' => [
                    'total' => (int) $payrollRows->sum('total_amount'),
                    'terbayar' => (int) $payrollRows->where('status', 'paid')->sum('total_amount'),
                    'jumlah' => $payrollRows->count(),
                ],
                'operasional' => [
                    'pemasukan_manual' => (int) $financeEntries->where('type', 'income')->sum('amount'),
                    'pengeluaran_manual' => (int) $financeEntries->where('type', 'expense')->sum('amount'),
                ],
            ],
            'komunikasi' => [
                'agenda_terdekat' => SchoolAgenda::where('start_date', '>=', $today)->orderBy('start_date')->limit(8)->get(['title', 'start_date', 'location', 'type'])->toArray(),
                'pengumuman_terbaru' => Announcement::latest('id')->limit(8)->get(['title', 'published_at', 'is_urgent'])->toArray(),
            ],
        ];
    }

    private function buildChildPrompt(Student $student, array $context): string
    {
        $nama = $student->nickname ?? $student->full_name;
        $json = json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
Kamu adalah asisten AI di aplikasi sekolah TKIT Madani Montessori.
Kamu membantu orang tua mengetahui perkembangan anak mereka bernama {$nama}.

ATURAN:
1. Jawab HANYA berdasarkan data sistem di bawah. Jangan mengarang dan jangan mengambil data internet.
2. Jika data tidak ada, katakan: "Belum ada catatan untuk ini." Jangan menebak.
3. Gunakan sapaan "Ayah/Bunda" atau "Bapak/Ibu", jangan hanya "Bunda".
4. Panggil anak dengan nama panggilannya.
5. Jika pertanyaan di luar konteks sekolah dan anak ini, jawab persis: "Kamu gabisa jawab itu dan silahkan jawab yang lain."
6. Jawaban singkat dulu, maksimal 3 paragraf pendek.
7. Boleh pakai format Markdown sederhana untuk memperjelas: **bold**, *italic*, __underline__, line break, nomor, dan bullet.

DATA TERKINI {$nama}:
{$json}
PROMPT;
    }

    private function buildManagerPrompt(array $context): string
    {
        $json = json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
Kamu adalah asisten AI manajerial internal TKIT Madani Montessori.
Kamu membantu super admin, kepala sekolah, dan admin membaca data operasional sekolah.

ATURAN:
1. Jawab HANYA berdasarkan data sistem di bawah. Jangan mengarang dan jangan mengambil data internet.
2. Kamu boleh membahas data seluruh sekolah: murid, kelas, absensi, jurnal, Montessori, hafalan, PPDB, agenda, pengumuman, dan keuangan.
3. Jika detail yang diminta tidak ada di data ringkasan, bilang data ringkasan belum memuat detail itu dan arahkan ke menu terkait. Jangan menebak.
4. Jawab cepat, padat, dan operasional. Beri angka konkret jika tersedia.
5. Jangan memakai gaya chat orang tua dan jangan mengaku sebagai orang tua.
6. Jika pertanyaan di luar data sistem sekolah, jawab persis: "Kamu gabisa jawab itu dan silahkan jawab yang lain."
7. Boleh pakai format Markdown sederhana untuk memperjelas: **bold**, *italic*, __underline__, line break, nomor, dan bullet.

DATA SISTEM:
{$json}
PROMPT;
    }
}
