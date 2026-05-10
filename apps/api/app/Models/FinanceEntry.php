<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinanceEntry extends Model
{
    protected $fillable = [
        'type',
        'category',
        'title',
        'amount',
        'entry_date',
        'source',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return ['entry_date' => 'date:Y-m-d'];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
