<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentFee extends Model
{
    protected $fillable = ['invoice_number', 'student_id', 'fee_type_id', 'academic_year_id', 'month', 'year', 'due_date', 'issued_at', 'amount', 'discount', 'unique_code', 'total_billed', 'paid_amount', 'status', 'bank_account_id', 'payment_proof_url', 'payment_history', 'paid_at', 'notes', 'confirmed_by'];

    protected function casts(): array
    {
        return ['payment_history' => 'array', 'due_date' => 'date', 'issued_at' => 'datetime', 'paid_at' => 'datetime'];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function feeType()
    {
        return $this->belongsTo(FeeType::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function bankAccount()
    {
        return $this->belongsTo(SchoolBankAccount::class, 'bank_account_id');
    }

    public function confirmer()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function payments()
    {
        return $this->hasMany(FeePayment::class);
    }
}
