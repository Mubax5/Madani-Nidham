<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentDoa extends Model
{
    protected $table = 'student_doa';

    protected $fillable = ['student_id', 'doa_id', 'status', 'completed_at', 'recorded_by'];

    protected function casts(): array
    {
        return ['completed_at' => 'date'];
    }

    public function doa()
    {
        return $this->belongsTo(DoaDaily::class, 'doa_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
