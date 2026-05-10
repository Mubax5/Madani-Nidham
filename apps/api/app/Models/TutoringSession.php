<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TutoringSession extends Model
{
    protected $fillable = ['student_id', 'teacher_id', 'type', 'scheduled_at', 'duration_minutes', 'status', 'session_notes', 'homework_notes', 'cancel_reason'];

    protected function casts(): array
    {
        return ['scheduled_at' => 'datetime'];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
