<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    protected $fillable = [
        'nis',
        'full_name',
        'nickname',
        'birth_date',
        'birth_place',
        'gender',
        'photo_url',
        'address',
        'blood_type',
        'allergy_notes',
        'medical_notes',
        'join_date',
        'status',
    ];

    protected function casts(): array
    {
        return ['birth_date' => 'date', 'join_date' => 'date'];
    }

    public function parents()
    {
        return $this->belongsToMany(User::class, 'student_parents')
            ->withPivot(['relation', 'is_primary'])
            ->withTimestamps();
    }

    public function classes()
    {
        return $this->belongsToMany(SchoolClass::class, 'student_classes', 'student_id', 'class_id')
            ->withPivot(['academic_year_id', 'status'])
            ->withTimestamps();
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function journals()
    {
        return $this->hasMany(Journal::class);
    }

    public function studentMilestones()
    {
        return $this->hasMany(StudentMilestone::class);
    }

    public function hafalan()
    {
        return $this->hasMany(StudentHafalan::class);
    }

    public function doaProgress()
    {
        return $this->hasMany(StudentDoa::class);
    }

    public function portfolios()
    {
        return $this->hasMany(StudentPortfolio::class);
    }

    public function fees()
    {
        return $this->hasMany(StudentFee::class);
    }

    public function tutoringSessions()
    {
        return $this->hasMany(TutoringSession::class);
    }

    public function getActiveClassAttribute()
    {
        $loaded = $this->relationLoaded('classes')
            ? $this->classes->first(fn ($class) => $class->pivot?->status === 'active')
            : null;

        return $loaded ?? $this->classes()->wherePivot('status', 'active')->latest('student_classes.id')->first();
    }
}
