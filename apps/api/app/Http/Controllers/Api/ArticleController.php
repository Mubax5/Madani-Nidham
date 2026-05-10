<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\UploadsFiles;
use App\Http\Controllers\Controller;
use App\Models\ParentingArticle;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ArticleController extends Controller
{
    use UploadsFiles;

    public function index(Request $request)
    {
        $query = ParentingArticle::with('creator')->latest('published_at')->latest('id');

        if (! $request->user()->hasAnyPermission(['manage_articles'])) {
            $query->where('is_published', true);
        }
        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }
        if ($request->filled('level')) {
            $level = $request->string('level');
            $query->whereJsonContains('relevant_levels', $level);
        }

        return ApiResponse::fromPaginator($query->paginate(min(max((int) $request->integer('perPage', 15), 1), 100)), 'Artikel berhasil diambil.');
    }

    public function show(ParentingArticle $article)
    {
        return ApiResponse::success($article->load('creator'), 'Artikel berhasil diambil.');
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $cover = $data['coverImageUrl'] ?? null;
        if ($request->hasFile('cover')) {
            $cover = $this->storePublicFile($request->file('cover'), 'articles');
        }

        $article = ParentingArticle::create([
            'title' => $data['title'],
            'content' => $data['content'],
            'cover_image_url' => $cover,
            'category' => $data['category'],
            'relevant_areas' => $data['relevantAreas'] ?? [],
            'relevant_levels' => $data['relevantLevels'] ?? [],
            'is_published' => $data['isPublished'] ?? false,
            'published_at' => ($data['isPublished'] ?? false) ? now() : null,
            'created_by' => $request->user()->id,
        ]);

        return ApiResponse::success($article->load('creator'), 'Artikel berhasil dibuat.', [], 201);
    }

    public function update(Request $request, ParentingArticle $article)
    {
        $data = $this->validated($request);
        $cover = $data['coverImageUrl'] ?? $article->cover_image_url;
        if ($request->hasFile('cover')) {
            $cover = $this->storePublicFile($request->file('cover'), 'articles');
        }

        $article->update([
            'title' => $data['title'],
            'content' => $data['content'],
            'cover_image_url' => $cover,
            'category' => $data['category'],
            'relevant_areas' => $data['relevantAreas'] ?? [],
            'relevant_levels' => $data['relevantLevels'] ?? [],
            'is_published' => $data['isPublished'] ?? $article->is_published,
            'published_at' => ($data['isPublished'] ?? $article->is_published) ? ($article->published_at ?? now()) : null,
        ]);

        return ApiResponse::success($article->fresh('creator'), 'Artikel berhasil diperbarui.');
    }

    public function publish(ParentingArticle $article)
    {
        $article->update(['is_published' => true, 'published_at' => now()]);

        return ApiResponse::success($article, 'Artikel berhasil dipublish.');
    }

    public function destroy(ParentingArticle $article)
    {
        $article->delete();

        return ApiResponse::success(null, 'Artikel berhasil dihapus.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'content' => ['required', 'string'],
            'cover' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'coverImageUrl' => ['nullable', 'url'],
            'category' => ['required', Rule::in(['montessori', 'islami', 'tumbuh_kembang', 'nutrisi', 'aktivitas_rumah'])],
            'relevantAreas' => ['nullable', 'array'],
            'relevantLevels' => ['nullable', 'array'],
            'isPublished' => ['boolean'],
        ]);
    }
}
