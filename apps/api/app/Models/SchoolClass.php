<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolClass extends Model
{
    protected $table = 'classes';

    protected $fillable = ['academic_year_id', 'teacher_id', 'name', 'level', 'capacity'];

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function students()
    {
        return $this->belongsToMany(Student::class, 'student_classes', 'class_id', 'student_id')
            ->withPivot(['academic_year_id', 'status'])
            ->withTimestamps();
    }
}
