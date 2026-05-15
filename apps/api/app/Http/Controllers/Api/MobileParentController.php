<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AbsenceRequest;
use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\ClassGallery;
use App\Models\DoaDaily;
use App\Models\HafalanSurah;
use App\Models\Journal;
use App\Models\MontessoriArea;
use App\Models\MontessoriMilestone;
use App\Models\ParentingArticle;
use App\Models\Report;
use App\Models\SchoolAgenda;
use App\Models\SchoolNotification;
use App\Models\Student;
use App\Models\StudentDoa;
use App\Models\StudentFee;
use App\Models\StudentHafalan;
use App\Models\StudentMilestone;
use App\Models\StudentPortfolio;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class MobileParentController extends Controller
{
    public function home(Request $request)
    {
        $children = $this->childrenQuery($request)
            ->with(['classes' => fn ($query) => $query->wherePivot('status', 'active')])
            ->get();
        $studentIds = $children->pluck('id');
        $classIds = $children->flatMap(fn (Student $student) => $student->classes->pluck('id'))->unique()->values();
        $today = now()->toDateString();

        return ApiResponse::success([
            'parent' => $request->user()->only(['id', 'name', 'email', 'phone', 'photo_url']),
            'children' => $children,
            'today' => [
                'date' => $today,
                'attendance' => Attendance::with('student:id,full_name,nickname')
                    ->whereIn('student_id', $studentIds)
                    ->whereDate('date', $today)
                    ->latest('id')
                    ->get(),
                'absence_requests' => AbsenceRequest::with('student:id,full_name,nickname')
                    ->whereIn('student_id', $studentIds)
                    ->whereDate('date', $today)
                    ->latest('id')
                    ->get(),
            ],
            'summary' => [
                'children_count' => $children->count(),
                'unread_notifications' => SchoolNotification::where('user_id', $request->user()->id)->whereNull('read_at')->count(),
                'pending_fees' => StudentFee::whereIn('student_id', $studentIds)->whereIn('status', ['unpaid', 'partial'])->count(),
                'pending_absence_requests' => AbsenceRequest::whereIn('student_id', $studentIds)->where('status', 'pending')->count(),
            ],
            'latest_journals' => Journal::with(['student:id,full_name,nickname', 'class:id,name,level'])
                ->whereIn('student_id', $studentIds)
                ->where('is_published', true)
                ->latest('date')
                ->limit(5)
                ->get(),
            'announcements' => $this->announcementQuery($request, $classIds)->limit(5)->get(),
            'agendas' => SchoolAgenda::whereDate('start_date', '>=', now()->subDays(7)->toDateString())
                ->orderBy('start_date')
                ->limit(6)
                ->get(),
            'notifications' => SchoolNotification::where('user_id', $request->user()->id)->latest('id')->limit(5)->get(),
        ], 'Beranda orang tua berhasil diambil.');
    }

    public function children(Request $request)
    {
        return ApiResponse::success(
            $this->childrenQuery($request)->with('classes')->orderBy('full_name')->get(),
            'Data anak berhasil diambil.',
        );
    }

    public function child(Request $request, Student $student)
    {
        $this->assertChild($request, $student);

        return ApiResponse::success($student->load(['classes']), 'Detail anak berhasil diambil.');
    }

    public function attendance(Request $request, Student $student)
    {
        $this->assertChild($request, $student);
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'status' => ['nullable', 'string'],
        ]);

        $query = Attendance::with('class:id,name,level')
            ->where('student_id', $student->id)
            ->when($request->filled('from'), fn (Builder $query) => $query->whereDate('date', '>=', $request->date('from')->toDateString()))
            ->when($request->filled('to'), fn (Builder $query) => $query->whereDate('date', '<=', $request->date('to')->toDateString()))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->latest('date')
            ->limit($this->limit($request))
            ->get();

        return ApiResponse::success($query, 'Riwayat absensi berhasil diambil.');
    }

    public function journals(Request $request, Student $student)
    {
        $this->assertChild($request, $student);
        $request->validate(['q' => ['nullable', 'string', 'max:120']]);

        $journals = Journal::with(['class:id,name,level', 'teacher:id,name'])
            ->where('student_id', $student->id)
            ->where('is_published', true)
            ->when($request->filled('q'), fn (Builder $query) => $query->where('content', 'like', '%'.$request->string('q').'%'))
            ->latest('date')
            ->limit($this->limit($request))
            ->get();

        return ApiResponse::success($journals, 'Jurnal anak berhasil diambil.');
    }

    public function montessori(Request $request, Student $student)
    {
        $this->assertChild($request, $student);
        $statuses = StudentMilestone::where('student_id', $student->id)->get()->keyBy('milestone_id');
        $areas = MontessoriArea::with(['milestones' => fn ($query) => $query->orderBy('sort_order')])
            ->orderBy('sort_order')
            ->get()
            ->map(function (MontessoriArea $area) use ($statuses) {
                $milestones = $area->milestones->map(function (MontessoriMilestone $milestone) use ($statuses) {
                    $status = $statuses->get($milestone->id);

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

        return ApiResponse::success($areas, 'Progress Montessori berhasil diambil.');
    }

    public function hafalan(Request $request, Student $student)
    {
        $this->assertChild($request, $student);
        $surahStatuses = StudentHafalan::where('student_id', $student->id)->get()->keyBy('surah_id');
        $doaStatuses = StudentDoa::where('student_id', $student->id)->get()->keyBy('doa_id');

        $surahs = HafalanSurah::orderBy('sort_order')->get()->map(function (HafalanSurah $surah) use ($surahStatuses) {
            $row = $surahStatuses->get($surah->id);

            return [
                ...$surah->toArray(),
                'student_status' => $row?->status ?? 'belum',
                'started_at' => $row?->started_at,
                'completed_at' => $row?->completed_at,
                'last_ayat_reached' => $row?->last_ayat_reached,
                'notes' => $row?->notes,
                'updated_at' => $row?->updated_at,
            ];
        });

        $doas = DoaDaily::orderBy('category')->orderBy('sort_order')->get()->map(function (DoaDaily $doa) use ($doaStatuses) {
            $row = $doaStatuses->get($doa->id);

            return [
                ...$doa->toArray(),
                'student_status' => $row?->status ?? 'belum',
                'completed_at' => $row?->completed_at,
            ];
        });

        return ApiResponse::success(['surahs' => $surahs, 'doas' => $doas], 'Progress hafalan dan doa berhasil diambil.');
    }

    public function fees(Request $request, Student $student)
    {
        $this->assertChild($request, $student);
        $fees = StudentFee::with(['feeType', 'bankAccount', 'payments.bankAccount'])
            ->where('student_id', $student->id)
            ->latest('year')
            ->latest('month')
            ->latest('id')
            ->get();

        return ApiResponse::success([
            'summary' => [
                'total_billed' => (int) $fees->sum('total_billed'),
                'paid_amount' => (int) $fees->sum('paid_amount'),
                'outstanding' => (int) $fees->sum(fn (StudentFee $fee) => max((int) $fee->total_billed - (int) $fee->paid_amount, 0)),
                'pending_count' => $fees->whereIn('status', ['unpaid', 'partial'])->count(),
            ],
            'fees' => $fees,
        ], 'Tagihan anak berhasil diambil.');
    }

    public function portfolio(Request $request, Student $student)
    {
        $this->assertChild($request, $student);

        return ApiResponse::success(
            StudentPortfolio::with(['class:id,name,level', 'area:id,name,color_hex', 'uploader:id,name'])
                ->where('student_id', $student->id)
                ->latest('work_date')
                ->limit($this->limit($request))
                ->get(),
            'Portofolio anak berhasil diambil.',
        );
    }

    public function reports(Request $request, Student $student)
    {
        $this->assertChild($request, $student);

        return ApiResponse::success(
            Report::with(['class:id,name,level', 'academicYear:id,name,start_date,end_date'])
                ->where('student_id', $student->id)
                ->whereNotNull('published_at')
                ->latest('published_at')
                ->get(),
            'Raport anak berhasil diambil.',
        );
    }

    public function gallery(Request $request)
    {
        $classIds = $this->childClassIds($request);

        return ApiResponse::success(
            ClassGallery::with(['class:id,name,level', 'uploader:id,name'])
                ->whereIn('class_id', $classIds)
                ->where('is_published', true)
                ->latest('event_date')
                ->limit($this->limit($request))
                ->get(),
            'Galeri kelas berhasil diambil.',
        );
    }

    public function announcements(Request $request)
    {
        return ApiResponse::success(
            $this->announcementQuery($request, $this->childClassIds($request))->limit($this->limit($request))->get(),
            'Pengumuman berhasil diambil.',
        );
    }

    public function agendas(Request $request)
    {
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        return ApiResponse::success(
            SchoolAgenda::query()
                ->when($request->filled('from'), fn (Builder $query) => $query->whereDate('start_date', '>=', $request->date('from')->toDateString()))
                ->when($request->filled('to'), fn (Builder $query) => $query->whereDate('start_date', '<=', $request->date('to')->toDateString()))
                ->orderBy('start_date')
                ->limit($this->limit($request))
                ->get(),
            'Agenda sekolah berhasil diambil.',
        );
    }

    public function articles(Request $request)
    {
        return ApiResponse::success(
            ParentingArticle::where('is_published', true)
                ->latest('published_at')
                ->limit($this->limit($request))
                ->get(),
            'Artikel parenting berhasil diambil.',
        );
    }

    public function notifications(Request $request)
    {
        return ApiResponse::success(
            SchoolNotification::where('user_id', $request->user()->id)
                ->latest('id')
                ->limit($this->limit($request))
                ->get(),
            'Notifikasi berhasil diambil.',
        );
    }

    private function childrenQuery(Request $request)
    {
        return $request->user()->children();
    }

    private function assertChild(Request $request, Student $student): void
    {
        abort_unless($request->user()->children()->where('students.id', $student->id)->exists(), 403);
    }

    private function childClassIds(Request $request)
    {
        return $this->childrenQuery($request)
            ->with(['classes' => fn ($query) => $query->wherePivot('status', 'active')])
            ->get()
            ->flatMap(fn (Student $student) => $student->classes->pluck('id'))
            ->unique()
            ->values();
    }

    private function announcementQuery(Request $request, $classIds): Builder
    {
        return Announcement::query()
            ->whereNotNull('published_at')
            ->latest('published_at')
            ->where(function (Builder $query) use ($request, $classIds) {
                $query->where('target', 'all')
                    ->orWhere(function (Builder $query) use ($request) {
                        $query->where('target', 'specific_parents')->whereJsonContains('target_user_ids', $request->user()->id);
                    });

                foreach ($classIds as $classId) {
                    $query->orWhere(function (Builder $query) use ($classId) {
                        $query->where('target', 'class')->whereJsonContains('target_class_ids', $classId);
                    });
                }
            });
    }

    private function limit(Request $request): int
    {
        return min(max((int) $request->integer('limit', 30), 1), 100);
    }
}
