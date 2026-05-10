<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiManagerChatHistory extends Model
{
    protected $fillable = ['user_id', 'role', 'message', 'tokens_used'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
