<?php

use App\Http\Controllers\Api\AbsenceRequestController;
use App\Http\Controllers\Api\AiChatController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\DigestController;
use App\Http\Controllers\Api\EnrollmentUpdateController;
use App\Http\Controllers\Api\FeeController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\GalleryController;
use App\Http\Controllers\Api\HafalanController;
use App\Http\Controllers\Api\PortfolioController;
use App\Models\AcademicYear;
use App\Models\AbsenceRequest;
use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\EnrollmentUpdate;
use App\Models\FinanceEntry;
use App\Models\Journal;
use App\Models\MontessoriArea;
use App\Models\MontessoriMilestone;
use App\Models\Registration;
use App\Models\Report;
use App\Models\SchoolAgenda;
use App\Models\SchoolClass;
use App\Models\SchoolNotification;
use App\Models\Setting;
use App\Models\Student;
use App\Models\StudentHafalan;
use App\Models\StudentFee;
use App\Models\StudentMilestone;
use App\Models\TeacherPayroll;
use App\Models\User;
use App\Support\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

Route::prefix('v1')->group(function () {
    $perPage = fn (Request $request): int => min(max((int) $request->integer('perPage', 15), 1), 100);

    $settingValue = function (string $key, mixed $default = null): mixed {
        $value = Setting::where('key', $key)->value('value');

        if ($value === null) {
            return $default;
        }

        $decoded = is_string($value) ? json_decode($value, true) : $value;

        return is_array($decoded) && array_key_exists('value', $decoded) ? $decoded['value'] : $decoded;
    };

    $activeYear = function () use ($settingValue): ?AcademicYear {
        $today = now()->startOfDay();
        $datedYear = AcademicYear::whereDate('start_date', '<=', $today->toDateString())
            ->whereDate('end_date', '>=', $today->toDateString())
            ->orderByDesc('start_date')
            ->first();

        if ($datedYear) {
            return $datedYear;
        }

        $startMonth = (int) $settingValue('academic_year_start_month', 6);
        $startDay = (int) $settingValue('academic_year_start_day', 20);
        $startThisYear = now()->setDate(now()->year, $startMonth, $startDay)->startOfDay();
        $firstYear = $today->greaterThanOrEqualTo($startThisYear) ? now()->year : now()->year - 1;
        $computedName = $firstYear.'/'.($firstYear + 1);

        return AcademicYear::where('name', $computedName)->first()
            ?? AcademicYear::where('is_active', true)->first()
            ?? AcademicYear::latest('id')->first();
    };

    $storeSetting = function (string $key, mixed $value, string $type = 'text'): Setting {
        return Setting::updateOrCreate(['key' => $key], [
            'value' => is_array($value) ? $value : ['value' => $value],
            'type' => $type,
        ]);
    };

    $upload = function ($file, string $folder): string {
        $path = Storage::disk('public')->putFile($folder, $file);

        return url('/storage/'.$path);
    };

    $studentPrograms = ['regular', 'half_day', 'full_day'];

    $programSchedule = fn (string $program): array => match ($program) {
        'half_day' => [
            'label' => 'Half Day',
            'weekday' => 'Senin-Kamis 07.30-13.00',
            'friday' => 'Jumat 07.30-12.30',
            'available_from' => null,
        ],
        'full_day' => [
            'label' => 'Full Day',
            'weekday' => 'Senin-Kamis 07.30-16.00',
            'friday' => 'Jumat 07.30-15.30',
            'available_from' => '2026/2027',
        ],
        default => [
            'label' => 'Reguler',
            'weekday' => 'Senin-Kamis 07.30-10.30',
            'friday' => 'Jumat 07.30-10.00',
            'available_from' => null,
        ],
    };

    $forgetDashboard = function () {
        Cache::forget('dashboard:v1:'.now()->toDateString());
        Cache::forget('dashboard:v2:'.now()->toDateString());
        Cache::forget('dashboard:v3:'.now()->toDateString());
        Cache::forget('dashboard:v4:'.now()->toDateString());
    };

    $userPayload = function (User $user): array {
        $user->loadMissing('roles');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'photo_url' => $user->photo_url,
            'is_active' => $user->is_active,
            'email_verified_at' => $user->email_verified_at,
            'google_linked_at' => $user->google_linked_at,
            'last_login_at' => $user->last_login_at,
            'roles' => $user->roles->pluck('name')->values(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
        ];
    };

    $googleConfig = function (): array {
        return [
            'client_id' => (string) config('services.google.client_id'),
            'client_secret' => (string) config('services.google.client_secret'),
            'redirect_uri' => (string) config('services.google.redirect_uri'),
            'allowed_redirect_uris' => array_values(array_unique(array_filter([
                (string) config('services.google.redirect_uri'),
                ...((array) config('services.google.allowed_redirect_uris', [])),
            ]))),
        ];
    };

    $googleRedirectUri = function (?string $redirectUri) use ($googleConfig): string {
        $config = $googleConfig();
        $uri = $redirectUri ?: $config['redirect_uri'];

        abort_unless(in_array($uri, $config['allowed_redirect_uris'], true), 422, 'Redirect URI Google tidak diizinkan.');

        return $uri;
    };

    $googleState = function (string $mode): string {
        $payload = base64_encode(json_encode([
            'mode' => $mode,
            'nonce' => Str::random(24),
            'iat' => now()->timestamp,
        ], JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', $payload, (string) config('app.key'));

        return $payload.'.'.$signature;
    };

    $validateGoogleState = function (string $state, string $mode): bool {
        [$payload, $signature] = array_pad(explode('.', $state, 2), 2, '');
        $expected = hash_hmac('sha256', $payload, (string) config('app.key'));
        if (! hash_equals($expected, $signature)) {
            return false;
        }

        $decoded = json_decode(base64_decode($payload, true) ?: '', true);
        if (! is_array($decoded) || ($decoded['mode'] ?? null) !== $mode) {
            return false;
        }

        return now()->timestamp - (int) ($decoded['iat'] ?? 0) <= 600;
    };

    $fetchGoogleUser = function (string $code, string $redirectUri) use ($googleConfig, $googleRedirectUri): array {
        $config = $googleConfig();
        if ($config['client_id'] === '' || $config['client_secret'] === '') {
            abort(422, 'Google OAuth belum dikonfigurasi.');
        }
        $redirectUri = $googleRedirectUri($redirectUri);

        $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code',
        ]);

        if (! $tokenResponse->successful()) {
            abort(422, 'Kode Google tidak valid atau sudah kedaluwarsa.');
        }

        $accessToken = $tokenResponse->json('access_token');
        $profileResponse = Http::withToken($accessToken)->get('https://openidconnect.googleapis.com/v1/userinfo');
        if (! $profileResponse->successful()) {
            abort(422, 'Profil Google gagal diambil.');
        }

        return $profileResponse->json();
    };

    Route::post('/auth/login', function (Request $request) use ($userPayload) {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! $user->is_active || ! Hash::check($credentials['password'], $user->password)) {
            return ApiResponse::error('Email atau password tidak valid.', ['email' => ['Kredensial tidak cocok.']], 422);
        }

        Auth::login($user);
        $user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'last_login_user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
        ])->save();
        $token = $user->createToken('madani-dashboard')->plainTextToken;

        Log::info('User login', ['user_id' => $user->id]);

        return ApiResponse::success([
            'user' => $userPayload($user),
            'token' => $token,
        ], 'Login berhasil.');
    })->middleware('throttle:10,1');

    Route::get('/auth/google/url', function (Request $request) use ($googleConfig, $googleState, $googleRedirectUri) {
        $data = $request->validate([
            'mode' => ['nullable', Rule::in(['login', 'link'])],
            'redirectUri' => ['nullable', 'url'],
        ]);
        $config = $googleConfig();
        if ($config['client_id'] === '' || $config['client_secret'] === '') {
            return ApiResponse::error('Google OAuth belum dikonfigurasi. Isi GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan GOOGLE_REDIRECT_URI.', [], 422);
        }

        $redirectUri = $googleRedirectUri($data['redirectUri'] ?? null);
        $query = http_build_query([
            'client_id' => $config['client_id'],
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $googleState($data['mode'] ?? 'login'),
            'prompt' => 'select_account',
        ]);

        return ApiResponse::success(['url' => 'https://accounts.google.com/o/oauth2/v2/auth?'.$query], 'URL login Google berhasil dibuat.');
    })->middleware('throttle:20,1');

    Route::post('/auth/google/login', function (Request $request) use ($fetchGoogleUser, $validateGoogleState, $userPayload) {
        $data = $request->validate([
            'code' => ['required', 'string'],
            'state' => ['required', 'string'],
            'redirectUri' => ['required', 'url'],
        ]);
        if (! $validateGoogleState($data['state'], 'login')) {
            return ApiResponse::error('State Google tidak valid. Ulangi login.', [], 422);
        }

        $profile = $fetchGoogleUser($data['code'], $data['redirectUri']);
        if (! ($profile['email_verified'] ?? false)) {
            return ApiResponse::error('Akun Google belum terverifikasi.', [], 403);
        }

        $user = User::where('email', $profile['email'] ?? '')->first();
        if (! $user || ! $user->is_active || ! $user->google_id || ! $user->email_verified_at) {
            return ApiResponse::error('Login Google belum aktif. Login email-password dulu, lalu verifikasi Google dari profil.', [], 403);
        }
        if (! hash_equals((string) $user->google_id, (string) ($profile['sub'] ?? ''))) {
            return ApiResponse::error('Akun Google tidak cocok dengan profil yang sudah diverifikasi.', [], 403);
        }

        $user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'last_login_user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
        ])->save();
        $token = $user->createToken('madani-dashboard')->plainTextToken;

        return ApiResponse::success(['user' => $userPayload($user), 'token' => $token], 'Login Google berhasil.');
    })->middleware('throttle:10,1');

    Route::get('/school/programs', fn () => ApiResponse::success(collect($studentPrograms)->map(fn (string $program) => [
        'value' => $program,
        ...$programSchedule($program),
    ])->values(), 'Program sekolah berhasil diambil.'));

    Route::post('/registrations', function (Request $request) use ($activeYear, $upload, $forgetDashboard, $studentPrograms) {
        $data = $request->validate([
            'childName' => ['required', 'string', 'max:150'],
            'childBirthDate' => ['required', 'date'],
            'childGender' => ['required', Rule::in(['L', 'P'])],
            'programApplied' => ['required', Rule::in(['KB', 'TK A', 'TK B', 'TK C'])],
            'programType' => ['required', Rule::in($studentPrograms)],
            'parentName' => ['required', 'string', 'max:150'],
            'parentPhone' => ['required', 'string', 'max:20'],
            'parentEmail' => ['required', 'email', 'max:150'],
            'address' => ['required', 'string', 'max:2000'],
            'documents.*' => ['nullable', 'file', 'max:5120'],
        ]);

        $documents = [];
        foreach ($request->file('documents', []) as $index => $file) {
            $documents[] = [
                'name' => $request->input("documentNames.$index", 'Dokumen '.($index + 1)),
                'url' => $upload($file, 'registrations'),
            ];
        }

        $registration = Registration::create([
            'academic_year_id' => $activeYear()?->id,
            'child_name' => $data['childName'],
            'child_birth_date' => $data['childBirthDate'],
            'child_gender' => $data['childGender'],
            'program_applied' => $data['programApplied'],
            'program_type' => $data['programType'],
            'parent_name' => $data['parentName'],
            'parent_phone' => $data['parentPhone'],
            'parent_email' => $data['parentEmail'],
            'address' => $data['address'],
            'document_urls' => $documents,
        ]);
        $forgetDashboard();

        return ApiResponse::success($registration, 'Pendaftaran berhasil dikirim.', [], 201);
    })->middleware('throttle:10,1');

    Route::get('/registrations/check/{number}', function (string $number) {
        $registration = Registration::where('registration_number', strtoupper($number))->first();

        if (! $registration) {
            return ApiResponse::error('Nomor pendaftaran tidak ditemukan.', [], 404);
        }

        return ApiResponse::success($registration, 'Status pendaftaran berhasil diambil.');
    });

    Route::middleware('auth:sanctum')->group(function () use ($perPage, $activeYear, $settingValue, $storeSetting, $upload, $userPayload, $forgetDashboard, $fetchGoogleUser, $validateGoogleState, $studentPrograms) {
        Route::post('/auth/logout', function (Request $request) {
            $request->user()->currentAccessToken()?->delete();
            Auth::guard('web')->logout();

            return ApiResponse::success(null, 'Logout berhasil.');
        });

        Route::get('/auth/me', fn (Request $request) => ApiResponse::success($userPayload($request->user()), 'Profil berhasil diambil.'));

        Route::put('/auth/profile', function (Request $request) use ($userPayload) {
            $data = $request->validate([
                'name' => ['required', 'string', 'max:150'],
                'phone' => ['nullable', 'string', 'max:20'],
            ]);

            $request->user()->update($data);

            return ApiResponse::success($userPayload($request->user()), 'Profil berhasil diperbarui.');
        });

        Route::put('/auth/change-password', function (Request $request) {
            $data = $request->validate([
                'currentPassword' => ['required', 'string'],
                'password' => ['required', 'string', 'min:8', 'confirmed'],
            ]);

            if (! Hash::check($data['currentPassword'], $request->user()->password)) {
                return ApiResponse::error('Password lama tidak sesuai.', ['currentPassword' => ['Password lama tidak sesuai.']], 422);
            }

            $request->user()->update([
                'password' => $data['password'],
                'password_changed_at' => now(),
            ]);
            $request->user()->tokens()->delete();

            return ApiResponse::success(null, 'Password berhasil diubah. Silakan login ulang.');
        });

        Route::post('/auth/google/link', function (Request $request) use ($fetchGoogleUser, $validateGoogleState, $userPayload) {
            $data = $request->validate([
                'code' => ['required', 'string'],
                'state' => ['required', 'string'],
                'redirectUri' => ['required', 'url'],
            ]);
            if (! $validateGoogleState($data['state'], 'link')) {
                return ApiResponse::error('State Google tidak valid. Ulangi verifikasi.', [], 422);
            }

            $profile = $fetchGoogleUser($data['code'], $data['redirectUri']);
            if (! ($profile['email_verified'] ?? false)) {
                return ApiResponse::error('Akun Google belum terverifikasi.', [], 403);
            }
            if (! hash_equals(Str::lower($request->user()->email), Str::lower((string) ($profile['email'] ?? '')))) {
                return ApiResponse::error('Email Google harus sama dengan email akun Madani Nidham.', [], 422);
            }

            $taken = User::where('google_id', $profile['sub'] ?? null)
                ->where('id', '!=', $request->user()->id)
                ->exists();
            if ($taken) {
                return ApiResponse::error('Akun Google sudah dipakai user lain.', [], 422);
            }

            $request->user()->forceFill([
                'google_id' => (string) $profile['sub'],
                'google_avatar_url' => $profile['picture'] ?? null,
                'email_verified_at' => $request->user()->email_verified_at ?? now(),
                'google_linked_at' => now(),
            ])->save();

            return ApiResponse::success($userPayload($request->user()->fresh('roles')), 'Akun Google berhasil diverifikasi.');
        })->middleware('throttle:10,1');

        Route::put('/auth/fcm-token', function (Request $request) {
            $data = $request->validate(['fcmToken' => ['nullable', 'string', 'max:500']]);
            $request->user()->update(['fcm_token' => $data['fcmToken'] ?? null]);

            return ApiResponse::success(null, 'Token notifikasi berhasil diperbarui.');
        });

        $attendanceByClass = function (string $today) {
            $attendanceRows = Attendance::query()
                ->whereDate('date', $today)
                ->select('class_id', 'status')
                ->selectRaw('COUNT(*) as total')
                ->groupBy('class_id', 'status')
                ->get()
                ->groupBy('class_id');

            return SchoolClass::query()
                ->withCount(['students as active_students_count' => fn ($query) => $query
                    ->where('students.status', 'active')])
                ->orderBy('level')
                ->orderBy('name')
                ->get(['id', 'name', 'level', 'capacity'])
                ->map(function (SchoolClass $class) use ($attendanceRows) {
                    $rows = $attendanceRows->get($class->id, collect())->keyBy('status');
                    $hadir = (int) ($rows->get('hadir')?->total ?? 0);
                    $izin = (int) ($rows->get('izin')?->total ?? 0);
                    $sakit = (int) ($rows->get('sakit')?->total ?? 0);
                    $alfa = (int) ($rows->get('alfa')?->total ?? 0);
                    $recorded = $hadir + $izin + $sakit + $alfa;
                    $total = max((int) $class->active_students_count, $recorded);

                    return [
                        'id' => $class->id,
                        'name' => $class->name,
                        'level' => $class->level,
                        'capacity' => (int) ($class->capacity ?? 0),
                        'hadir' => $hadir,
                        'izin' => $izin,
                        'sakit' => $sakit,
                        'alfa' => $alfa,
                        'total' => $total,
                    ];
                })
                ->values();
        };

        $weeklyAttendanceTrend = function (int $weeks = 8) {
            $weeks = max(1, min($weeks, 12));
            $start = now()->subWeeks($weeks - 1)->startOfWeek();
            $end = now()->endOfWeek();

            $dailyRows = Attendance::query()
                ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
                ->selectRaw('DATE(date) as attendance_date')
                ->selectRaw("SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) as hadir")
                ->selectRaw("SUM(CASE WHEN status IN ('izin', 'sakit', 'alfa') THEN 1 ELSE 0 END) as tidak_hadir")
                ->groupByRaw('DATE(date)')
                ->get()
                ->groupBy(fn ($row) => \Carbon\Carbon::parse($row->attendance_date)->startOfWeek()->toDateString());

            return collect(range(0, $weeks - 1))->map(function (int $offset) use ($start, $dailyRows) {
                $weekStart = $start->copy()->addWeeks($offset)->startOfWeek();
                $weekEnd = $weekStart->copy()->addDays(5);
                $rows = $dailyRows->get($weekStart->toDateString(), collect());
                $days = max($rows->count(), 1);
                $hadir = (int) round($rows->sum('hadir') / $days);
                $tidakHadir = (int) round($rows->sum('tidak_hadir') / $days);
                $total = $hadir + $tidakHadir;
                $weekNumber = (int) $weekStart->format('W');

                return [
                    'week' => $weekStart->format('o-\WW'),
                    'week_number' => $weekNumber,
                    'label' => 'W'.$weekNumber."\n".$weekStart->translatedFormat('d M'),
                    'start_date' => $weekStart->toDateString(),
                    'end_date' => $weekEnd->toDateString(),
                    'range' => $weekStart->translatedFormat('d M').' - '.$weekEnd->translatedFormat('d M'),
                    'hadir' => $hadir,
                    'tidak_hadir' => $tidakHadir,
                    'total' => $total,
                    'ratio' => $total > 0 ? round(($hadir / $total) * 100) : 0,
                ];
            })->values();
        };

        $montessoriSummary = function () {
            $activeStudentCount = Student::where('status', 'active')->count();
            $masteredByArea = StudentMilestone::query()
                ->join('students', 'student_milestones.student_id', '=', 'students.id')
                ->join('montessori_milestones', 'student_milestones.milestone_id', '=', 'montessori_milestones.id')
                ->where('students.status', 'active')
                ->where('student_milestones.status', 'mastered')
                ->select('montessori_milestones.area_id')
                ->selectRaw('COUNT(*) as mastered')
                ->groupBy('montessori_milestones.area_id')
                ->pluck('mastered', 'area_id');

            return MontessoriArea::query()
                ->withCount('milestones')
                ->orderBy('sort_order')
                ->get()
                ->map(function (MontessoriArea $area) use ($activeStudentCount, $masteredByArea) {
                    $total = (int) $area->milestones_count * $activeStudentCount;
                    $mastered = (int) ($masteredByArea[$area->id] ?? 0);

                    return [
                        'area' => $area->name,
                        'name' => $area->name,
                        'mastered' => $mastered,
                        'total' => $total,
                        'pct' => $total > 0 ? round(($mastered / $total) * 100, 1) : 0,
                    ];
                })
                ->values();
        };

        $hafalanSummary = function () {
            $activeStudentCount = Student::where('status', 'active')->count();
            $surahCount = \App\Models\HafalanSurah::count();
            $totalPossible = $activeStudentCount * $surahCount;
            $statusCounts = StudentHafalan::query()
                ->join('students', 'student_hafalan.student_id', '=', 'students.id')
                ->where('students.status', 'active')
                ->select('student_hafalan.status')
                ->selectRaw('COUNT(*) as total')
                ->groupBy('student_hafalan.status')
                ->pluck('total', 'status');

            $rows = collect([
                ['status' => 'mutqin', 'label' => 'Mutqin', 'total' => (int) ($statusCounts['mutqin'] ?? 0)],
                ['status' => 'lancar', 'label' => 'Lancar', 'total' => (int) ($statusCounts['lancar'] ?? 0)],
                ['status' => 'sedang_dihafal', 'label' => 'Sedang Dihafal', 'total' => (int) ($statusCounts['sedang_dihafal'] ?? 0)],
            ]);
            $activeTracked = (int) $rows->sum('total');
            $rows->push([
                'status' => 'belum',
                'label' => 'Belum Mulai',
                'total' => max($totalPossible - $activeTracked, (int) ($statusCounts['belum'] ?? 0)),
            ]);
            $total = max((int) $rows->sum('total'), 1);

            return $rows->map(fn (array $row) => [
                ...$row,
                'pct' => round(($row['total'] / $total) * 100),
            ])->values();
        };

        $classCapacity = function () {
            return SchoolClass::query()
                ->withCount(['students as students_count' => fn ($query) => $query
                    ->where('students.status', 'active')])
                ->orderBy('level')
                ->orderBy('name')
                ->get(['id', 'name', 'level', 'capacity']);
        };

        $dashboardActionItems = function (string $today) {
            $activeYear = AcademicYear::where('is_active', true)->first();
            $activeStudents = Student::where('status', 'active')->count();
            $journalsToday = Journal::whereDate('date', $today)->count();

            return [
                'absence_pending' => AbsenceRequest::where('status', 'pending')->count(),
                'fees_unpaid' => StudentFee::whereIn('status', ['unpaid', 'partial'])->count(),
                'ppdb_pending' => Registration::where('status', 'pending')->count(),
                'reports_unpublished' => Report::whereNull('published_at')
                    ->when($activeYear, fn ($query) => $query->where('academic_year_id', $activeYear->id))
                    ->count(),
                'journals_missing_today' => max($activeStudents - $journalsToday, 0),
            ];
        };

        Route::get('/dashboard', function (Request $request) use ($attendanceByClass, $weeklyAttendanceTrend, $montessoriSummary, $hafalanSummary, $classCapacity, $dashboardActionItems) {
            $today = now()->toDateString();
            $weekStart = now()->startOfWeek()->toDateString();
            $weekEnd = now()->startOfWeek()->addDays(5)->toDateString();
            $user = $request->user()->loadMissing('roles');
            $cacheKey = 'dashboard:v5:'.$today.':'.$user->id;

            $payload = Cache::remember($cacheKey, now()->addSeconds(30), function () use ($today, $weekStart, $weekEnd, $attendanceByClass, $weeklyAttendanceTrend, $montessoriSummary, $hafalanSummary, $classCapacity, $dashboardActionItems, $user) {
                $todayAttendance = Attendance::query()
                    ->whereDate('date', $today)
                    ->selectRaw("
                        sum(case when status = 'hadir' then 1 else 0 end) as present_today,
                        sum(case when status in ('izin', 'sakit', 'alfa') then 1 else 0 end) as absent_today
                    ")
                    ->first();

                $weeklyAttendance = Attendance::query()
                    ->whereBetween('date', [$weekStart.' 00:00:00', $weekEnd.' 23:59:59'])
                    ->selectRaw("
                        DATE(date) as attendance_date,
                        sum(case when status = 'hadir' then 1 else 0 end) as hadir,
                        sum(case when status in ('izin', 'sakit', 'alfa') then 1 else 0 end) as tidak_hadir
                    ")
                    ->groupByRaw('DATE(date)')
                    ->get()
                    ->keyBy('attendance_date');

                $week = collect(range(0, 5))->map(function (int $offset) use ($weeklyAttendance) {
                    $date = now()->startOfWeek()->addDays($offset);
                    $row = $weeklyAttendance->get($date->toDateString());

                    return [
                        'day' => $date->locale('id')->translatedFormat('l'),
                        'hadir' => (int) ($row?->hadir ?? 0),
                        'tidak_hadir' => (int) ($row?->tidak_hadir ?? 0),
                    ];
                });

                $attendanceTrend = $weeklyAttendanceTrend(8);

                $attendanceDistribution = Attendance::whereMonth('date', now()->month)
                    ->whereYear('date', now()->year)
                    ->selectRaw('status, COUNT(*) as total')
                    ->groupBy('status')
                    ->get();

                $milestoneProgress = $montessoriSummary();

                $feeCollection = StudentFee::where('year', now()->year)
                    ->select('month')
                    ->selectRaw('SUM(total_billed) as target')
                    ->selectRaw('SUM(paid_amount) as paid')
                    ->groupBy('month')
                    ->orderBy('month')
                    ->get();

                $hafalanProgress = $hafalanSummary();

                $studentsPerClass = $classCapacity();
                $canSeeAbsenceRequests = $user->hasAnyRole(['super_admin', 'kepala_sekolah', 'admin', 'guru']);
                $todayAbsenceRequests = $canSeeAbsenceRequests
                    ? AbsenceRequest::with(['student.classes', 'requester'])
                        ->whereDate('date', $today)
                        ->when($user->hasRole('guru') && ! $user->hasAnyRole(['super_admin', 'kepala_sekolah', 'admin']), fn ($query) => $query->whereHas('student.classes', fn ($classQuery) => $classQuery->where('classes.teacher_id', $user->id)))
                        ->latest('id')
                        ->limit(8)
                        ->get()
                    : collect();

                $currentFeeQuery = StudentFee::where('month', now()->month)->where('year', now()->year);
                $financeTarget = (int) (clone $currentFeeQuery)->sum('total_billed');
                $financePaid = (int) (clone $currentFeeQuery)->sum('paid_amount');
                $financeOverdueQuery = (clone $currentFeeQuery)->whereIn('status', ['unpaid', 'partial'])->whereDate('due_date', '<', now()->toDateString());
                $enrollmentYear = AcademicYear::where('name', '2026/2027')->first()
                    ?? AcademicYear::where('is_active', true)->first()
                    ?? AcademicYear::latest('id')->first();
                $enrollmentRows = EnrollmentUpdate::query()
                    ->whereIn('category', EnrollmentUpdate::FINANCIAL_CATEGORIES)
                    ->when($enrollmentYear, fn ($query) => $query->where('academic_year_id', $enrollmentYear->id))
                    ->get();
                $enrollmentTarget = (int) $enrollmentRows->sum(fn (EnrollmentUpdate $row) => max((int) ($row->target_amount ?? 0), (int) $row->paid_amount));
                $enrollmentPaid = (int) $enrollmentRows->sum('paid_amount');
                $payrollRows = TeacherPayroll::where('month', now()->month)->where('year', now()->year)->get();
                $payrollTarget = (int) $payrollRows->sum('total_amount');
                $payrollPaid = (int) $payrollRows->where('status', 'paid')->sum('total_amount');
                $financeEntries = FinanceEntry::whereMonth('entry_date', now()->month)->whereYear('entry_date', now()->year)->get();
                $manualIncome = (int) $financeEntries->where('type', 'income')->sum('amount');
                $manualExpense = (int) $financeEntries->where('type', 'expense')->sum('amount');
                $operationalExpense = (int) $financeEntries->where('type', 'expense')->where('category', 'operational')->sum('amount');
                $financeBreakdown = collect([
                    ['label' => 'SPP', 'type' => 'income', 'target' => $financeTarget, 'paid' => $financePaid, 'outstanding' => max($financeTarget - $financePaid, 0)],
                    ['label' => 'Uang Pendaftaran', 'type' => 'income', 'target' => $enrollmentTarget, 'paid' => $enrollmentPaid, 'outstanding' => max($enrollmentTarget - $enrollmentPaid, 0)],
                    ['label' => 'Gaji Guru', 'type' => 'expense', 'target' => $payrollTarget, 'paid' => $payrollPaid, 'outstanding' => max($payrollTarget - $payrollPaid, 0)],
                    ['label' => 'Operasional', 'type' => 'expense', 'target' => $operationalExpense, 'paid' => $operationalExpense, 'outstanding' => 0],
                    ['label' => 'Kas Manual', 'type' => 'expense', 'target' => $manualExpense, 'paid' => $manualExpense, 'outstanding' => 0],
                ]);

                return [
                    'total_active_students' => Student::where('status', 'active')->count(),
                    'present_today' => (int) ($todayAttendance?->present_today ?? 0),
                    'absent_today' => (int) ($todayAttendance?->absent_today ?? 0),
                    'total_classes' => SchoolClass::count(),
                    'journals_today' => Journal::where('date', $today)->count(),
                    'pending_registrations' => Registration::where('status', 'pending')->count(),
                    'attendance_by_class' => $attendanceByClass($today),
                    'today_absence_requests' => $todayAbsenceRequests,
                    'upcoming_agendas' => SchoolAgenda::whereBetween('start_date', [$today, now()->addDays(14)->toDateString()])->orderBy('start_date')->limit(6)->get(),
                    'recent_announcements' => Announcement::whereNotNull('published_at')->latest('published_at')->limit(3)->get(),
                    'attendance_this_week' => $week,
                    'action_items' => $dashboardActionItems($today),
                    'finance_summary' => [
                        'target' => $financeTarget + $enrollmentTarget + $manualIncome,
                        'paid' => $financePaid + $enrollmentPaid + $manualIncome,
                        'outstanding' => max($financeTarget - $financePaid, 0) + max($enrollmentTarget - $enrollmentPaid, 0),
                        'cash_in' => $financePaid + $enrollmentPaid + $manualIncome,
                        'cash_out' => $payrollPaid + $manualExpense,
                        'net_cash' => ($financePaid + $enrollmentPaid + $manualIncome) - ($payrollPaid + $manualExpense),
                        'planned_expense' => $payrollTarget + $manualExpense,
                        'overdue_count' => (clone $financeOverdueQuery)->count(),
                        'partial_count' => (clone $currentFeeQuery)->where('status', 'partial')->count(),
                        'unpaid_count' => (clone $currentFeeQuery)->where('status', 'unpaid')->count(),
                        'paid_count' => (clone $currentFeeQuery)->where('status', 'paid')->count(),
                        'categories' => $financeBreakdown,
                    ],
                    'analytics' => [
                        'attendance_trend' => $attendanceTrend,
                        'attendance_distribution' => $attendanceDistribution,
                        'milestone_progress' => $milestoneProgress,
                        'hafalan_progress' => $hafalanProgress,
                        'fee_collection' => $feeCollection,
                        'finance_breakdown' => $financeBreakdown,
                        'students_per_class' => $studentsPerClass,
                    ],
                ];
            });

            return ApiResponse::success($payload, 'Dashboard berhasil diambil.');
        })->middleware('permission:view_dashboard');

        Route::get('/dashboard/action-items', function () use ($dashboardActionItems) {
            return ApiResponse::success($dashboardActionItems(now()->toDateString()), 'Item dashboard berhasil diambil.');
        })->middleware('permission:view_dashboard');

        Route::get('/academic-years', fn () => ApiResponse::success(AcademicYear::orderByDesc('start_date')->get(), 'Tahun ajaran berhasil diambil.'));

        Route::post('/academic-years', function (Request $request) {
            $data = $request->validate([
                'name' => ['required', 'string', 'max:50'],
                'startDate' => ['required', 'date'],
                'endDate' => ['required', 'date', 'after:startDate'],
                'isActive' => ['boolean'],
            ]);

            if ($data['isActive'] ?? false) {
                AcademicYear::query()->update(['is_active' => false]);
            }

            $year = AcademicYear::create([
                'name' => $data['name'],
                'start_date' => $data['startDate'],
                'end_date' => $data['endDate'],
                'is_active' => $data['isActive'] ?? false,
            ]);

            return ApiResponse::success($year, 'Tahun ajaran berhasil dibuat.', [], 201);
        })->middleware('permission:manage_classes');

        Route::put('/academic-years/{id}', function (Request $request, int $id) {
            $year = AcademicYear::findOrFail($id);
            $data = $request->validate([
                'name' => ['required', 'string', 'max:50'],
                'startDate' => ['required', 'date'],
                'endDate' => ['required', 'date', 'after:startDate'],
                'isActive' => ['boolean'],
            ]);

            if ($data['isActive'] ?? false) {
                AcademicYear::whereKeyNot($year->id)->update(['is_active' => false]);
            }

            $year->update([
                'name' => $data['name'],
                'start_date' => $data['startDate'],
                'end_date' => $data['endDate'],
                'is_active' => $data['isActive'] ?? $year->is_active,
            ]);

            return ApiResponse::success($year, 'Tahun ajaran berhasil diperbarui.');
        })->middleware('permission:manage_classes');

        Route::put('/academic-years/{id}/activate', function (int $id) {
            AcademicYear::query()->update(['is_active' => false]);
            $year = AcademicYear::findOrFail($id);
            $year->update(['is_active' => true]);

            return ApiResponse::success($year, 'Tahun ajaran berhasil diaktifkan.');
        })->middleware('permission:manage_classes');

        Route::delete('/academic-years/{id}', function (int $id) {
            $year = AcademicYear::findOrFail($id);

            if ($year->is_active) {
                return ApiResponse::error('Tahun ajaran aktif tidak bisa dihapus.', [], 422);
            }

            $year->delete();

            return ApiResponse::success(null, 'Tahun ajaran berhasil dihapus.');
        })->middleware('role:super_admin');

        Route::get('/classes', function (Request $request) use ($perPage) {
            $query = SchoolClass::with(['academicYear', 'teacher'])->withCount('students')->latest('id');

            if ($request->filled('level')) {
                $query->where('level', $request->string('level'));
            }

            return ApiResponse::fromPaginator($query->paginate($perPage($request)), 'Kelas berhasil diambil.');
        });

        Route::post('/classes', function (Request $request) {
            $data = $request->validate([
                'academicYearId' => ['required', 'exists:academic_years,id'],
                'teacherId' => ['nullable', 'exists:users,id'],
                'name' => ['required', 'string', 'max:120'],
                'level' => ['required', Rule::in(['KB', 'TK A', 'TK B', 'TK C'])],
                'capacity' => ['required', 'integer', 'min:1', 'max:60'],
            ]);

            $class = SchoolClass::create([
                'academic_year_id' => $data['academicYearId'],
                'teacher_id' => $data['teacherId'] ?? null,
                'name' => $data['name'],
                'level' => $data['level'],
                'capacity' => $data['capacity'],
            ]);

            return ApiResponse::success($class->load(['academicYear', 'teacher']), 'Kelas berhasil dibuat.', [], 201);
        })->middleware('permission:manage_classes');

        Route::get('/classes/{id}', fn (int $id) => ApiResponse::success(SchoolClass::with(['academicYear', 'teacher'])->findOrFail($id), 'Kelas berhasil diambil.'));

        Route::put('/classes/{id}', function (Request $request, int $id) {
            $class = SchoolClass::findOrFail($id);
            $data = $request->validate([
                'academicYearId' => ['required', 'exists:academic_years,id'],
                'teacherId' => ['nullable', 'exists:users,id'],
                'name' => ['required', 'string', 'max:120'],
                'level' => ['required', Rule::in(['KB', 'TK A', 'TK B', 'TK C'])],
                'capacity' => ['required', 'integer', 'min:1', 'max:60'],
            ]);

            $class->update([
                'academic_year_id' => $data['academicYearId'],
                'teacher_id' => $data['teacherId'] ?? null,
                'name' => $data['name'],
                'level' => $data['level'],
                'capacity' => $data['capacity'],
            ]);

            return ApiResponse::success($class->fresh(['academicYear', 'teacher']), 'Kelas berhasil diperbarui.');
        })->middleware('permission:manage_classes');

        Route::get('/classes/{id}/students', fn (int $id) => ApiResponse::success(SchoolClass::findOrFail($id)->students()->with('parents')->get(), 'Murid kelas berhasil diambil.'));

        Route::post('/classes/{id}/students', function (Request $request, int $id) {
            $class = SchoolClass::findOrFail($id);
            $data = $request->validate(['studentId' => ['required', 'exists:students,id']]);
            $student = Student::findOrFail($data['studentId']);

            DB::table('student_classes')->updateOrInsert(
                ['student_id' => $data['studentId'], 'academic_year_id' => $class->academic_year_id],
                ['class_id' => $class->id, 'program_type' => $student->program_type ?? 'regular', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            );

            return ApiResponse::success($class->students()->get(), 'Murid berhasil dimasukkan ke kelas.');
        })->middleware('permission:manage_classes');

        Route::get('/students', function (Request $request) use ($perPage) {
            $query = Student::with(['parents', 'classes.academicYear'])->latest('id');

            if ($request->filled('search')) {
                $search = $request->string('search');
                $query->where(fn ($q) => $q
                    ->where('full_name', 'like', "%$search%")
                    ->orWhere('nis', 'like', "%$search%")
                    ->orWhere('program_type', 'like', "%$search%"));
            }

            if ($request->filled('status')) {
                $query->where('status', $request->string('status'));
            }
            if ($request->filled('programType')) {
                $query->where('program_type', $request->string('programType'));
            }

            return ApiResponse::fromPaginator($query->paginate($perPage($request)), 'Murid berhasil diambil.');
        });

        Route::post('/students', function (Request $request) use ($activeYear, $forgetDashboard, $studentPrograms) {
            $data = $request->validate([
                'nis' => ['nullable', 'string', 'max:20', 'unique:students,nis'],
                'fullName' => ['required', 'string', 'max:150'],
                'nickname' => ['nullable', 'string', 'max:50'],
                'birthDate' => ['required', 'date'],
                'birthPlace' => ['nullable', 'string', 'max:100'],
                'gender' => ['required', Rule::in(['L', 'P'])],
                'address' => ['nullable', 'string'],
                'joinDate' => ['required', 'date'],
                'programType' => ['required', Rule::in($studentPrograms)],
                'status' => ['nullable', Rule::in(['active', 'inactive', 'alumni'])],
                'classId' => ['nullable', 'exists:classes,id'],
                'parentName' => ['nullable', 'string', 'max:150'],
                'parentEmail' => ['nullable', 'email', 'max:150'],
                'parentPhone' => ['nullable', 'string', 'max:20'],
                'parentRelation' => ['nullable', Rule::in(['ayah', 'ibu', 'wali'])],
            ]);

            $student = Student::create([
                'nis' => $data['nis'] ?? null,
                'full_name' => $data['fullName'],
                'nickname' => $data['nickname'] ?? null,
                'birth_date' => $data['birthDate'],
                'birth_place' => $data['birthPlace'] ?? null,
                'gender' => $data['gender'],
                'address' => $data['address'] ?? null,
                'join_date' => $data['joinDate'],
                'program_type' => $data['programType'],
                'status' => $data['status'] ?? 'active',
            ]);

            if (! empty($data['parentEmail'])) {
                $parent = User::firstOrCreate(
                    ['email' => $data['parentEmail']],
                    ['name' => $data['parentName'] ?? $data['parentEmail'], 'phone' => $data['parentPhone'] ?? null, 'password' => str()->password(16), 'is_active' => true],
                );
                $parent->assignRole('orang_tua');
                $student->parents()->syncWithoutDetaching([$parent->id => ['relation' => $data['parentRelation'] ?? 'wali', 'is_primary' => true]]);
            }

            if (! empty($data['classId'])) {
                $class = SchoolClass::findOrFail($data['classId']);
                DB::table('student_classes')->updateOrInsert(
                    ['student_id' => $student->id, 'academic_year_id' => $class->academic_year_id],
                    ['class_id' => $class->id, 'program_type' => $data['programType'], 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
                );
            } elseif ($year = $activeYear()) {
                DB::table('student_classes')->where('student_id', $student->id)->where('academic_year_id', $year->id);
            }

            Log::info('Student created', ['student_id' => $student->id, 'user_id' => request()->user()->id]);
            $forgetDashboard();

            return ApiResponse::success($student->fresh(['parents', 'classes']), 'Murid berhasil dibuat.', [], 201);
        })->middleware('permission:add_students');

        Route::get('/students/{student}', fn (Student $student) => ApiResponse::success($student->load(['parents', 'classes.academicYear', 'attendances']), 'Murid berhasil diambil.'));

        Route::post('/students/{student}/photo', function (Request $request, Student $student) use ($upload) {
            $data = $request->validate([
                'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
                'photoUrl' => ['nullable', 'url'],
            ]);

            abort_if(! $request->hasFile('photo') && empty($data['photoUrl']), 422, 'Upload foto atau isi URL foto.');

            $photoUrl = $data['photoUrl'] ?? $student->photo_url;
            if ($request->hasFile('photo')) {
                $photoUrl = $upload($request->file('photo'), 'students/'.$student->id);
            }

            $student->update(['photo_url' => $photoUrl]);

            return ApiResponse::success($student->fresh(['parents', 'classes']), 'Foto murid berhasil diperbarui.');
        })->middleware('permission:edit_students|update_student_milestones|update_student_hafalan');

        Route::put('/students/{student}', function (Request $request, Student $student) use ($activeYear, $forgetDashboard, $studentPrograms) {
            $data = $request->validate([
                'nis' => ['nullable', 'string', 'max:20', Rule::unique('students', 'nis')->ignore($student->id)],
                'fullName' => ['required', 'string', 'max:150'],
                'nickname' => ['nullable', 'string', 'max:50'],
                'birthDate' => ['required', 'date'],
                'birthPlace' => ['nullable', 'string', 'max:100'],
                'gender' => ['required', Rule::in(['L', 'P'])],
                'address' => ['nullable', 'string'],
                'joinDate' => ['required', 'date'],
                'programType' => ['required', Rule::in($studentPrograms)],
                'status' => ['required', Rule::in(['active', 'inactive', 'alumni'])],
                'classId' => ['nullable', 'exists:classes,id'],
            ]);

            $student->update([
                'nis' => $data['nis'] ?? null,
                'full_name' => $data['fullName'],
                'nickname' => $data['nickname'] ?? null,
                'birth_date' => $data['birthDate'],
                'birth_place' => $data['birthPlace'] ?? null,
                'gender' => $data['gender'],
                'address' => $data['address'] ?? null,
                'join_date' => $data['joinDate'],
                'program_type' => $data['programType'],
                'status' => $data['status'],
            ]);

            if (! empty($data['classId'])) {
                $class = SchoolClass::findOrFail($data['classId']);
                DB::table('student_classes')->updateOrInsert(
                    ['student_id' => $student->id, 'academic_year_id' => $class->academic_year_id ?? $activeYear()?->id],
                    ['class_id' => $class->id, 'program_type' => $data['programType'], 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
                );
            }

            Log::info('Student updated', ['student_id' => $student->id, 'user_id' => request()->user()->id]);
            $forgetDashboard();

            return ApiResponse::success($student->fresh(['parents', 'classes']), 'Murid berhasil diperbarui.');
        })->middleware('permission:edit_students');

        Route::delete('/students/{student}', function (Student $student) use ($forgetDashboard) {
            Registration::where('converted_student_id', $student->id)->update(['converted_student_id' => null]);
            $student->delete();

            Log::info('Student deleted', ['student_id' => $student->id, 'user_id' => request()->user()->id]);
            $forgetDashboard();

            return ApiResponse::success(null, 'Murid berhasil dihapus.');
        })->middleware('permission:edit_students');

        Route::get('/users', function (Request $request) use ($perPage) {
            return ApiResponse::fromPaginator(User::with('roles')->latest('id')->paginate($perPage($request)), 'Pengguna berhasil diambil.');
        })->middleware('permission:manage_users');

        Route::post('/users', function (Request $request) {
            $data = $request->validate([
                'name' => ['required', 'string', 'max:150'],
                'email' => ['required', 'email', 'unique:users,email'],
                'phone' => ['nullable', 'string', 'max:20'],
                'password' => ['required', 'string', 'min:8'],
                'role' => ['required', Rule::in(['super_admin', 'kepala_sekolah', 'admin', 'guru', 'orang_tua'])],
            ]);

            $user = User::create($data);
            $user->syncRoles([$data['role']]);

            return ApiResponse::success($user->load('roles'), 'Pengguna berhasil dibuat.', [], 201);
        })->middleware('permission:manage_users');

        Route::put('/users/{user}', function (Request $request, User $user) {
            $data = $request->validate([
                'name' => ['required', 'string', 'max:150'],
                'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
                'phone' => ['nullable', 'string', 'max:20'],
                'password' => ['nullable', 'string', 'min:8'],
                'role' => ['required', Rule::in(['super_admin', 'kepala_sekolah', 'admin', 'guru', 'orang_tua'])],
                'isActive' => ['boolean'],
            ]);

            $payload = [
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'is_active' => $data['isActive'] ?? $user->is_active,
            ];

            if (! empty($data['password'])) {
                $payload['password'] = $data['password'];
            }

            $user->update($payload);
            $user->syncRoles([$data['role']]);

            return ApiResponse::success($user->fresh('roles'), 'Pengguna berhasil diperbarui.');
        })->middleware('permission:manage_users');

        Route::put('/users/{user}/toggle-active', function (User $user) {
            $user->update(['is_active' => ! $user->is_active]);

            return ApiResponse::success($user, 'Status pengguna berhasil diperbarui.');
        })->middleware('permission:manage_users');

        Route::delete('/users/{user}', function (Request $request, User $user) {
            if ($request->user()->is($user)) {
                return ApiResponse::error('Akun yang sedang dipakai tidak bisa dihapus.', [], 422);
            }

            try {
                $user->tokens()->delete();
                $user->syncRoles([]);
                $user->delete();
            } catch (\Throwable) {
                return ApiResponse::error('Pengguna masih punya data aktivitas. Nonaktifkan jika belum bisa dihapus.', [], 409);
            }

            return ApiResponse::success(null, 'Pengguna berhasil dihapus.');
        })->middleware('permission:manage_users');

        Route::get('/users/{user}/children', fn (User $user) => ApiResponse::success($user->children()->with('classes')->get(), 'Data anak berhasil diambil.'));

        Route::get('/roles', function () {
            return ApiResponse::success([
                'roles' => \Spatie\Permission\Models\Role::with('permissions')->orderBy('name')->get(),
                'permissions' => \Spatie\Permission\Models\Permission::orderBy('name')->get(),
            ], 'Role dan permission berhasil diambil.');
        })->middleware('permission:manage_users');

        Route::put('/roles/{role}', function (Request $request, \Spatie\Permission\Models\Role $role) {
            abort_if($role->name === 'super_admin', 422, 'Permission super admin selalu penuh.');
            $data = $request->validate([
                'permissions' => ['required', 'array'],
                'permissions.*' => ['string', 'exists:permissions,name'],
            ]);

            $role->syncPermissions($data['permissions']);

            return ApiResponse::success($role->fresh('permissions'), 'Permission role berhasil diperbarui.');
        })->middleware('permission:manage_users');

        Route::get('/attendance', function (Request $request) use ($perPage, $attendanceByClass) {
            if ($request->filled('date') && $request->input('date') !== 'today') {
                $request->validate(['date' => ['date', 'before_or_equal:today']]);
            }

            if ($request->input('group_by') === 'class') {
                $date = $request->input('date') === 'today'
                    ? now()->toDateString()
                    : ($request->filled('date') ? $request->date('date')->toDateString() : now()->toDateString());

                return ApiResponse::success($attendanceByClass($date), 'Rekap absensi per kelas berhasil diambil.');
            }

            $query = Attendance::with(['student', 'class'])->latest('date');

            if ($request->filled('classId')) {
                $query->where('class_id', $request->integer('classId'));
            }
            if ($request->filled('studentId')) {
                $query->where('student_id', $request->integer('studentId'));
            }
            if ($request->filled('date')) {
                $query->whereDate('date', $request->date('date')->toDateString());
            }

            return ApiResponse::fromPaginator($query->paginate($perPage($request)), 'Absensi berhasil diambil.');
        });

        Route::post('/attendance/batch', function (Request $request) use ($forgetDashboard) {
            $data = $request->validate([
                'classId' => ['nullable', 'exists:classes,id'],
                'date' => ['required', 'date', 'before_or_equal:today'],
                'records' => ['required', 'array', 'min:1'],
                'records.*.studentId' => ['required', 'exists:students,id'],
                'records.*.classId' => ['nullable', 'exists:classes,id'],
                'records.*.status' => ['required', Rule::in(['hadir', 'izin', 'sakit', 'alfa'])],
                'records.*.notes' => ['nullable', 'string'],
                'records.*.checkInTime' => ['nullable', 'date_format:H:i'],
            ]);

            $attendanceDate = $request->date('date')->startOfDay();
            $records = collect($data['records'])->unique('studentId')->values();
            $studentsById = Student::with('classes')->whereIn('id', $records->pluck('studentId'))->get()->keyBy('id');
            $items = $records->map(function (array $record) use ($attendanceDate, $data, $request, $studentsById) {
                $student = $studentsById->get($record['studentId']);
                $classId = $record['classId'] ?? $data['classId'] ?? $student?->active_class?->id;
                abort_unless($classId, 422, 'Kelas aktif murid belum tersedia.');

                return Attendance::updateOrCreate(
                    ['student_id' => $record['studentId'], 'date' => $attendanceDate],
                    [
                        'class_id' => $classId,
                        'status' => $record['status'],
                        'notes' => $record['notes'] ?? null,
                        'check_in_time' => $record['checkInTime'] ?? null,
                        'recorded_by' => $request->user()->id,
                    ],
                );
            });
            $forgetDashboard();

            return ApiResponse::success($items, 'Absensi berhasil disimpan.');
        })->middleware('permission:manage_attendance');

        Route::put('/attendance/{attendance}', function (Request $request, Attendance $attendance) use ($forgetDashboard) {
            $data = $request->validate([
                'status' => ['required', Rule::in(['hadir', 'izin', 'sakit', 'alfa'])],
                'notes' => ['nullable', 'string'],
                'checkInTime' => ['nullable', 'date_format:H:i'],
            ]);

            $attendance->update([
                'status' => $data['status'],
                'notes' => $data['notes'] ?? null,
                'check_in_time' => $data['checkInTime'] ?? null,
                'recorded_by' => $request->user()->id,
            ]);
            $forgetDashboard();

            return ApiResponse::success($attendance, 'Absensi berhasil diperbarui.');
        })->middleware('permission:manage_attendance');

        Route::delete('/attendance/{attendance}', function (Attendance $attendance) use ($forgetDashboard) {
            $attendance->delete();
            $forgetDashboard();

            return ApiResponse::success(null, 'Absensi berhasil dihapus.');
        })->middleware('permission:manage_attendance');

        Route::get('/attendance/summary', function (Request $request) use ($weeklyAttendanceTrend) {
            if ($request->filled('weeks')) {
                return ApiResponse::success($weeklyAttendanceTrend($request->integer('weeks', 8)), 'Tren absensi mingguan berhasil diambil.');
            }

            $data = $request->validate([
                'classId' => ['nullable', 'exists:classes,id'],
                'month' => ['required', 'integer', 'min:1', 'max:12'],
                'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            ]);

            $query = Attendance::query()
                ->whereYear('date', $data['year'])
                ->whereMonth('date', $data['month']);

            if (! empty($data['classId'])) {
                $query->where('class_id', $data['classId']);
            }

            return ApiResponse::success($query->select('status', DB::raw('count(*) as total'))->groupBy('status')->get(), 'Rekap absensi berhasil diambil.');
        });

        Route::get('/attendance/export', function (Request $request) {
            $data = $request->validate([
                'classId' => ['required', 'exists:classes,id'],
                'month' => ['required', 'integer', 'min:1', 'max:12'],
                'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            ]);

            $rows = Attendance::with('student')
                ->where('class_id', $data['classId'])
                ->whereYear('date', $data['year'])
                ->whereMonth('date', $data['month'])
                ->orderBy('date')
                ->get()
                ->map(fn (Attendance $attendance) => implode(',', [$attendance->student?->full_name, $attendance->date->toDateString(), strtoupper(substr($attendance->status, 0, 1)), $attendance->notes]));

            $path = 'exports/attendance-'.$data['year'].'-'.$data['month'].'-class-'.$data['classId'].'.csv';
            Storage::disk('public')->put($path, "Nama,Tanggal,Status,Catatan\n".$rows->implode("\n"));

            return ApiResponse::success(['exportUrl' => url('/storage/'.$path)], 'Export absensi berhasil dibuat.');
        });

        Route::get('/journals', function (Request $request) use ($perPage) {
            if ($request->filled('date')) {
                $request->validate(['date' => ['date', 'before_or_equal:today']]);
            }

            $query = Journal::with(['student', 'class', 'teacher'])->latest('date');

            if ($request->filled('studentId')) {
                $query->where('student_id', $request->integer('studentId'));
            }
            if ($request->filled('classId')) {
                $query->where('class_id', $request->integer('classId'));
            }
            if ($request->filled('date')) {
                $query->where('date', $request->date('date')->toDateString());
            }

            return ApiResponse::fromPaginator($query->paginate($perPage($request)), 'Jurnal berhasil diambil.');
        });

        Route::post('/journals', function (Request $request) use ($upload, $forgetDashboard) {
            $data = $request->validate([
                'studentId' => ['required', 'exists:students,id'],
                'classId' => ['required', 'exists:classes,id'],
                'date' => ['required', 'date', 'before_or_equal:today'],
                'content' => ['required', 'string'],
                'mood' => ['nullable', Rule::in(['happy', 'neutral', 'sad', 'energetic', 'tired'])],
                'activities' => ['nullable', 'array'],
                'photos.*' => ['nullable', 'file', 'max:5120'],
                'isPublished' => ['boolean'],
            ]);

            $photos = [];
            foreach ($request->file('photos', []) as $file) {
                $photos[] = $upload($file, 'journals/'.$data['studentId']);
            }

            $journal = Journal::updateOrCreate(
                ['student_id' => $data['studentId'], 'date' => $data['date']],
                [
                    'class_id' => $data['classId'],
                    'teacher_id' => $request->user()->id,
                    'content' => $data['content'],
                    'mood' => $data['mood'] ?? null,
                    'activities' => $data['activities'] ?? [],
                    'photo_urls' => $photos,
                    'is_published' => $data['isPublished'] ?? true,
                ],
            );
            $forgetDashboard();

            return ApiResponse::success($journal->load(['student', 'class']), 'Jurnal berhasil disimpan.', [], 201);
        })->middleware('permission:manage_journals');

        Route::get('/journals/{journal}', fn (Journal $journal) => ApiResponse::success($journal->load(['student', 'class', 'teacher']), 'Jurnal berhasil diambil.'));

        Route::put('/journals/{journal}', function (Request $request, Journal $journal) {
            $data = $request->validate([
                'content' => ['required', 'string'],
                'mood' => ['nullable', Rule::in(['happy', 'neutral', 'sad', 'energetic', 'tired'])],
                'activities' => ['nullable', 'array'],
                'isPublished' => ['boolean'],
            ]);

            $journal->update([
                'content' => $data['content'],
                'mood' => $data['mood'] ?? null,
                'activities' => $data['activities'] ?? [],
                'is_published' => $data['isPublished'] ?? $journal->is_published,
            ]);

            return ApiResponse::success($journal, 'Jurnal berhasil diperbarui.');
        })->middleware('permission:manage_journals');

        Route::delete('/journals/{journal}', function (Journal $journal) use ($forgetDashboard) {
            $journal->delete();
            $forgetDashboard();

            return ApiResponse::success(null, 'Jurnal berhasil dihapus.');
        })->middleware('permission:manage_journals');

        Route::post('/journals/{journal}/photos', function (Request $request, Journal $journal) use ($upload) {
            $request->validate(['photos.*' => ['required', 'file', 'max:5120']]);
            $photos = $journal->photo_urls ?? [];

            foreach ($request->file('photos', []) as $file) {
                $photos[] = $upload($file, 'journals/'.$journal->student_id);
            }

            $journal->update(['photo_urls' => $photos]);

            return ApiResponse::success($journal, 'Foto jurnal berhasil diunggah.');
        })->middleware('permission:manage_journals');

        Route::get('/montessori/summary', fn () => ApiResponse::success($montessoriSummary(), 'Ringkasan Montessori berhasil diambil.'))->middleware('permission:view_dashboard|view_analytics');

        Route::get('/montessori/areas', fn () => ApiResponse::success(MontessoriArea::with('milestones')->orderBy('sort_order')->get(), 'Area Montessori berhasil diambil.'));

        Route::get('/montessori/milestones', function (Request $request) {
            $query = MontessoriMilestone::with('area')->orderBy('sort_order');

            if ($request->filled('areaId')) {
                $query->where('area_id', $request->integer('areaId'));
            }
            if ($request->filled('level')) {
                $query->where('level', $request->string('level'));
            }

            return ApiResponse::success($query->get(), 'Milestone berhasil diambil.');
        });

        Route::post('/montessori/milestones', function (Request $request) {
            $data = $request->validate([
                'areaId' => ['required', 'exists:montessori_areas,id'],
                'name' => ['required', 'string', 'max:180'],
                'description' => ['nullable', 'string'],
                'ageMinMonths' => ['nullable', 'integer', 'min:0'],
                'ageMaxMonths' => ['nullable', 'integer', 'min:0'],
                'level' => ['nullable', Rule::in(['KB', 'TK A', 'TK B', 'TK C'])],
                'sortOrder' => ['nullable', 'integer'],
            ]);

            $milestone = MontessoriMilestone::create([
                'area_id' => $data['areaId'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'age_min_months' => $data['ageMinMonths'] ?? null,
                'age_max_months' => $data['ageMaxMonths'] ?? null,
                'level' => $data['level'] ?? null,
                'sort_order' => $data['sortOrder'] ?? 0,
            ]);

            return ApiResponse::success($milestone, 'Milestone berhasil dibuat.', [], 201);
        })->middleware('permission:manage_milestone_definitions');

        Route::put('/montessori/milestones/{milestone}', function (Request $request, MontessoriMilestone $milestone) {
            $data = $request->validate([
                'areaId' => ['required', 'exists:montessori_areas,id'],
                'name' => ['required', 'string', 'max:180'],
                'description' => ['nullable', 'string'],
                'ageMinMonths' => ['nullable', 'integer', 'min:0'],
                'ageMaxMonths' => ['nullable', 'integer', 'min:0'],
                'level' => ['nullable', Rule::in(['KB', 'TK A', 'TK B', 'TK C'])],
                'sortOrder' => ['nullable', 'integer'],
            ]);

            $milestone->update([
                'area_id' => $data['areaId'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'age_min_months' => $data['ageMinMonths'] ?? null,
                'age_max_months' => $data['ageMaxMonths'] ?? null,
                'level' => $data['level'] ?? null,
                'sort_order' => $data['sortOrder'] ?? 0,
            ]);

            return ApiResponse::success($milestone, 'Milestone berhasil diperbarui.');
        })->middleware('permission:manage_milestone_definitions');

        Route::delete('/montessori/milestones/{milestone}', fn (MontessoriMilestone $milestone) => tap($milestone)->delete() ? ApiResponse::success(null, 'Milestone berhasil dihapus.') : ApiResponse::error('Milestone gagal dihapus.'))->middleware('permission:manage_milestone_definitions');

        Route::get('/milestones/student/{student}', function (Student $student) {
            $areas = MontessoriArea::with(['milestones' => function ($query) use ($student) {
                $query->with(['area'])->with(['area'])->orderBy('sort_order');
            }])->orderBy('sort_order')->get();

            $studentStatuses = StudentMilestone::where('student_id', $student->id)->get()->keyBy('milestone_id');

            $payload = $areas->map(function (MontessoriArea $area) use ($studentStatuses) {
                $milestones = $area->milestones->map(function (MontessoriMilestone $milestone) use ($studentStatuses) {
                    $status = $studentStatuses->get($milestone->id);

                    return [
                        ...$milestone->toArray(),
                        'student_status' => $status?->status ?? 'not_started',
                        'observation_notes' => $status?->observation_notes,
                        'observed_at' => $status?->observed_at,
                        'updated_at' => $status?->updated_at,
                    ];
                });

                return [
                    ...$area->toArray(),
                    'milestones' => $milestones,
                    'milestone_count' => $milestones->count(),
                    'mastered_count' => $milestones->where('student_status', 'mastered')->count(),
                ];
            });

            return ApiResponse::success($payload, 'Milestone murid berhasil diambil.');
        });

        Route::post('/milestones/student/{student}/update', function (Request $request, Student $student) {
            $data = $request->validate([
                'milestoneId' => ['required', 'exists:montessori_milestones,id'],
                'status' => ['required', Rule::in(['not_started', 'introduced', 'in_progress', 'mastered'])],
                'observationNotes' => ['nullable', 'string'],
                'observedAt' => ['nullable', 'date', 'before_or_equal:today'],
            ]);

            $status = StudentMilestone::updateOrCreate(
                ['student_id' => $student->id, 'milestone_id' => $data['milestoneId']],
                [
                    'status' => $data['status'],
                    'observation_notes' => $data['observationNotes'] ?? null,
                    'observed_at' => $data['observedAt'] ?? now()->toDateString(),
                    'observed_by' => $request->user()->id,
                ],
            );

            return ApiResponse::success($status, 'Milestone murid berhasil diperbarui.');
        })->middleware('permission:update_student_milestones');

        Route::post('/milestones/student/{student}/batch', function (Request $request, Student $student) {
            $data = $request->validate([
                'items' => ['required', 'array'],
                'items.*.milestoneId' => ['required', 'exists:montessori_milestones,id'],
                'items.*.status' => ['required', Rule::in(['not_started', 'introduced', 'in_progress', 'mastered'])],
                'items.*.observationNotes' => ['nullable', 'string'],
            ]);

            $items = collect($data['items'])->map(fn (array $item) => StudentMilestone::updateOrCreate(
                ['student_id' => $student->id, 'milestone_id' => $item['milestoneId']],
                [
                    'status' => $item['status'],
                    'observation_notes' => $item['observationNotes'] ?? null,
                    'observed_at' => now()->toDateString(),
                    'observed_by' => $request->user()->id,
                ],
            ));

            return ApiResponse::success($items, 'Batch milestone murid berhasil diperbarui.');
        })->middleware('permission:update_student_milestones');

        Route::get('/reports', function (Request $request) use ($perPage) {
            $query = Report::with(['student', 'class', 'academicYear'])->latest('id');
            if ($request->filled('academicYearId')) {
                $query->where('academic_year_id', $request->integer('academicYearId'));
            }
            if ($request->filled('semester')) {
                $query->where('semester', $request->string('semester'));
            }

            return ApiResponse::fromPaginator($query->paginate($perPage($request)), 'Raport berhasil diambil.');
        });

        Route::post('/reports', function (Request $request) {
            $data = $request->validate([
                'studentId' => ['required', 'exists:students,id'],
                'classId' => ['required', 'exists:classes,id'],
                'academicYearId' => ['required', 'exists:academic_years,id'],
                'semester' => ['required', Rule::in(['1', '2'])],
                'generalNotes' => ['nullable', 'string'],
                'characterNotes' => ['nullable', 'string'],
                'recommendation' => ['nullable', 'string'],
            ]);

            $report = Report::updateOrCreate(
                ['student_id' => $data['studentId'], 'academic_year_id' => $data['academicYearId'], 'semester' => $data['semester']],
                [
                    'class_id' => $data['classId'],
                    'general_notes' => $data['generalNotes'] ?? null,
                    'character_notes' => $data['characterNotes'] ?? null,
                    'recommendation' => $data['recommendation'] ?? null,
                    'created_by' => $request->user()->id,
                ],
            );

            return ApiResponse::success($report->load(['student', 'class', 'academicYear']), 'Raport berhasil disimpan.', [], 201);
        })->middleware('permission:manage_reports');

        Route::get('/reports/{report}', fn (Report $report) => ApiResponse::success($report->load(['student', 'class', 'academicYear']), 'Raport berhasil diambil.'));

        Route::put('/reports/{report}', function (Request $request, Report $report) {
            $data = $request->validate([
                'studentId' => ['nullable', 'exists:students,id'],
                'classId' => ['nullable', 'exists:classes,id'],
                'academicYearId' => ['nullable', 'exists:academic_years,id'],
                'semester' => ['nullable', Rule::in(['1', '2'])],
                'generalNotes' => ['nullable', 'string'],
                'characterNotes' => ['nullable', 'string'],
                'recommendation' => ['nullable', 'string'],
            ]);

            $report->update([
                'student_id' => $data['studentId'] ?? $report->student_id,
                'class_id' => $data['classId'] ?? $report->class_id,
                'academic_year_id' => $data['academicYearId'] ?? $report->academic_year_id,
                'semester' => $data['semester'] ?? $report->semester,
                'general_notes' => $data['generalNotes'] ?? null,
                'character_notes' => $data['characterNotes'] ?? null,
                'recommendation' => $data['recommendation'] ?? null,
            ]);

            return ApiResponse::success($report, 'Raport berhasil diperbarui.');
        })->middleware('permission:manage_reports');

        Route::post('/reports/{report}/publish', function (Request $request, Report $report) use ($settingValue) {
            $report->load(['student', 'class', 'academicYear']);
            $milestones = StudentMilestone::with('milestone.area')->where('student_id', $report->student_id)->get();
            $attendance = Attendance::where('student_id', $report->student_id)
                ->select('status', DB::raw('count(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status');

            $pdf = Pdf::loadView('pdf.report', [
                'report' => $report,
                'milestones' => $milestones,
                'attendance' => $attendance,
                'principalName' => $settingValue('principal_name', 'Kepala Sekolah Madani'),
                'principalTitle' => $settingValue('principal_title', 'Kepala Sekolah'),
                'signatureUrl' => $settingValue('principal_signature_url'),
                'signatureDisclaimer' => $settingValue('report_signature_disclaimer'),
            ]);

            $path = 'reports/report-'.$report->id.'.pdf';
            Storage::disk('public')->put($path, $pdf->output());

            $report->update([
                'pdf_url' => url('/storage/'.$path),
                'signature_status' => 'visual_signed',
                'signed_at' => now(),
                'signed_by' => $request->user()->id,
                'published_at' => now(),
            ]);

            Log::info('Report published', ['report_id' => $report->id, 'user_id' => $request->user()->id]);

            return ApiResponse::success($report->fresh(), 'Raport berhasil dipublish.');
        })->middleware('permission:publish_reports');

        Route::get('/reports/{report}/pdf', fn (Report $report) => ApiResponse::success(['pdfUrl' => $report->pdf_url], 'URL PDF raport berhasil diambil.'));

        Route::delete('/reports/{report}', function (Report $report) {
            $report->delete();

            return ApiResponse::success(null, 'Raport berhasil dihapus.');
        })->middleware('permission:manage_reports');

        Route::get('/announcements', function (Request $request) use ($perPage) {
            $query = Announcement::latest('id');

            if ($request->boolean('published')) {
                $query->whereNotNull('published_at');
            }

            if ($request->filled('limit')) {
                return ApiResponse::success($query->limit(min(max($request->integer('limit'), 1), 100))->get(), 'Pengumuman berhasil diambil.');
            }

            return ApiResponse::fromPaginator($query->paginate($perPage($request)), 'Pengumuman berhasil diambil.');
        });

        Route::get('/announcements/{announcement}', fn (Announcement $announcement) => ApiResponse::success($announcement, 'Pengumuman berhasil diambil.'));

        Route::post('/announcements', function (Request $request) use ($forgetDashboard) {
            $data = $request->validate([
                'title' => ['required', 'string', 'max:180'],
                'content' => ['required', 'string'],
                'target' => ['required', Rule::in(['all', 'class', 'specific_parents'])],
                'targetClassIds' => ['nullable', 'array'],
                'targetUserIds' => ['nullable', 'array'],
                'imageUrl' => ['nullable', 'url'],
                'isUrgent' => ['boolean'],
            ]);

            $announcement = Announcement::create([
                'title' => $data['title'],
                'content' => $data['content'],
                'target' => $data['target'],
                'target_class_ids' => $data['targetClassIds'] ?? [],
                'target_user_ids' => $data['targetUserIds'] ?? [],
                'image_url' => $data['imageUrl'] ?? null,
                'is_urgent' => $data['isUrgent'] ?? false,
                'published_by' => $request->user()->id,
            ]);
            $forgetDashboard();

            return ApiResponse::success($announcement, 'Pengumuman berhasil dibuat.', [], 201);
        })->middleware('permission:manage_announcements');

        Route::put('/announcements/{announcement}', function (Request $request, Announcement $announcement) use ($forgetDashboard) {
            $data = $request->validate([
                'title' => ['required', 'string', 'max:180'],
                'content' => ['required', 'string'],
                'target' => ['required', Rule::in(['all', 'class', 'specific_parents'])],
                'targetClassIds' => ['nullable', 'array'],
                'targetUserIds' => ['nullable', 'array'],
                'imageUrl' => ['nullable', 'url'],
                'isUrgent' => ['boolean'],
            ]);

            $announcement->update([
                'title' => $data['title'],
                'content' => $data['content'],
                'target' => $data['target'],
                'target_class_ids' => $data['targetClassIds'] ?? [],
                'target_user_ids' => $data['targetUserIds'] ?? [],
                'image_url' => $data['imageUrl'] ?? null,
                'is_urgent' => $data['isUrgent'] ?? false,
            ]);
            $forgetDashboard();

            return ApiResponse::success($announcement, 'Pengumuman berhasil diperbarui.');
        })->middleware('permission:manage_announcements');

        Route::delete('/announcements/{announcement}', function (Announcement $announcement) use ($forgetDashboard) {
            $announcement->delete();
            $forgetDashboard();

            return ApiResponse::success(null, 'Pengumuman berhasil dihapus.');
        })->middleware('permission:manage_announcements');

        Route::post('/announcements/{announcement}/publish', function (Announcement $announcement) use ($forgetDashboard) {
            $announcement->update(['published_at' => now()]);

            $users = match ($announcement->target) {
                'specific_parents' => User::whereIn('id', $announcement->target_user_ids ?? [])->get(),
                'class' => User::whereHas('children.classes', fn ($query) => $query->whereIn('classes.id', $announcement->target_class_ids ?? []))->get(),
                default => User::role('orang_tua')->get(),
            };

            foreach ($users as $user) {
                SchoolNotification::create([
                    'user_id' => $user->id,
                    'title' => $announcement->title,
                    'body' => str($announcement->content)->limit(180),
                    'data' => ['type' => 'announcement', 'id' => $announcement->id],
                ]);
            }

            Log::info('Announcement published', ['announcement_id' => $announcement->id]);
            $forgetDashboard();

            return ApiResponse::success($announcement, 'Pengumuman berhasil dipublish.');
        })->middleware('permission:manage_announcements');

        Route::get('/agendas', function (Request $request) {
            $query = SchoolAgenda::query();

            if ($request->input('from') === 'today') {
                $from = now()->toDateString();
                $query->whereDate('start_date', '>=', $from);

                if ($request->filled('days')) {
                    $query->whereDate('start_date', '<=', now()->addDays(max($request->integer('days'), 1))->toDateString());
                }
            }

            if ($request->filled('month')) {
                $query->whereMonth('start_date', $request->integer('month'));
            }
            if ($request->filled('year')) {
                $query->whereYear('start_date', $request->integer('year'));
            }

            return ApiResponse::success($query->orderBy('start_date')->get(), 'Agenda berhasil diambil.');
        });

        Route::post('/agendas', function (Request $request) use ($forgetDashboard) {
            $data = $request->validate([
                'title' => ['required', 'string', 'max:180'],
                'description' => ['nullable', 'string'],
                'startDate' => ['required', 'date'],
                'endDate' => ['nullable', 'date', 'after_or_equal:startDate'],
                'location' => ['nullable', 'string', 'max:180'],
                'type' => ['required', Rule::in(['libur', 'kegiatan', 'rapat', 'lomba', 'penerimaan'])],
                'affectsAttendance' => ['boolean'],
            ]);

            $agenda = SchoolAgenda::create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'start_date' => $data['startDate'],
                'end_date' => $data['endDate'] ?? null,
                'location' => $data['location'] ?? null,
                'type' => $data['type'],
                'affects_attendance' => $data['affectsAttendance'] ?? false,
                'created_by' => $request->user()->id,
            ]);
            $forgetDashboard();

            return ApiResponse::success($agenda, 'Agenda berhasil dibuat.', [], 201);
        })->middleware('permission:manage_agendas');

        Route::put('/agendas/{agenda}', function (Request $request, SchoolAgenda $agenda) use ($forgetDashboard) {
            $data = $request->validate([
                'title' => ['required', 'string', 'max:180'],
                'description' => ['nullable', 'string'],
                'startDate' => ['required', 'date'],
                'endDate' => ['nullable', 'date', 'after_or_equal:startDate'],
                'location' => ['nullable', 'string', 'max:180'],
                'type' => ['required', Rule::in(['libur', 'kegiatan', 'rapat', 'lomba', 'penerimaan'])],
                'affectsAttendance' => ['boolean'],
            ]);

            $agenda->update([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'start_date' => $data['startDate'],
                'end_date' => $data['endDate'] ?? null,
                'location' => $data['location'] ?? null,
                'type' => $data['type'],
                'affects_attendance' => $data['affectsAttendance'] ?? false,
            ]);
            $forgetDashboard();

            return ApiResponse::success($agenda, 'Agenda berhasil diperbarui.');
        })->middleware('permission:manage_agendas');

        Route::delete('/agendas/{agenda}', function (SchoolAgenda $agenda) use ($forgetDashboard) {
            $agenda->delete();
            $forgetDashboard();

            return ApiResponse::success(null, 'Agenda berhasil dihapus.');
        })->middleware('permission:manage_agendas');

        Route::get('/registrations', fn (Request $request) => ApiResponse::fromPaginator(Registration::latest('id')->paginate($perPage($request)), 'Pendaftaran berhasil diambil.'))->middleware('permission:view_registrations');
        Route::get('/registrations/{registration}', fn (Registration $registration) => ApiResponse::success($registration, 'Pendaftaran berhasil diambil.'))->middleware('permission:view_registrations');

        Route::put('/registrations/{registration}/status', function (Request $request, Registration $registration) use ($forgetDashboard) {
            $data = $request->validate([
                'status' => ['required', Rule::in(['pending', 'under_review', 'accepted', 'rejected', 'waitlist'])],
                'reviewerNotes' => ['nullable', 'string'],
            ]);

            $registration->update([
                'status' => $data['status'],
                'reviewer_notes' => $data['reviewerNotes'] ?? null,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
            $forgetDashboard();

            return ApiResponse::success($registration, 'Status pendaftaran berhasil diperbarui.');
        })->middleware('permission:manage_registrations');

        Route::post('/registrations/{registration}/convert', function (Request $request, Registration $registration) use ($activeYear, $forgetDashboard) {
            if ($registration->converted_student_id) {
                return ApiResponse::success($registration, 'Pendaftaran sudah dikonversi.');
            }

            $data = $request->validate([
                'classId' => ['required', 'exists:classes,id'],
                'nis' => ['nullable', 'string', 'max:20', 'unique:students,nis'],
            ]);

            $student = Student::create([
                'nis' => $data['nis'] ?? null,
                'full_name' => $registration->child_name,
                'birth_date' => $registration->child_birth_date,
                'gender' => $registration->child_gender,
                'address' => $registration->address,
                'join_date' => now()->toDateString(),
                'program_type' => $registration->program_type ?? 'regular',
                'status' => 'active',
            ]);

            $parent = User::firstOrCreate(
                ['email' => $registration->parent_email],
                ['name' => $registration->parent_name, 'phone' => $registration->parent_phone, 'password' => str()->password(16), 'is_active' => true],
            );
            $parent->assignRole('orang_tua');
            $student->parents()->syncWithoutDetaching([$parent->id => ['relation' => 'wali', 'is_primary' => true]]);

            $class = SchoolClass::findOrFail($data['classId']);
            DB::table('student_classes')->updateOrInsert(
                ['student_id' => $student->id, 'academic_year_id' => $class->academic_year_id ?? $activeYear()?->id],
                ['class_id' => $class->id, 'program_type' => $student->program_type, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            );

            $registration->update([
                'status' => 'accepted',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'converted_student_id' => $student->id,
            ]);
            $forgetDashboard();

            return ApiResponse::success(['registration' => $registration, 'student' => $student->load(['parents', 'classes'])], 'Pendaftaran berhasil dikonversi menjadi murid.');
        })->middleware('permission:manage_registrations');

        Route::post('/registrations/{registration}/documents', function (Request $request, Registration $registration) use ($upload) {
            $request->validate(['documents.*' => ['required', 'file', 'max:5120']]);
            $documents = $registration->document_urls ?? [];

            foreach ($request->file('documents', []) as $index => $file) {
                $documents[] = [
                    'name' => $request->input("documentNames.$index", 'Dokumen '.(count($documents) + 1)),
                    'url' => $upload($file, 'registrations/'.$registration->id),
                ];
            }

            $registration->update(['document_urls' => $documents]);

            return ApiResponse::success($registration, 'Dokumen pendaftaran berhasil diunggah.');
        })->middleware('permission:manage_registrations');

        Route::delete('/registrations/{registration}', function (Registration $registration) use ($forgetDashboard) {
            $registration->delete();
            $forgetDashboard();

            return ApiResponse::success(null, 'Pendaftaran berhasil dihapus.');
        })->middleware('permission:manage_registrations');

        Route::get('/enrollment-updates/summary', [EnrollmentUpdateController::class, 'summary'])->middleware('permission:view_registrations|view_fees');
        Route::get('/enrollment-updates', [EnrollmentUpdateController::class, 'index'])->middleware('permission:view_registrations');
        Route::post('/enrollment-updates', [EnrollmentUpdateController::class, 'store'])->middleware('permission:manage_registrations');
        Route::put('/enrollment-updates/{enrollmentUpdate}', [EnrollmentUpdateController::class, 'update'])->middleware('permission:manage_registrations');
        Route::delete('/enrollment-updates/{enrollmentUpdate}', [EnrollmentUpdateController::class, 'destroy'])->middleware('permission:manage_registrations');

        Route::get('/analytics', AnalyticsController::class)->middleware('permission:view_analytics');

        Route::get('/absence-requests/my', [AbsenceRequestController::class, 'my'])->middleware('permission:view_attendance');
        Route::get('/absence-requests', [AbsenceRequestController::class, 'index'])->middleware('permission:manage_absence_requests|view_attendance');
        Route::post('/absence-requests', [AbsenceRequestController::class, 'store'])->middleware('permission:view_attendance');
        Route::get('/absence-requests/{absenceRequest}', [AbsenceRequestController::class, 'show'])->middleware('permission:manage_absence_requests|view_attendance');
        Route::put('/absence-requests/{absenceRequest}/review', [AbsenceRequestController::class, 'review'])->middleware('permission:manage_absence_requests');

        Route::get('/hafalan/summary', fn () => ApiResponse::success($hafalanSummary(), 'Ringkasan hafalan berhasil diambil.'))->middleware('permission:view_dashboard|view_hafalan|view_analytics');

        Route::get('/hafalan/surahs', [HafalanController::class, 'surahs'])->middleware('permission:view_hafalan');
        Route::post('/hafalan/surahs', [HafalanController::class, 'storeSurah'])->middleware('permission:manage_hafalan_definitions');
        Route::get('/hafalan/doa', [HafalanController::class, 'doa'])->middleware('permission:view_hafalan');
        Route::post('/hafalan/doa', [HafalanController::class, 'storeDoa'])->middleware('permission:manage_hafalan_definitions');
        Route::get('/hafalan/student/{student}', [HafalanController::class, 'student'])->middleware('permission:view_hafalan');
        Route::post('/hafalan/student/{student}/surah', [HafalanController::class, 'updateSurah'])->middleware('permission:update_student_hafalan');
        Route::post('/hafalan/student/{student}/batch', [HafalanController::class, 'batch'])->middleware('permission:update_student_hafalan');
        Route::get('/doa/student/{student}', [HafalanController::class, 'studentDoa'])->middleware('permission:view_hafalan');
        Route::post('/doa/student/{student}/update', [HafalanController::class, 'updateDoa'])->middleware('permission:update_student_hafalan');

        Route::get('/portfolios', [PortfolioController::class, 'index'])->middleware('permission:view_portfolios');
        Route::post('/portfolios', [PortfolioController::class, 'store'])->middleware('permission:manage_portfolios');
        Route::get('/portfolios/{portfolio}', [PortfolioController::class, 'show'])->middleware('permission:view_portfolios');
        Route::put('/portfolios/{portfolio}', [PortfolioController::class, 'update'])->middleware('permission:manage_portfolios');
        Route::delete('/portfolios/{portfolio}', [PortfolioController::class, 'destroy'])->middleware('permission:manage_portfolios');
        Route::put('/portfolios/{portfolio}/feature', [PortfolioController::class, 'feature'])->middleware('permission:manage_portfolios');

        Route::get('/galleries', [GalleryController::class, 'index'])->middleware('permission:view_galleries');
        Route::post('/galleries', [GalleryController::class, 'store'])->middleware('permission:manage_galleries');
        Route::get('/galleries/{gallery}', [GalleryController::class, 'show'])->middleware('permission:view_galleries');
        Route::put('/galleries/{gallery}', [GalleryController::class, 'update'])->middleware('permission:manage_galleries');
        Route::delete('/galleries/{gallery}', [GalleryController::class, 'destroy'])->middleware('permission:manage_galleries');
        Route::put('/galleries/{gallery}/toggle-publish', [GalleryController::class, 'togglePublish'])->middleware('permission:manage_galleries');

        Route::get('/articles', [ArticleController::class, 'index'])->middleware('permission:view_articles');
        Route::post('/articles', [ArticleController::class, 'store'])->middleware('permission:manage_articles');
        Route::get('/articles/{article}', [ArticleController::class, 'show'])->middleware('permission:view_articles');
        Route::put('/articles/{article}', [ArticleController::class, 'update'])->middleware('permission:manage_articles');
        Route::delete('/articles/{article}', [ArticleController::class, 'destroy'])->middleware('permission:manage_articles');
        Route::post('/articles/{article}/publish', [ArticleController::class, 'publish'])->middleware('permission:manage_articles');

        Route::post('/ai/chat', [AiChatController::class, 'chat'])->middleware('permission:use_ai_chat');
        Route::get('/ai/chat/my-history', [AiChatController::class, 'myHistory'])->middleware('permission:use_ai_chat');
        Route::delete('/ai/chat/my-history', [AiChatController::class, 'clearMine'])->middleware('permission:use_ai_chat');
        Route::get('/ai/chat/histories', [AiChatController::class, 'histories'])->middleware('permission:view_ai_chat_history');
        Route::get('/ai/chat/usage', [AiChatController::class, 'usage'])->middleware('permission:view_ai_chat_history');
        Route::delete('/ai/chat/histories/{history}', [AiChatController::class, 'destroy'])->middleware('permission:manage_ai_chat');
        Route::get('/ai/chat/history/{student}', [AiChatController::class, 'history'])->middleware('permission:use_ai_chat');
        Route::delete('/ai/chat/history/{student}', [AiChatController::class, 'clear'])->middleware('permission:use_ai_chat');

        Route::post('/digest/send', [DigestController::class, 'send'])->middleware('permission:manage_announcements|manage_reports');
        Route::get('/digest/preview/{student}', [DigestController::class, 'preview'])->middleware('permission:manage_announcements|manage_reports');

        Route::get('/school-accounts', [FeeController::class, 'schoolAccounts'])->middleware('permission:view_fees|manage_fees');
        Route::post('/school-accounts', [FeeController::class, 'storeSchoolAccount'])->middleware('permission:manage_fees');
        Route::put('/school-accounts/{account}', [FeeController::class, 'updateSchoolAccount'])->middleware('permission:manage_fees');
        Route::get('/fee-types', [FeeController::class, 'feeTypes'])->middleware('permission:view_fees|manage_fees');
        Route::post('/fee-types', [FeeController::class, 'storeFeeType'])->middleware('permission:manage_fees');
        Route::put('/fee-types/{feeType}', [FeeController::class, 'updateFeeType'])->middleware('permission:manage_fees');
        Route::get('/fees/summary', [FeeController::class, 'summary'])->middleware('permission:view_fees');
        Route::get('/fees/aging', [FeeController::class, 'aging'])->middleware('permission:view_fees');
        Route::get('/fees/export', [FeeController::class, 'export'])->middleware('permission:manage_fees');
        Route::post('/fees/generate', [FeeController::class, 'generate'])->middleware('permission:manage_fees');
        Route::get('/fees/student/{student}', [FeeController::class, 'student'])->middleware('permission:view_fees');
        Route::get('/fees', [FeeController::class, 'index'])->middleware('permission:view_fees');
        Route::get('/fees/{fee}', [FeeController::class, 'show'])->middleware('permission:view_fees');
        Route::post('/fees/{fee}/payments', [FeeController::class, 'createPayment'])->middleware('permission:view_fees');
        Route::post('/fees/{fee}/upload-proof', [FeeController::class, 'uploadProof'])->middleware('permission:view_fees');
        Route::post('/fees/{fee}/confirm-payment', [FeeController::class, 'confirmPayment'])->middleware('permission:manage_fees');
        Route::post('/fee-payments/{payment}/confirm', [FeeController::class, 'confirmFeePayment'])->middleware('permission:manage_fees');
        Route::post('/fee-payments/{payment}/reject', [FeeController::class, 'rejectFeePayment'])->middleware('permission:manage_fees');
        Route::get('/keuangan/summary', [FinanceController::class, 'overview'])->middleware('permission:view_fees');
        Route::get('/finance/overview', [FinanceController::class, 'overview'])->middleware('permission:view_fees');
        Route::get('/finance/audit', [FinanceController::class, 'audit'])->middleware('permission:view_fees');
        Route::get('/finance/entries', [FinanceController::class, 'entries'])->middleware('permission:view_fees');
        Route::post('/finance/entries', [FinanceController::class, 'storeEntry'])->middleware('permission:manage_fees');
        Route::put('/finance/entries/{entry}', [FinanceController::class, 'updateEntry'])->middleware('permission:manage_fees');
        Route::delete('/finance/entries/{entry}', [FinanceController::class, 'deleteEntry'])->middleware('permission:manage_fees');
        Route::get('/finance/payrolls', [FinanceController::class, 'payrolls'])->middleware('permission:view_fees');
        Route::get('/finance/payroll-teachers', [FinanceController::class, 'payrollTeachers'])->middleware('permission:view_fees|manage_fees');
        Route::post('/finance/payrolls', [FinanceController::class, 'storePayroll'])->middleware('permission:manage_fees');
        Route::put('/finance/payrolls/{payroll}', [FinanceController::class, 'updatePayroll'])->middleware('permission:manage_fees');
        Route::delete('/finance/payrolls/{payroll}', [FinanceController::class, 'deletePayroll'])->middleware('permission:manage_fees');

        Route::get('/notifications', fn (Request $request) => ApiResponse::fromPaginator(SchoolNotification::where('user_id', $request->user()->id)->latest('id')->paginate($perPage($request)), 'Notifikasi berhasil diambil.'));

        Route::put('/notifications/{notification}/read', function (Request $request, SchoolNotification $notification) {
            abort_unless($notification->user_id === $request->user()->id, 403);
            $notification->update(['read_at' => now()]);

            return ApiResponse::success($notification, 'Notifikasi berhasil ditandai dibaca.');
        });

        Route::put('/notifications/read-all', function (Request $request) {
            SchoolNotification::where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

            return ApiResponse::success(null, 'Semua notifikasi berhasil ditandai dibaca.');
        });

        Route::get('/settings', fn () => ApiResponse::success(Setting::orderBy('key')->get(), 'Settings berhasil diambil.'))->middleware('permission:manage_users');

        Route::put('/settings', function (Request $request) use ($storeSetting) {
            $data = $request->validate([
                'settings' => ['required', 'array'],
                'settings.*.key' => ['required', 'string'],
                'settings.*.value' => ['nullable'],
                'settings.*.type' => ['nullable', 'string'],
            ]);

            $settings = collect($data['settings'])->map(fn (array $item) => $storeSetting($item['key'], $item['value'] ?? null, $item['type'] ?? 'text'));

            return ApiResponse::success($settings, 'Settings berhasil diperbarui.');
        })->middleware('permission:manage_users');

        Route::post('/settings/report-signature', function (Request $request) use ($storeSetting, $upload) {
            $data = $request->validate([
                'principalName' => ['required', 'string', 'max:150'],
                'principalTitle' => ['required', 'string', 'max:150'],
                'signature' => ['nullable', 'file', 'mimes:png,jpg,jpeg', 'max:2048'],
                'signatureUrl' => ['nullable', 'url'],
            ]);

            $storeSetting('principal_name', $data['principalName']);
            $storeSetting('principal_title', $data['principalTitle']);

            if ($request->hasFile('signature')) {
                $storeSetting('principal_signature_url', $upload($request->file('signature'), 'settings/report-signature'), 'url');
            } elseif (! empty($data['signatureUrl'])) {
                $storeSetting('principal_signature_url', $data['signatureUrl'], 'url');
            }

            return ApiResponse::success(Setting::whereIn('key', ['principal_name', 'principal_title', 'principal_signature_url'])->get(), 'Tanda tangan raport berhasil disimpan.');
        })->middleware('permission:manage_users');
    });
});
