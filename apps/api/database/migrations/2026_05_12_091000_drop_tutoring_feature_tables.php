<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('tutoring_bookings');
        Schema::dropIfExists('tutoring_sessions');
    }

    public function down(): void
    {
        // Bimbel feature intentionally removed from production scope.
    }
};
