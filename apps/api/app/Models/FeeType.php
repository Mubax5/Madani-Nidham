<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeeType extends Model
{
    protected $fillable = ['name', 'amount', 'due_day', 'applicable_levels', 'applicable_programs', 'is_recurring', 'is_active'];

    protected function casts(): array
    {
        return ['applicable_levels' => 'array', 'applicable_programs' => 'array', 'is_recurring' => 'boolean', 'is_active' => 'boolean'];
    }
}
