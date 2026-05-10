<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\UploadsFiles;
use App\Http\Controllers\Controller;
use App\Models\ClassGallery;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class GalleryController extends Controller
{
    use UploadsFiles;

    public function index(Request $request)
    {
        $query = ClassGallery::with(['class', 'uploader'])->latest('event_date')->latest('id');

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->integer('class_id'));
        }
        if ($request->filled('month')) {
            $query->whereMonth('event_date', $request->integer('month'));
        }
        if ($request->filled('year')) {
            $query->whereYear('event_date', $request->integer('year'));
        }

        return ApiResponse::fromPaginator($query->paginate(min(max((int) $request->integer('perPage', 15), 1), 100)), 'Galeri berhasil diambil.');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'classId' => ['required', 'exists:classes,id'],
            'eventName' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'eventDate' => ['required', 'date', 'before_or_equal:today'],
            'isPublished' => ['boolean'],
            'photos.*' => ['nullable', 'file', 'max:5120'],
            'photoUrls' => ['nullable', 'array'],
        ]);

        $photoUrls = $data['photoUrls'] ?? [];
        foreach ($request->file('photos', []) as $file) {
            $photoUrls[] = $this->storePublicFile($file, 'galleries/'.$data['classId']);
        }

        $gallery = ClassGallery::create([
            'class_id' => $data['classId'],
            'uploaded_by' => $request->user()->id,
            'event_name' => $data['eventName'],
            'description' => $data['description'] ?? null,
            'photo_urls' => $photoUrls,
            'event_date' => $data['eventDate'],
            'is_published' => $data['isPublished'] ?? true,
        ]);

        return ApiResponse::success($gallery->load(['class', 'uploader']), 'Galeri berhasil dibuat.', [], 201);
    }

    public function show(ClassGallery $gallery)
    {
        return ApiResponse::success($gallery->load(['class', 'uploader']), 'Galeri berhasil diambil.');
    }

    public function update(Request $request, ClassGallery $gallery)
    {
        $data = $request->validate([
            'eventName' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'eventDate' => ['required', 'date', 'before_or_equal:today'],
            'isPublished' => ['boolean'],
            'photos.*' => ['nullable', 'file', 'max:5120'],
            'photoUrls' => ['nullable', 'array'],
        ]);

        $photoUrls = $request->hasFile('photos') || array_key_exists('photoUrls', $data)
            ? ($data['photoUrls'] ?? [])
            : ($gallery->photo_urls ?? []);
        foreach ($request->file('photos', []) as $file) {
            $photoUrls[] = $this->storePublicFile($file, 'galleries/'.$gallery->class_id);
        }

        $gallery->update([
            'event_name' => $data['eventName'],
            'description' => $data['description'] ?? null,
            'photo_urls' => $photoUrls,
            'event_date' => $data['eventDate'],
            'is_published' => $data['isPublished'] ?? $gallery->is_published,
        ]);

        return ApiResponse::success($gallery->fresh(['class', 'uploader']), 'Galeri berhasil diperbarui.');
    }

    public function destroy(ClassGallery $gallery)
    {
        $gallery->delete();

        return ApiResponse::success(null, 'Galeri berhasil dihapus.');
    }

    public function togglePublish(ClassGallery $gallery)
    {
        $gallery->update(['is_published' => ! $gallery->is_published]);

        return ApiResponse::success($gallery, 'Status publish galeri diperbarui.');
    }
}
