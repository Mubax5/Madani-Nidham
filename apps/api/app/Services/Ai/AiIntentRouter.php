<?php

namespace App\Services\Ai;

use Illuminate\Support\Str;

class AiIntentRouter
{
    public const IDENTITY = 'identity';
    public const OUT_OF_SCOPE = 'out_of_scope';
    public const UNCLEAR = 'unclear';
    public const STUDENT_LIST = 'student_list';
    public const STUDENT_COUNT = 'student_count';
    public const ATTENDANCE = 'attendance';
    public const SPP = 'spp';
    public const PAYROLL = 'payroll';
    public const ENROLLMENT = 'enrollment';
    public const FINANCE = 'finance';
    public const AGENDA = 'agenda';
    public const ANNOUNCEMENT = 'announcement';
    public const LEARNING = 'learning';
    public const SCHOOL_PROFILE = 'school_profile';
    public const USER_ROLES = 'user_roles';
    public const CHILD_ATTENDANCE = 'child_attendance';
    public const CHILD_JOURNAL = 'child_journal';
    public const CHILD_MONTESSORI = 'child_montessori';
    public const CHILD_HAFALAN = 'child_hafalan';
    public const AI = 'ai';

    public function detect(string $message, bool $studentRoom = false): string
    {
        $text = Str::of($message)->lower()->squish()->value();

        if (mb_strlen($text) < 2) {
            return self::UNCLEAR;
        }

        if ($this->isSimpleIdentityPrompt($text)) {
            return self::IDENTITY;
        }

        if ($this->isOutOfSystemScope($text)) {
            return self::OUT_OF_SCOPE;
        }

        if ($this->hasAny($text, ['ini siapa', 'kamu siapa', 'siapa kamu', 'ai siapa', 'assalam', 'assalamu', 'halo', 'hai', 'hi', 'test', 'tes'])) {
            return self::IDENTITY;
        }

        if ($studentRoom) {
            return $this->detectStudentIntent($text);
        }

        return $this->detectManagerIntent($text);
    }

    private function detectManagerIntent(string $text): string
    {
        if ($this->hasAny($text, ['nama murid', 'nama siswa', 'daftar murid', 'list murid', 'semua murid', 'murid aktif', 'siswa aktif'])) {
            return $this->hasAny($text, ['berapa', 'jumlah', 'total']) ? self::STUDENT_COUNT : self::STUDENT_LIST;
        }

        if ($this->hasAny($text, ['jumlah murid', 'jumlah siswa', 'berapa murid', 'berapa siswa', 'total murid', 'total siswa'])) {
            return self::STUDENT_COUNT;
        }

        if ($this->hasAny($text, ['absensi', 'kehadiran', 'hadir hari ini', 'izin', 'sakit', 'alfa'])) {
            return self::ATTENDANCE;
        }

        if ($this->hasAny($text, ['spp', 'tagihan'])) {
            return self::SPP;
        }

        if ($this->hasAny($text, ['gaji', 'payroll', 'insentif'])) {
            return self::PAYROLL;
        }

        if ($this->hasAny($text, [
            'akun', 'user', 'pengguna', 'role', 'akses', 'admin', 'super admin',
            'kepala sekolah', 'kepsek', 'guru', 'orang tua', 'wali murid',
            'pegawai', 'karyawan', 'staf', 'staff',
        ])) {
            return self::USER_ROLES;
        }

        if ($this->hasAny($text, ['profil sekolah', 'nama sekolah', 'alamat sekolah'])) {
            return self::SCHOOL_PROFILE;
        }

        if ($this->hasAny($text, ['ppdb', 'pendaftaran', 'daftar ulang', 'uang pendaftaran', '2026/2027'])) {
            return self::ENROLLMENT;
        }

        if ($this->hasAny($text, ['keuangan', 'kas', 'kas masuk', 'kas keluar', 'uang', 'duit', 'uang masuk', 'uang keluar', 'total uang', 'pemasukan', 'pendapatan', 'saldo', 'net', 'audit', 'cashflow', 'cash flow', 'operasional', 'pengeluaran', 'hari ini', 'kemarin', 'kemaren'])) {
            return self::FINANCE;
        }

        if ($this->hasAny($text, ['agenda', 'jadwal'])) {
            return self::AGENDA;
        }

        if ($this->hasAny($text, ['pengumuman', 'info terbaru'])) {
            return self::ANNOUNCEMENT;
        }

        if ($this->hasAny($text, ['montessori', 'hafalan', 'doa', 'surah', 'perkembangan'])) {
            return self::LEARNING;
        }

        return self::UNCLEAR;
    }

    private function detectStudentIntent(string $text): string
    {
        if ($this->hasAny($text, ['absensi', 'kehadiran', 'hadir', 'izin', 'sakit', 'alfa'])) {
            return self::CHILD_ATTENDANCE;
        }

        if ($this->hasAny($text, ['jurnal', 'catatan', 'kegiatan'])) {
            return self::CHILD_JOURNAL;
        }

        if ($this->hasAny($text, ['montessori', 'perkembangan'])) {
            return self::CHILD_MONTESSORI;
        }

        if ($this->hasAny($text, ['hafalan', 'doa', 'surah'])) {
            return self::CHILD_HAFALAN;
        }

        if ($this->hasAny($text, ['agenda', 'jadwal'])) {
            return self::AGENDA;
        }

        return self::UNCLEAR;
    }

    private function isOutOfSystemScope(string $text): bool
    {
        $externalTerms = [
            'presiden', 'amerika', 'indonesia', 'pemilu', 'politik', 'berita',
            'cuaca', 'resep', 'masak', 'sepak bola', 'bola', 'film', 'artis',
            'saham', 'crypto', 'bitcoin', 'coding', 'programming', 'javascript',
            'php', 'laravel', 'nextjs', 'internet', 'google', 'youtube',
            'mahasiswa', 'kuliah', 'kampus', 'teknik informatika', 'informatika',
            'magang', 'internship', 'lowongan', 'kerja', 'perusahaan',
            'cariin tempat', 'cari tempat',
        ];
        $strongSystemTerms = [
            'madani', 'sekolah', 'murid', 'siswa', 'anak', 'kelas', 'kb', 'tk',
            'absensi', 'jurnal', 'montessori', 'milestone', 'hafalan', 'doa',
            'surah', 'ppdb', 'pendaftaran', 'keuangan', 'spp', 'tagihan', 'guru',
            'operasional', 'kas',
            'agenda', 'pengumuman', 'galeri', 'parenting', 'raport', 'laporan',
            'orang tua', 'ayah', 'bunda', 'kepala sekolah', 'profil sekolah',
        ];
        $softSystemTerms = ['hadir', 'izin', 'sakit', 'alfa', 'uang', 'gaji'];

        if ($this->hasAny($text, $externalTerms) && ! $this->hasAny($text, $strongSystemTerms)) {
            return true;
        }

        if ($this->hasAny($text, [...$strongSystemTerms, ...$softSystemTerms])) {
            return false;
        }

        return $this->hasAny($text, $externalTerms);
    }

    private function isSimpleIdentityPrompt(string $text): bool
    {
        return (bool) preg_match('/^(assalamualaikum|assalamu alaikum|assalam|halo|hai|hi|test|tes|ini siapa|kamu siapa|siapa kamu|ai siapa|anda siapa|siapa anda)[\\s?.!]*$/u', $text);
    }

    private function hasAny(string $text, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (preg_match('/(^|[^\pL\pN])'.preg_quote($needle, '/').'($|[^\pL\pN])/u', $text)) {
                return true;
            }
        }

        return false;
    }
}
