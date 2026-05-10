<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentMilestone extends Model
{
    protected $fillable = ['student_id', 'milestone_id', 'status', 'observation_notes', 'observed_at', 'observed_by'];

    protected function casts(): array
    {
        return ['observed_at' => 'date'];
    }

    public function milestone()
    {
        return $this->belongsTo(MontessoriMilestone::class, 'milestone_id');
    }
}
