<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherPayroll extends Model
{
    protected $fillable = [
        'teacher_id',
        'month',
        'year',
        'base_salary',
        'incentive_amount',
        'deduction_amount',
        'status',
        'paid_at',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $appends = ['total_amount'];

    protected function casts(): array
    {
        return ['paid_at' => 'date:Y-m-d'];
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function getTotalAmountAttribute(): int
    {
        return max(($this->base_salary + $this->incentive_amount) - $this->deduction_amount, 0);
    }
}
