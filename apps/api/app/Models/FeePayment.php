<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeePayment extends Model
{
    protected $fillable = ['student_fee_id', 'bank_account_id', 'uploaded_by', 'received_amount', 'confirmed_amount', 'proof_url', 'status', 'payer_notes', 'admin_notes', 'confirmed_by', 'confirmed_at', 'rejected_by', 'rejected_at'];

    protected function casts(): array
    {
        return ['confirmed_at' => 'datetime', 'rejected_at' => 'datetime'];
    }

    public function fee()
    {
        return $this->belongsTo(StudentFee::class, 'student_fee_id');
    }

    public function bankAccount()
    {
        return $this->belongsTo(SchoolBankAccount::class, 'bank_account_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function confirmer()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
