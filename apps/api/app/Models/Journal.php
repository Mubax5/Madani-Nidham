<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Journal extends Model
{
    protected $fillable = ['student_id', 'class_id', 'teacher_id', 'date', 'content', 'photo_urls', 'mood', 'activities', 'is_published'];

    protected function casts(): array
    {
        return ['date' => 'date', 'photo_urls' => 'array', 'activities' => 'array', 'is_published' => 'boolean'];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function class()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
