<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollment_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('registration_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('student_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category', 40);
            $table->string('full_name');
            $table->string('program_level', 20)->nullable();
            $table->string('address')->nullable();
            $table->integer('target_amount')->nullable();
            $table->integer('paid_amount')->default(0);
            $table->string('payment_status', 30)->default('unpaid');
            $table->string('confirmation_status', 30)->default('pending');
            $table->text('source_text')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['academic_year_id', 'category']);
            $table->index(['payment_status', 'confirmation_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollment_updates');
    }
};
