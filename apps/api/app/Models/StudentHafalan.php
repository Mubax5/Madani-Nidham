<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentHafalan extends Model
{
    protected $table = 'student_hafalan';

    protected $fillable = ['student_id', 'surah_id', 'status', 'started_at', 'completed_at', 'last_ayat_reached', 'notes', 'recorded_by'];

    protected function casts(): array
    {
        return ['started_at' => 'date', 'completed_at' => 'date'];
    }

    public function surah()
    {
        return $this->belongsTo(HafalanSurah::class, 'surah_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
