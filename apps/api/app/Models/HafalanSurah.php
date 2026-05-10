<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HafalanSurah extends Model
{
    protected $fillable = ['surah_number', 'name_arabic', 'name_latin', 'name_id', 'total_ayat', 'target_level', 'sort_order'];
}
