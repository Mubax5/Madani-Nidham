<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\AiChatHistory;
use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\Journal;
use App\Models\MontessoriArea;
use App\Models\MontessoriMilestone;
use App\Models\Registration;
use App\Models\Report;
use App\Models\SchoolAgenda;
use App\Models\SchoolClass;
use App\Models\Setting;
use App\Models\Student;
use App\Models\StudentMilestone;
use App\Models\User;
use App\Services\FeeService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolesAndPermissionsV2Seeder::class);
        $this->seedCoreData();
        $this->call(DatabaseSeederPhase2::class);

        if (! app()->isProduction()) {
            $this->seedDemoData();
        }

        $this->call(EnrollmentUpdateSeeder::class);
    }

    private function seedRoles(): void
    {
        $permissions = [
            'manage_students',
            'view_students',
            'manage_classes',
            'view_classes',
            'manage_attendance',
            'view_attendance',
            'manage_journals',
            'view_journals',
            'manage_milestones',
            'view_milestones',
            'manage_reports',
            'view_reports',
            'publish_reports',
            'manage_announcements',
            'view_announcements',
            'manage_registrations',
            'view_registrations',
            'manage_users',
            'view_dashboard',
            'manage_settings',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $superAdmin = Role::findOrCreate('super_admin', 'web');
        $admin = Role::findOrCreate('admin', 'web');
        $guru = Role::findOrCreate('guru', 'web');
        $orangTua = Role::findOrCreate('orang_tua', 'web');

        $superAdmin->syncPermissions($permissions);
        $admin->syncPermissions(array_values(array_diff($permissions, ['manage_users'])));
        $guru->syncPermissions([
            'view_dashboard',
            'view_students',
            'view_classes',
            'manage_attendance',
            'view_attendance',
            'manage_journals',
            'view_journals',
            'manage_milestones',
            'view_milestones',
            'manage_reports',
            'view_reports',
            'view_announcements',
        ]);
        $orangTua->syncPermissions([
            'view_journals',
            'view_milestones',
            'view_reports',
            'view_announcements',
            'view_attendance',
        ]);
    }

    private function seedCoreData(): void
    {
        $year = AcademicYear::updateOrCreate(
            ['name' => '2026/2027'],
            ['start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true],
        );

        AcademicYear::whereKeyNot($year->id)->update(['is_active' => false]);

        foreach ([
            ['Practical Life', '#F59E0B', 1, 'Keterampilan kehidupan sehari-hari: menuang, melipat, menyapu, memakai pakaian sendiri.'],
            ['Sensorial', '#8B5CF6', 2, 'Pengembangan indra: visual, taktil, auditori, olfaktori, gustatori.'],
            ['Language', '#3B82F6', 3, 'Bahasa lisan, kesiapan membaca, menulis awal, kosakata.'],
            ['Mathematics', '#10B981', 4, 'Konsep angka, kuantitas, operasi dasar dengan material konkret.'],
            ['Culture & Science', '#EF4444', 5, 'Geografi, botani, zoologi, seni, musik, pendidikan Islam.'],
        ] as [$name, $color, $order, $description]) {
            MontessoriArea::updateOrCreate(['name' => $name], [
                'color_hex' => $color,
                'sort_order' => $order,
                'description' => $description,
            ]);
        }

        foreach ([
            'ppdb_document_requirements' => [['name' => 'Akta kelahiran', 'required' => true], ['name' => 'Kartu keluarga', 'required' => true], ['name' => 'Pas foto anak', 'required' => true], ['name' => 'KTP orang tua', 'required' => true]],
            'principal_name' => 'Kepala Sekolah Madani',
            'principal_title' => 'Kepala Sekolah',
            'principal_signature_url' => null,
            'report_signature_disclaimer' => 'Tanda tangan visual ini bukan TTE tersertifikasi. Validasi PSrE akan tersedia setelah provider resmi diaktifkan.',
        ] as $key => $value) {
            Setting::updateOrCreate(['key' => $key], [
                'value' => is_array($value) ? $value : ['value' => $value],
                'type' => is_array($value) ? 'json' : 'text',
            ]);
        }
    }

    private function seedDemoData(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@madani-nidham.local'],
            ['name' => 'Kepala Sekolah Madani', 'password' => 'password', 'phone' => '000000000001', 'is_active' => true],
        );
        $admin->syncRoles(['super_admin']);

        $principal = User::updateOrCreate(
            ['email' => 'kepsek@madani-nidham.local'],
            ['name' => 'Kepala Sekolah', 'password' => 'password', 'phone' => '000000000002', 'is_active' => true],
        );
        $principal->syncRoles(['kepala_sekolah']);

        $schoolAdmin = User::updateOrCreate(
            ['email' => 'staf@madani-nidham.local'],
            ['name' => 'Admin Sekolah', 'password' => 'password', 'phone' => '000000000003', 'is_active' => true],
        );
        $schoolAdmin->syncRoles(['admin']);

        $teacherSeeds = [
            ['email' => 'guru@madani-nidham.local', 'name' => 'Ustadzah Nabila', 'phone' => '000000000004'],
            ['email' => 'guru02@madani-nidham.local', 'name' => 'Ustadzah Salma', 'phone' => '000000000005'],
            ['email' => 'guru03@madani-nidham.local', 'name' => 'Ustadzah Rania', 'phone' => '000000000006'],
            ['email' => 'guru04@madani-nidham.local', 'name' => 'Ustadzah Laila', 'phone' => '000000000007'],
        ];

        $staleTeacherEmails = array_merge(
            ['guru01@madani-nidham.local'],
            array_map(fn (int $index) => sprintf('guru%02d@madani-nidham.local', $index), range(5, 10)),
        );
        $staleTeacherIds = User::whereIn('email', $staleTeacherEmails)->pluck('id');
        if ($staleTeacherIds->isNotEmpty()) {
            SchoolClass::whereIn('teacher_id', $staleTeacherIds)->update(['teacher_id' => null]);
            User::whereIn('id', $staleTeacherIds)->delete();
        }

        $teachers = [];
        foreach ($teacherSeeds as $teacherSeed) {
            $demoTeacher = User::updateOrCreate(
                ['email' => $teacherSeed['email']],
                ['name' => $teacherSeed['name'], 'password' => 'password', 'phone' => $teacherSeed['phone'], 'is_active' => true],
            );
            $demoTeacher->syncRoles(['guru']);
            $teachers[] = $demoTeacher;
        }
        $teacher = $teachers[0];

        $year = AcademicYear::where('is_active', true)->first();
        $classSeeds = [
            ['name' => 'KB', 'level' => 'KB', 'teacher_id' => $admin->id, 'capacity' => 16],
            ['name' => 'TK A', 'level' => 'TK A', 'teacher_id' => $teachers[0]->id, 'capacity' => 18],
            ['name' => 'TK B', 'level' => 'TK B', 'teacher_id' => $teachers[1]->id, 'capacity' => 18],
            ['name' => 'TK C', 'level' => 'TK C', 'teacher_id' => $teachers[2]->id, 'capacity' => 16],
        ];
        $classes = collect($classSeeds)->map(fn (array $classSeed) => SchoolClass::updateOrCreate(
            ['name' => $classSeed['name'], 'academic_year_id' => $year->id],
            ['teacher_id' => $classSeed['teacher_id'], 'level' => $classSeed['level'], 'capacity' => $classSeed['capacity']],
        ))->values();
        $class = $classes->firstWhere('name', 'KB') ?? $classes->first();

        $staleClassIds = SchoolClass::whereNotIn('id', $classes->pluck('id'))->pluck('id');
        if ($staleClassIds->isNotEmpty()) {
            DB::table('student_classes')->whereIn('class_id', $staleClassIds)->delete();
            Attendance::whereIn('class_id', $staleClassIds)->delete();
            Journal::whereIn('class_id', $staleClassIds)->delete();
            Report::whereIn('class_id', $staleClassIds)->delete();
            SchoolClass::whereIn('id', $staleClassIds)->delete();
        }

        $studentSeeds = [
            ['Salman', 'Salman', 'L', 'KB', 'GMC Blok A2', 'active'],
            ['Haura', 'Haura', 'P', 'KB', 'GMC Blok A2', 'active'],
            ['Aisyah', 'Aisyah', 'P', 'KB', 'Korpri Blok E', 'active'],
            ['Arkana Khayril Akmal', 'Arkana', 'L', 'KB', null, 'active'],
            ['Izqian Faeyza Arayya', 'Izqian', 'L', 'KB', null, 'active'],
            ['Mahira', 'Mahira', 'P', 'KB', null, 'active'],
            ['Kaivan', 'Kaivan', 'L', 'KB', null, 'active'],
            ['Rayn', 'Rayn', 'L', 'KB', null, 'active'],
            ['Raline', 'Raline', 'P', 'KB', null, 'active'],
            ['Encarna', 'Encarna', 'P', 'KB', null, 'active'],
            ['Lathifa', 'Lathifa', 'P', 'KB', null, 'active'],
            ['Aara Shadia Ramdani', 'Aara', 'P', 'KB', null, 'active'],
            ['Arkana Wafi', 'Arkana Wafi', 'L', 'KB', null, 'active'],
            ['Mickhayla', 'Mickhayla', 'P', 'TK A', null, 'active'],
            ['Barra', 'Barra', 'L', 'TK A', null, 'active'],
            ['Rama', 'Rama', 'L', 'TK A', null, 'active'],
            ['Hilya', 'Hilya', 'P', 'TK A', null, 'active'],
            ['Zafran', 'Zafran', 'L', 'TK A', null, 'active'],
            ['Afkar', 'Afkar', 'L', 'TK A', null, 'active'],
            ['Haura Beniing', 'Haura Bening', 'P', 'TK A', null, 'active'],
            ['Hilmi', 'Hilmi', 'L', 'TK A', null, 'active'],
            ['Azra', 'Azra', 'P', 'TK A', null, 'active'],
            ['Nayyara', 'Nayyara', 'P', 'TK A', null, 'active'],
            ['Yusuf', 'Yusuf', 'L', 'TK A', null, 'active'],
            ['Harun', 'Harun', 'L', 'TK C', null, 'active'],
            ['Alyssa', 'Alyssa', 'P', 'TK A', null, 'active'],
            ['Tsabina', 'Tsabina', 'P', 'TK A', null, 'active'],
            ['Anya', 'Anya', 'P', 'TK A', null, 'active'],
            ['Aretha Shanum', 'Aretha', 'P', 'TK A', null, 'active'],
            ['Zayn', 'Zayn', 'L', 'TK A', null, 'active'],
            ['Elby', 'Elby', 'L', 'TK A', null, 'active'],
            ['Shanum A', 'Shanum', 'P', 'TK C', null, 'active'],
            ['Sofia', 'Sofia', 'P', 'TK B', null, 'alumni'],
            ['Nayla', 'Nayla', 'P', 'TK B', null, 'alumni'],
            ['Areta Adiana', 'Areta', 'P', 'TK B', null, 'alumni'],
            ['Queena', 'Queena', 'P', 'TK B', null, 'alumni'],
            ['Khayyara', 'Khayyara', 'P', 'TK B', null, 'alumni'],
            ['Fira', 'Fira', 'P', 'TK B', null, 'alumni'],
        ];

        $desiredNis = collect($studentSeeds)
            ->keys()
            ->map(fn (int $index) => sprintf('MDN-%03d', $index + 1))
            ->all();
        Registration::whereNotNull('converted_student_id')->update(['converted_student_id' => null]);
        Student::where(fn ($query) => $query->whereNull('nis')->orWhereNotIn('nis', $desiredNis))->delete();
        $parentUserIds = User::role('orang_tua')->pluck('id');
        if ($parentUserIds->isNotEmpty()) {
            DB::table('student_parents')->whereIn('user_id', $parentUserIds)->delete();
            DB::table('ai_chat_histories')->whereIn('user_id', $parentUserIds)->delete();
            DB::table('ai_chat_usages')->whereIn('user_id', $parentUserIds)->delete();
            DB::table('notifications')->whereIn('user_id', $parentUserIds)->delete();
            DB::table('absence_requests')->whereIn('requested_by', $parentUserIds)->delete();
            DB::table('tutoring_bookings')->whereIn('requested_by', $parentUserIds)->delete();
            DB::table('model_has_roles')->where('model_type', User::class)->whereIn('model_id', $parentUserIds)->delete();
            DB::table('model_has_permissions')->where('model_type', User::class)->whereIn('model_id', $parentUserIds)->delete();
            User::whereIn('id', $parentUserIds)->delete();
        }
        DB::table('student_parents')->delete();

        $students = [];
        foreach ($studentSeeds as $index => [$fullName, $nickname, $gender, $level, $address, $status]) {
            $number = $index + 1;
            $nis = sprintf('MDN-%03d', $number);
            $demoStudent = Student::updateOrCreate(
                ['nis' => $nis],
                [
                    'full_name' => $fullName,
                    'nickname' => $nickname,
                    'birth_date' => match ($level) {
                        'KB' => now()->subYears(4)->subMonths($index % 10)->toDateString(),
                        'TK A' => now()->subYears(5)->subMonths($index % 10)->toDateString(),
                        'TK C' => now()->subYears(6)->subMonths($index % 6)->toDateString(),
                        default => now()->subYears(6)->subMonths($index % 8)->toDateString(),
                    },
                    'birth_place' => 'Tangerang',
                    'gender' => $gender,
                    'address' => $address ?? 'Data alamat belum dilengkapi',
                    'join_date' => '2026-07-01',
                    'status' => $status,
                ],
            );
            $students[] = $demoStudent;

            $assignedClass = $classes->firstWhere('level', $level) ?? $class;
            DB::table('student_classes')->updateOrInsert(
                ['student_id' => $demoStudent->id, 'academic_year_id' => $year->id],
                ['class_id' => $assignedClass->id, 'status' => $status === 'alumni' ? 'graduated' : 'active', 'created_at' => now(), 'updated_at' => now()],
            );
        }

        $studentIds = collect($students)->pluck('id');
        Attendance::whereIn('student_id', $studentIds)->delete();
        Journal::whereIn('student_id', $studentIds)->delete();
        Report::whereIn('student_id', $studentIds)->delete();
        StudentMilestone::whereIn('student_id', $studentIds)->delete();

        $activeStudents = collect($students)->filter(fn (Student $demoStudent) => $demoStudent->status === 'active')->values();

        foreach ($activeStudents as $index => $demoStudent) {
            $demoStudent->load('classes');
            $assignedClass = $demoStudent->active_class ?? $classes[$index % $classes->count()];
            Attendance::updateOrCreate(
                ['student_id' => $demoStudent->id, 'date' => now()->subDays(($index % 6) + 1)->toDateString()],
                [
                    'class_id' => $assignedClass->id,
                    'status' => ['hadir', 'hadir', 'izin', 'sakit', 'alfa'][$index % 5],
                    'notes' => $index % 3 === 0 ? 'Perlu pendampingan saat transisi kelas.' : null,
                    'recorded_by' => $teacher->id,
                    'check_in_time' => '08:0'.($index % 10),
                ],
            );

            Journal::updateOrCreate(
                ['student_id' => $demoStudent->id, 'date' => now()->subDays(($index % 5) + 1)->toDateString()],
                [
                    'class_id' => $assignedClass->id,
                    'teacher_id' => $teacher->id,
                    'content' => 'Hari ini '.$demoStudent->nickname.' mengikuti kegiatan kelas, latihan kemandirian, dan kerja kelompok.',
                    'mood' => ['happy', 'neutral', 'energetic', 'tired', 'sad'][$index % 5],
                    'activities' => ['Practical Life', 'Language'],
                    'photo_urls' => [],
                    'is_published' => true,
                ],
            );

            Report::updateOrCreate(
                ['student_id' => $demoStudent->id, 'academic_year_id' => $year->id, 'semester' => '1'],
                [
                    'class_id' => $assignedClass->id,
                    'general_notes' => 'Progress anak stabil dan aktif mengikuti kegiatan kelas.',
                    'character_notes' => 'Mulai mandiri, mau menunggu giliran, dan mampu bekerja dalam kelompok kecil.',
                    'recommendation' => 'Lanjutkan latihan bahasa dan kemandirian di rumah.',
                    'signature_status' => $index % 2 === 0 ? 'visual_signed' : 'unsigned',
                    'published_at' => $index % 2 === 0 ? now()->subDays($index) : null,
                    'signed_at' => $index % 2 === 0 ? now()->subDays($index) : null,
                    'signed_by' => $index % 2 === 0 ? $admin->id : null,
                    'created_by' => $teacher->id,
                ],
            );
        }

        MontessoriMilestone::where('name', 'like', '%Demo%')->delete();

        $areas = MontessoriArea::orderBy('sort_order')->get();
        $milestoneNames = [
            'Practical Life' => ['Menuang air tanpa tumpah', 'Melipat kain kerja', 'Mengancingkan pakaian'],
            'Sensorial' => ['Mencocokkan warna primer', 'Menyusun pink tower', 'Membedakan kasar dan halus'],
            'Language' => ['Mengenal bunyi awal', 'Menebalkan huruf pasir', 'Menceritakan gambar sederhana'],
            'Mathematics' => ['Mengurutkan angka 1-10', 'Memasangkan angka dan kuantitas', 'Mengenal bentuk geometri dasar'],
            'Culture & Science' => ['Mengenal anggota wudhu', 'Mengelompokkan bagian tumbuhan', 'Menyebutkan nama benua'],
        ];
        foreach ($areas as $areaIndex => $area) {
            for ($i = 1; $i <= 3; $i++) {
                $milestone = MontessoriMilestone::updateOrCreate(
                    ['area_id' => $area->id, 'name' => $milestoneNames[$area->name][$i - 1] ?? $area->name.' '.$i],
                    [
                        'description' => 'Observasi kemampuan anak pada area '.$area->name.'.',
                        'age_min_months' => 36 + ($i * 3),
                        'age_max_months' => 72,
                        'level' => ['KB', 'TK A', 'TK B', 'TK C'][($areaIndex + $i) % 4],
                        'sort_order' => $i,
                    ],
                );

                foreach ($activeStudents->take(12) as $studentIndex => $demoStudent) {
                    StudentMilestone::updateOrCreate(
                        ['student_id' => $demoStudent->id, 'milestone_id' => $milestone->id],
                        [
                            'status' => ['not_started', 'introduced', 'in_progress', 'mastered'][$studentIndex % 4],
                            'observation_notes' => 'Observasi dicatat saat aktivitas Montessori.',
                            'observed_at' => now()->subDays($studentIndex)->toDateString(),
                            'observed_by' => $teacher->id,
                        ],
                    );
                }
            }
        }

        DB::table('fee_payments')->delete();
        DB::table('student_fees')->delete();
        app(FeeService::class)->generateMonthly((int) now()->month, (int) now()->year, (int) $year->id);

        AiChatHistory::query()->delete();
        foreach ($activeStudents->take(3) as $index => $demoStudent) {
            AiChatHistory::insert([
                [
                    'user_id' => $schoolAdmin->id,
                    'student_id' => $demoStudent->id,
                    'role' => 'user',
                    'message' => 'Bagaimana perkembangan '.$demoStudent->nickname.' minggu ini?',
                    'tokens_used' => null,
                    'created_at' => now()->subMinutes(20 - $index),
                    'updated_at' => now()->subMinutes(20 - $index),
                ],
                [
                    'user_id' => $schoolAdmin->id,
                    'student_id' => $demoStudent->id,
                    'role' => 'model',
                    'message' => 'Berdasarkan data sistem, '.$demoStudent->nickname.' sudah memiliki catatan kelas dan absensi terbaru. Detail lengkap tetap perlu dilihat dari jurnal, absensi, Montessori, dan hafalan yang tersimpan.',
                    'tokens_used' => 120 + $index,
                    'created_at' => now()->subMinutes(19 - $index),
                    'updated_at' => now()->subMinutes(19 - $index),
                ],
            ]);
        }

        Announcement::where('title', 'like', '%demo%')->delete();
        SchoolAgenda::where('title', 'like', '%demo%')->delete();
        Registration::where('child_name', 'like', '%Demo%')->delete();
        Registration::where('registration_number', 'like', 'REG-2026-%')->delete();

        $announcementTitles = [
            'Jadwal parenting pekan ini',
            'Pengingat bekal sehat',
            'Kegiatan market day',
            'Informasi pemeriksaan kesehatan',
            'Persiapan outing class',
            'Pengambilan raport semester',
            'Latihan manasik anak',
            'Hari batik sekolah',
            'Perubahan jam pulang Jumat',
            'Undangan observasi kelas',
        ];
        $agendaTitles = [
            'Parenting komunikasi positif',
            'Market day kelas TK B',
            'Pemeriksaan gigi anak',
            'Outing class ke perpustakaan',
            'Rapat orang tua KB',
            'Simulasi manasik haji',
            'Pentas seni akhir tema',
            'Kunjungan dokter kecil',
            'Pengenalan profesi',
            'Pembagian raport semester',
        ];
        for ($i = 1; $i <= 10; $i++) {
            Announcement::updateOrCreate(
                ['title' => $announcementTitles[$i - 1]],
                [
                    'content' => 'Informasi untuk orang tua terkait '.$announcementTitles[$i - 1].'.',
                    'target' => $i % 3 === 0 ? 'class' : 'all',
                    'target_class_ids' => $i % 3 === 0 ? [$classes[$i % $classes->count()]->id] : [],
                    'target_user_ids' => [],
                    'is_urgent' => $i % 4 === 0,
                    'published_at' => now()->subDays($i),
                    'published_by' => $admin->id,
                ],
            );

            SchoolAgenda::updateOrCreate(
                ['title' => $agendaTitles[$i - 1]],
                [
                    'description' => 'Agenda sekolah: '.$agendaTitles[$i - 1].'.',
                    'start_date' => now()->startOfMonth()->addDays($i + 1)->toDateString(),
                    'end_date' => $i % 4 === 0 ? now()->startOfMonth()->addDays($i + 2)->toDateString() : null,
                    'location' => ['Aula', 'Kelas', 'Halaman', 'Masjid'][$i % 4],
                    'type' => ['kegiatan', 'libur', 'rapat', 'lomba', 'penerimaan'][$i % 5],
                    'affects_attendance' => $i % 5 === 1,
                    'created_by' => $admin->id,
                ],
            );
        }

        $registrationSeeds = array_slice($studentSeeds, 0, 14);
        foreach ($registrationSeeds as $index => [$fullName, $nickname, $gender, $level, $address]) {
            $i = $index + 1;
            Registration::updateOrCreate(
                ['registration_number' => sprintf('REG-2026-%03d', $i)],
                [
                    'academic_year_id' => $year->id,
                    'child_name' => $fullName,
                    'child_birth_date' => now()->subYears($level === 'KB' ? 4 : 5)->subMonths($i)->toDateString(),
                    'child_gender' => $gender,
                    'program_applied' => $level,
                    'parent_name' => 'Wali '.$nickname,
                    'parent_phone' => '628133000'.str_pad((string) $i, 3, '0', STR_PAD_LEFT),
                    'parent_email' => sprintf('ppdb%02d@madani-nidham.local', $i),
                    'address' => $address ?? 'Data alamat belum dilengkapi',
                    'document_urls' => [],
                    'status' => $i <= 10 ? 'accepted' : 'pending',
                    'reviewer_notes' => $i <= 10 ? 'Data sudah sesuai update pendaftaran 2026/2027.' : null,
                    'reviewed_by' => $i <= 10 ? $admin->id : null,
                    'reviewed_at' => $i <= 10 ? now()->subDays($i) : null,
                ],
            );
        }
    }
}
