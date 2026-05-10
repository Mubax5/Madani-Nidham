<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TutoringBooking extends Model
{
    protected $fillable = ['student_id', 'requested_by', 'teacher_id', 'type', 'preferred_at', 'notes', 'status', 'confirmed_session_id', 'reviewed_by', 'reviewed_at'];

    protected function casts(): array
    {
        return ['preferred_at' => 'datetime', 'reviewed_at' => 'datetime'];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function session()
    {
        return $this->belongsTo(TutoringSession::class, 'confirmed_session_id');
    }
}
