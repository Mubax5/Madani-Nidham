<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiChatUsage extends Model
{
    protected $fillable = ['user_id', 'usage_date', 'minute_bucket', 'requests_used', 'tokens_used'];

    protected function casts(): array
    {
        return ['usage_date' => 'date', 'minute_bucket' => 'datetime'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
