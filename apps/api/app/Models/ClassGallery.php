<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassGallery extends Model
{
    protected $fillable = ['class_id', 'uploaded_by', 'event_name', 'description', 'photo_urls', 'event_date', 'is_published'];

    protected function casts(): array
    {
        return ['photo_urls' => 'array', 'event_date' => 'date', 'is_published' => 'boolean'];
    }

    public function class()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
