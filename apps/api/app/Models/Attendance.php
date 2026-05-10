<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = ['student_id', 'class_id', 'date', 'status', 'notes', 'recorded_by', 'check_in_time'];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function class()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }
}
