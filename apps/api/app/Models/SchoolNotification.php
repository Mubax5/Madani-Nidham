<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolNotification extends Model
{
    protected $table = 'notifications';

    protected $fillable = ['user_id', 'title', 'body', 'data', 'read_at'];

    protected function casts(): array
    {
        return ['data' => 'array', 'read_at' => 'datetime'];
    }
}
