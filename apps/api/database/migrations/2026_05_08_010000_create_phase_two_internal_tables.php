<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('absence_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->constrained('users');
            $table->date('date');
            $table->enum('type', ['sakit', 'izin']);
            $table->text('reason');
            $table->string('document_url')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('reviewer_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('hafalan_surahs', function (Blueprint $table) {
            $table->id();
            $table->integer('surah_number');
            $table->string('name_arabic');
            $table->string('name_latin');
            $table->string('name_id');
            $table->integer('total_ayat');
            $table->enum('target_level', ['KB', 'TKA', 'TKB', 'TKC'])->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('student_hafalan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('surah_id')->constrained('hafalan_surahs')->cascadeOnDelete();
            $table->enum('status', ['belum', 'sedang_dihafal', 'lancar', 'mutqin'])->default('belum');
            $table->date('started_at')->nullable();
            $table->date('completed_at')->nullable();
            $table->integer('last_ayat_reached')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->unique(['student_id', 'surah_id']);
        });

        Schema::create('doa_daily', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('arabic_text');
            $table->text('latin_text');
            $table->text('meaning');
            $table->enum('category', ['ibadah', 'aktivitas_harian', 'adab'])->default('aktivitas_harian');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('student_doa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doa_id')->constrained('doa_daily')->cascadeOnDelete();
            $table->enum('status', ['belum', 'sedang_dipelajari', 'hafal'])->default('belum');
            $table->date('completed_at')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->unique(['student_id', 'doa_id']);
        });

        Schema::create('student_portfolios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('photo_urls');
            $table->foreignId('area_id')->nullable()->constrained('montessori_areas');
            $table->date('work_date');
            $table->boolean('is_featured')->default(false);
            $table->timestamps();
        });

        Schema::create('class_galleries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->string('event_name');
            $table->text('description')->nullable();
            $table->json('photo_urls');
            $table->date('event_date');
            $table->boolean('is_published')->default(true);
            $table->timestamps();
        });

        Schema::create('parenting_articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('content');
            $table->string('cover_image_url')->nullable();
            $table->enum('category', ['montessori', 'islami', 'tumbuh_kembang', 'nutrisi', 'aktivitas_rumah']);
            $table->json('relevant_areas')->nullable();
            $table->json('relevant_levels')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('ai_chat_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['user', 'model']);
            $table->text('message');
            $table->integer('tokens_used')->nullable();
            $table->timestamps();
        });

        Schema::create('school_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('bank_name');
            $table->string('account_number', 30);
            $table->string('account_holder');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('fee_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('amount');
            $table->integer('due_day')->default(10);
            $table->json('applicable_levels')->nullable();
            $table->boolean('is_recurring')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('student_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_type_id')->constrained();
            $table->foreignId('academic_year_id')->constrained();
            $table->integer('month');
            $table->integer('year');
            $table->integer('amount');
            $table->integer('discount')->default(0);
            $table->integer('unique_code')->default(0);
            $table->integer('total_billed');
            $table->integer('paid_amount')->default(0);
            $table->enum('status', ['unpaid', 'partial', 'paid', 'waived'])->default('unpaid');
            $table->foreignId('bank_account_id')->nullable()->constrained('school_bank_accounts');
            $table->string('payment_proof_url')->nullable();
            $table->json('payment_history')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->unique(['student_id', 'fee_type_id', 'year', 'month']);
        });

        Schema::create('tutoring_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users');
            $table->enum('type', ['calistung', 'pendampingan_belajar', 'bahasa']);
            $table->dateTime('scheduled_at');
            $table->integer('duration_minutes')->default(60);
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'rescheduled'])->default('scheduled');
            $table->text('session_notes')->nullable();
            $table->text('homework_notes')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('tutoring_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->constrained('users');
            $table->foreignId('teacher_id')->nullable()->constrained('users');
            $table->enum('type', ['calistung', 'pendampingan_belajar', 'bahasa']);
            $table->dateTime('preferred_at');
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'rejected'])->default('pending');
            $table->foreignId('confirmed_session_id')->nullable()->constrained('tutoring_sessions')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tutoring_bookings');
        Schema::dropIfExists('tutoring_sessions');
        Schema::dropIfExists('student_fees');
        Schema::dropIfExists('fee_types');
        Schema::dropIfExists('school_bank_accounts');
        Schema::dropIfExists('ai_chat_histories');
        Schema::dropIfExists('parenting_articles');
        Schema::dropIfExists('class_galleries');
        Schema::dropIfExists('student_portfolios');
        Schema::dropIfExists('student_doa');
        Schema::dropIfExists('doa_daily');
        Schema::dropIfExists('student_hafalan');
        Schema::dropIfExists('hafalan_surahs');
        Schema::dropIfExists('absence_requests');
    }
};
