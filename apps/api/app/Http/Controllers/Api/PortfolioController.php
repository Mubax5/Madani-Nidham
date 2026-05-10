<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\UploadsFiles;
use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentPortfolio;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class PortfolioController extends Controller
{
    use UploadsFiles;

    public function index(Request $request)
    {
        $query = StudentPortfolio::with(['student.classes', 'class', 'area', 'uploader'])->latest('work_date')->latest('id');

        foreach (['student_id', 'class_id', 'area_id'] as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->integer($field));
            }
        }
        if ($request->filled('month')) {
            $query->whereMonth('work_date', $request->integer('month'));
        }
        if ($request->filled('year')) {
            $query->whereYear('work_date', $request->integer('year'));
        }

        return ApiResponse::fromPaginator($query->paginate(min(max((int) $request->integer('perPage', 15), 1), 100)), 'Portofolio berhasil diambil.');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'studentId' => ['required', 'exists:students,id'],
            'classId' => ['nullable', 'exists:classes,id'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'areaId' => ['nullable', 'exists:montessori_areas,id'],
            'workDate' => ['required', 'date', 'before_or_equal:today'],
            'isFeatured' => ['boolean'],
            'photos.*' => ['nullable', 'file', 'max:5120'],
            'photoUrls' => ['nullable', 'array'],
        ]);

        $student = Student::with('classes')->findOrFail($data['studentId']);
        $photoUrls = $data['photoUrls'] ?? [];
        foreach ($request->file('photos', []) as $file) {
            $photoUrls[] = $this->storePublicFile($file, 'portfolios/'.$student->id);
        }

        $portfolio = StudentPortfolio::create([
            'student_id' => $student->id,
            'class_id' => $data['classId'] ?? $student->active_class?->id,
            'uploaded_by' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'photo_urls' => $photoUrls,
            'area_id' => $data['areaId'] ?? null,
            'work_date' => $data['workDate'],
            'is_featured' => $data['isFeatured'] ?? false,
        ]);

        return ApiResponse::success($portfolio->load(['student', 'class', 'area']), 'Portofolio berhasil dibuat.', [], 201);
    }

    public function show(StudentPortfolio $portfolio)
    {
        return ApiResponse::success($portfolio->load(['student.classes', 'class', 'area', 'uploader']), 'Portofolio berhasil diambil.');
    }

    public function update(Request $request, StudentPortfolio $portfolio)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'areaId' => ['nullable', 'exists:montessori_areas,id'],
            'workDate' => ['required', 'date', 'before_or_equal:today'],
            'isFeatured' => ['boolean'],
            'photos.*' => ['nullable', 'file', 'max:5120'],
            'photoUrls' => ['nullable', 'array'],
        ]);

        $photoUrls = $request->hasFile('photos') || array_key_exists('photoUrls', $data)
            ? ($data['photoUrls'] ?? [])
            : ($portfolio->photo_urls ?? []);
        foreach ($request->file('photos', []) as $file) {
            $photoUrls[] = $this->storePublicFile($file, 'portfolios/'.$portfolio->student_id);
        }

        $portfolio->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'photo_urls' => $photoUrls,
            'area_id' => $data['areaId'] ?? null,
            'work_date' => $data['workDate'],
            'is_featured' => $data['isFeatured'] ?? $portfolio->is_featured,
        ]);

        return ApiResponse::success($portfolio->fresh(['student', 'class', 'area']), 'Portofolio berhasil diperbarui.');
    }

    public function destroy(StudentPortfolio $portfolio)
    {
        $portfolio->delete();

        return ApiResponse::success(null, 'Portofolio berhasil dihapus.');
    }

    public function feature(StudentPortfolio $portfolio)
    {
        $portfolio->update(['is_featured' => ! $portfolio->is_featured]);

        return ApiResponse::success($portfolio, 'Status unggulan portofolio diperbarui.');
    }
}
