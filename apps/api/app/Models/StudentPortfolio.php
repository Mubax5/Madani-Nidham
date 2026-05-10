<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentPortfolio extends Model
{
    protected $fillable = ['student_id', 'class_id', 'uploaded_by', 'title', 'description', 'photo_urls', 'area_id', 'work_date', 'is_featured'];

    protected function casts(): array
    {
        return ['photo_urls' => 'array', 'work_date' => 'date', 'is_featured' => 'boolean'];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function class()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function area()
    {
        return $this->belongsTo(MontessoriArea::class, 'area_id');
    }
}
