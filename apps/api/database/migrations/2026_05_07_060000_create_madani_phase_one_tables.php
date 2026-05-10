<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_years', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->enum('level', ['KB', 'TK A', 'TK B', 'TK C']);
            $table->unsignedInteger('capacity')->default(15);
            $table->timestamps();
        });

        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('nis', 20)->unique()->nullable();
            $table->string('full_name');
            $table->string('nickname', 50)->nullable();
            $table->date('birth_date');
            $table->string('birth_place', 100)->nullable();
            $table->enum('gender', ['L', 'P']);
            $table->string('photo_url')->nullable();
            $table->text('address')->nullable();
            $table->string('blood_type', 5)->nullable();
            $table->text('allergy_notes')->nullable();
            $table->text('medical_notes')->nullable();
            $table->date('join_date');
            $table->enum('status', ['active', 'inactive', 'alumni'])->default('active');
            $table->timestamps();
        });

        Schema::create('student_parents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('relation', ['ayah', 'ibu', 'wali']);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->unique(['student_id', 'user_id']);
        });

        Schema::create('student_classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['active', 'transferred', 'graduated'])->default('active');
            $table->timestamps();
            $table->unique(['student_id', 'academic_year_id']);
        });

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->enum('status', ['hadir', 'izin', 'sakit', 'alfa']);
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->constrained('users');
            $table->time('check_in_time')->nullable();
            $table->timestamps();
            $table->unique(['student_id', 'date']);
        });

        Schema::create('journals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users');
            $table->date('date');
            $table->text('content');
            $table->json('photo_urls')->nullable();
            $table->enum('mood', ['happy', 'neutral', 'sad', 'energetic', 'tired'])->nullable();
            $table->json('activities')->nullable();
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->unique(['student_id', 'date']);
        });

        Schema::create('montessori_areas', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('color_hex', 7)->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('montessori_milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('area_id')->constrained('montessori_areas')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('age_min_months')->nullable();
            $table->integer('age_max_months')->nullable();
            $table->enum('level', ['KB', 'TK A', 'TK B', 'TK C'])->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('student_milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('milestone_id')->constrained('montessori_milestones')->cascadeOnDelete();
            $table->enum('status', ['not_started', 'introduced', 'in_progress', 'mastered'])->default('not_started');
            $table->text('observation_notes')->nullable();
            $table->date('observed_at')->nullable();
            $table->foreignId('observed_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->unique(['student_id', 'milestone_id']);
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->constrained()->cascadeOnDelete();
            $table->enum('semester', ['1', '2']);
            $table->text('general_notes')->nullable();
            $table->text('character_notes')->nullable();
            $table->text('recommendation')->nullable();
            $table->string('pdf_url')->nullable();
            $table->string('signed_pdf_url')->nullable();
            $table->enum('signature_status', ['unsigned', 'visual_signed', 'psre_pending', 'psre_signed', 'psre_failed'])->default('unsigned');
            $table->timestamp('signed_at')->nullable();
            $table->foreignId('signed_by')->nullable()->constrained('users');
            $table->string('psre_provider')->nullable();
            $table->string('psre_document_id')->nullable();
            $table->json('signature_certificate_info')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->unique(['student_id', 'academic_year_id', 'semester']);
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('content');
            $table->enum('target', ['all', 'class', 'specific_parents']);
            $table->json('target_class_ids')->nullable();
            $table->json('target_user_ids')->nullable();
            $table->string('image_url')->nullable();
            $table->boolean('is_urgent')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->foreignId('published_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('school_agendas', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('location')->nullable();
            $table->enum('type', ['libur', 'kegiatan', 'rapat', 'lomba', 'penerimaan'])->default('kegiatan');
            $table->boolean('affects_attendance')->default(false);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('registrations', function (Blueprint $table) {
            $table->id();
            $table->string('registration_number')->unique();
            $table->foreignId('academic_year_id')->nullable()->constrained();
            $table->string('child_name');
            $table->date('child_birth_date');
            $table->enum('child_gender', ['L', 'P']);
            $table->enum('program_applied', ['KB', 'TK A', 'TK B', 'TK C']);
            $table->string('parent_name');
            $table->string('parent_phone', 20);
            $table->string('parent_email');
            $table->text('address');
            $table->json('document_urls')->nullable();
            $table->enum('status', ['pending', 'under_review', 'accepted', 'rejected', 'waitlist'])->default('pending');
            $table->text('reviewer_notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('converted_student_id')->nullable()->constrained('students');
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('body');
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value')->nullable();
            $table->string('type')->default('text');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('registrations');
        Schema::dropIfExists('school_agendas');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('reports');
        Schema::dropIfExists('student_milestones');
        Schema::dropIfExists('montessori_milestones');
        Schema::dropIfExists('montessori_areas');
        Schema::dropIfExists('journals');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('student_classes');
        Schema::dropIfExists('student_parents');
        Schema::dropIfExists('students');
        Schema::dropIfExists('classes');
        Schema::dropIfExists('academic_years');
    }
};
