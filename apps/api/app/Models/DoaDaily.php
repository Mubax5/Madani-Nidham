<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DoaDaily extends Model
{
    protected $table = 'doa_daily';

    protected $fillable = ['name', 'arabic_text', 'latin_text', 'meaning', 'category', 'sort_order'];
}
