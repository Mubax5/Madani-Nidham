<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnrollmentUpdate extends Model
{
    public const FINANCIAL_CATEGORIES = ['new_student', 're_registration'];

    protected $fillable = [
        'academic_year_id',
        'registration_id',
        'student_id',
        'category',
        'full_name',
        'program_level',
        'address',
        'target_amount',
        'paid_amount',
        'payment_status',
        'confirmation_status',
        'source_text',
        'notes',
        'updated_by',
    ];

    protected $appends = ['outstanding_amount', 'is_financial'];

    protected function casts(): array
    {
        return [
            'target_amount' => 'integer',
            'paid_amount' => 'integer',
        ];
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function registration()
    {
        return $this->belongsTo(Registration::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function getOutstandingAmountAttribute(): int
    {
        if ($this->target_amount === null) {
            return 0;
        }

        return max($this->target_amount - $this->paid_amount, 0);
    }

    public function getIsFinancialAttribute(): bool
    {
        return in_array($this->category, self::FINANCIAL_CATEGORIES, true);
    }
}
