<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MontessoriArea extends Model
{
    protected $fillable = ['name', 'description', 'color_hex', 'sort_order'];

    public function milestones()
    {
        return $this->hasMany(MontessoriMilestone::class, 'area_id');
    }
}
