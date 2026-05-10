<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DoaDaily;
use App\Models\HafalanSurah;
use App\Models\Student;
use App\Models\StudentDoa;
use App\Models\StudentHafalan;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HafalanController extends Controller
{
    public function surahs(Request $request)
    {
        $query = HafalanSurah::orderBy('sort_order')->orderByDesc('surah_number');
        if ($request->filled('level')) {
            $query->where('target_level', $request->string('level'));
        }

        return ApiResponse::success($query->get(), 'Daftar surah berhasil diambil.');
    }

    public function storeSurah(Request $request)
    {
        $data = $request->validate([
            'surahNumber' => ['required', 'integer'],
            'nameArabic' => ['required', 'string', 'max:120'],
            'nameLatin' => ['required', 'string', 'max:120'],
            'nameId' => ['required', 'string', 'max:120'],
            'totalAyat' => ['required', 'integer', 'min:1'],
            'targetLevel' => ['nullable', Rule::in(['KB', 'TKA', 'TKB', 'TKC'])],
            'sortOrder' => ['nullable', 'integer'],
        ]);

        $surah = HafalanSurah::create([
            'surah_number' => $data['surahNumber'],
            'name_arabic' => $data['nameArabic'],
            'name_latin' => $data['nameLatin'],
            'name_id' => $data['nameId'],
            'total_ayat' => $data['totalAyat'],
            'target_level' => $data['targetLevel'] ?? null,
            'sort_order' => $data['sortOrder'] ?? 0,
        ]);

        return ApiResponse::success($surah, 'Surah berhasil dibuat.', [], 201);
    }

    public function doa()
    {
        return ApiResponse::success(DoaDaily::orderBy('category')->orderBy('sort_order')->get(), 'Daftar doa berhasil diambil.');
    }

    public function storeDoa(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'arabicText' => ['required', 'string'],
            'latinText' => ['required', 'string'],
            'meaning' => ['required', 'string'],
            'category' => ['required', Rule::in(['ibadah', 'aktivitas_harian', 'adab'])],
            'sortOrder' => ['nullable', 'integer'],
        ]);

        $doa = DoaDaily::create([
            'name' => $data['name'],
            'arabic_text' => $data['arabicText'],
            'latin_text' => $data['latinText'],
            'meaning' => $data['meaning'],
            'category' => $data['category'],
            'sort_order' => $data['sortOrder'] ?? 0,
        ]);

        return ApiResponse::success($doa, 'Doa berhasil dibuat.', [], 201);
    }

    public function student(Student $student)
    {
        $progress = StudentHafalan::where('student_id', $student->id)->get()->keyBy('surah_id');
        $surahs = HafalanSurah::orderBy('sort_order')->get()->map(function (HafalanSurah $surah) use ($progress) {
            $row = $progress->get($surah->id);

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

        return ApiResponse::success(['student' => $student->load('classes'), 'surahs' => $surahs], 'Progress hafalan berhasil diambil.');
    }

    public function updateSurah(Request $request, Student $student)
    {
        $data = $request->validate([
            'surahId' => ['required', 'exists:hafalan_surahs,id'],
            'status' => ['required', Rule::in(['belum', 'sedang_dihafal', 'lancar', 'mutqin'])],
            'lastAyatReached' => ['nullable', 'integer', 'min:1'],
            'notes' => ['nullable', 'string'],
        ]);

        $row = $this->saveStudentSurah($request, $student, $data);

        return ApiResponse::success($row->load('surah'), 'Progress hafalan berhasil diperbarui.');
    }

    public function batch(Request $request, Student $student)
    {
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.surahId' => ['required', 'exists:hafalan_surahs,id'],
            'items.*.status' => ['required', Rule::in(['belum', 'sedang_dihafal', 'lancar', 'mutqin'])],
            'items.*.lastAyatReached' => ['nullable', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string'],
        ]);

        $rows = collect($data['items'])->map(fn ($item) => $this->saveStudentSurah($request, $student, $item)->load('surah'));

        return ApiResponse::success($rows, 'Batch hafalan berhasil diperbarui.');
    }

    public function studentDoa(Student $student)
    {
        $progress = StudentDoa::where('student_id', $student->id)->get()->keyBy('doa_id');
        $doas = DoaDaily::orderBy('category')->orderBy('sort_order')->get()->map(function (DoaDaily $doa) use ($progress) {
            $row = $progress->get($doa->id);

            return [
                ...$doa->toArray(),
                'student_status' => $row?->status ?? 'belum',
                'completed_at' => $row?->completed_at,
            ];
        });

        return ApiResponse::success(['student' => $student->load('classes'), 'doas' => $doas], 'Progress doa berhasil diambil.');
    }

    public function updateDoa(Request $request, Student $student)
    {
        $data = $request->validate([
            'doaId' => ['required', 'exists:doa_daily,id'],
            'status' => ['required', Rule::in(['belum', 'sedang_dipelajari', 'hafal'])],
        ]);

        $row = StudentDoa::updateOrCreate(
            ['student_id' => $student->id, 'doa_id' => $data['doaId']],
            [
                'status' => $data['status'],
                'completed_at' => $data['status'] === 'hafal' ? now()->toDateString() : null,
                'recorded_by' => $request->user()->id,
            ],
        );

        return ApiResponse::success($row->load('doa'), 'Progress doa berhasil diperbarui.');
    }

    private function saveStudentSurah(Request $request, Student $student, array $data): StudentHafalan
    {
        return StudentHafalan::updateOrCreate(
            ['student_id' => $student->id, 'surah_id' => $data['surahId']],
            [
                'status' => $data['status'],
                'started_at' => $data['status'] === 'belum' ? null : now()->toDateString(),
                'completed_at' => in_array($data['status'], ['lancar', 'mutqin'], true) ? now()->toDateString() : null,
                'last_ayat_reached' => $data['lastAyatReached'] ?? null,
                'notes' => $data['notes'] ?? null,
                'recorded_by' => $request->user()->id,
            ],
        );
    }
}
