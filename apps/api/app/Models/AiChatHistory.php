<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiChatHistory extends Model
{
    protected $fillable = ['user_id', 'student_id', 'role', 'message', 'tokens_used'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
