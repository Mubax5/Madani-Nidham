<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Registration extends Model
{
    protected $fillable = [
        'registration_number',
        'academic_year_id',
        'child_name',
        'child_birth_date',
        'child_gender',
        'program_applied',
        'parent_name',
        'parent_phone',
        'parent_email',
        'address',
        'document_urls',
        'status',
        'reviewer_notes',
        'reviewed_by',
        'reviewed_at',
        'converted_student_id',
    ];

    protected function casts(): array
    {
        return ['child_birth_date' => 'date', 'document_urls' => 'array', 'reviewed_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(function (Registration $registration) {
            if ($registration->registration_number) {
                return;
            }

            $year = now()->year;
            $count = static::whereYear('created_at', $year)->count() + 1;
            $registration->registration_number = 'REG-'.$year.'-'.str_pad((string) $count, 3, '0', STR_PAD_LEFT);
        });
    }
}
