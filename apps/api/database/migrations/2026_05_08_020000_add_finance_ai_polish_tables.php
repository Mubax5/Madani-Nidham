<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_fees', function (Blueprint $table) {
            $table->string('invoice_number')->nullable()->unique()->after('id');
            $table->date('due_date')->nullable()->after('year');
            $table->timestamp('issued_at')->nullable()->after('due_date');
            $table->index(['due_date', 'status']);
        });

        Schema::create('fee_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_fee_id')->constrained('student_fees')->cascadeOnDelete();
            $table->foreignId('bank_account_id')->nullable()->constrained('school_bank_accounts');
            $table->foreignId('uploaded_by')->nullable()->constrained('users');
            $table->integer('received_amount');
            $table->integer('confirmed_amount')->nullable();
            $table->string('proof_url')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'rejected'])->default('pending');
            $table->text('payer_notes')->nullable();
            $table->text('admin_notes')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users');
            $table->timestamp('confirmed_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users');
            $table->timestamp('rejected_at')->nullable();
            $table->timestamps();
            $table->index(['student_fee_id', 'status']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('ai_chat_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('usage_date');
            $table->dateTime('minute_bucket');
            $table->integer('requests_used')->default(0);
            $table->integer('tokens_used')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'usage_date', 'minute_bucket']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_chat_usages');
        Schema::dropIfExists('fee_payments');

        Schema::table('student_fees', function (Blueprint $table) {
            $table->dropIndex(['due_date', 'status']);
            $table->dropUnique('student_fees_invoice_number_unique');
            $table->dropColumn(['invoice_number', 'due_date', 'issued_at']);
        });
    }
};
