<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_entries', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['income', 'expense']);
            $table->enum('category', ['operational', 'donation', 'asset', 'maintenance', 'other']);
            $table->string('title');
            $table->integer('amount');
            $table->date('entry_date');
            $table->string('source')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['type', 'category', 'entry_date']);
        });

        Schema::create('teacher_payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->integer('month');
            $table->integer('year');
            $table->integer('base_salary')->default(0);
            $table->integer('incentive_amount')->default(0);
            $table->integer('deduction_amount')->default(0);
            $table->enum('status', ['draft', 'approved', 'paid', 'cancelled'])->default('draft');
            $table->date('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['teacher_id', 'month', 'year']);
            $table->index(['year', 'month', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_payrolls');
        Schema::dropIfExists('finance_entries');
    }
};
