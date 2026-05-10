<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $fillable = ['title', 'content', 'target', 'target_class_ids', 'target_user_ids', 'image_url', 'is_urgent', 'published_at', 'published_by'];

    protected function casts(): array
    {
        return ['target_class_ids' => 'array', 'target_user_ids' => 'array', 'is_urgent' => 'boolean', 'published_at' => 'datetime'];
    }
}
