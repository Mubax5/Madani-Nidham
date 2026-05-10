<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AbsenceRequest extends Model
{
    protected $fillable = ['student_id', 'requested_by', 'date', 'type', 'reason', 'document_url', 'status', 'reviewed_by', 'reviewed_at', 'reviewer_notes'];

    protected function casts(): array
    {
        return ['date' => 'date', 'reviewed_at' => 'datetime'];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
