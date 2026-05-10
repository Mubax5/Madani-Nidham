<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ParentingArticle extends Model
{
    protected $fillable = ['title', 'content', 'cover_image_url', 'category', 'relevant_areas', 'relevant_levels', 'is_published', 'published_at', 'created_by'];

    protected function casts(): array
    {
        return ['relevant_areas' => 'array', 'relevant_levels' => 'array', 'is_published' => 'boolean', 'published_at' => 'datetime'];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
