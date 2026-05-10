<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = [
        'student_id',
        'class_id',
        'academic_year_id',
        'semester',
        'general_notes',
        'character_notes',
        'recommendation',
        'pdf_url',
        'signed_pdf_url',
        'signature_status',
        'signed_at',
        'signed_by',
        'psre_provider',
        'psre_document_id',
        'signature_certificate_info',
        'published_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'signed_at' => 'datetime',
            'signature_certificate_info' => 'array',
        ];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function class()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }
}
