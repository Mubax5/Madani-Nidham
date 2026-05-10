<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MontessoriMilestone extends Model
{
    protected $fillable = ['area_id', 'name', 'description', 'age_min_months', 'age_max_months', 'level', 'sort_order'];

    public function area()
    {
        return $this->belongsTo(MontessoriArea::class, 'area_id');
    }
}
