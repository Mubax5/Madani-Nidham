<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->index(['status', 'id']);
            $table->index('full_name');
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->index(['level', 'id']);
            $table->index(['academic_year_id', 'id']);
            $table->index(['teacher_id', 'id']);
        });

        Schema::table('student_classes', function (Blueprint $table) {
            $table->index(['class_id', 'status']);
            $table->index(['student_id', 'class_id']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->index(['date', 'status']);
            $table->index(['class_id', 'date']);
            $table->index(['student_id', 'date']);
        });

        Schema::table('journals', function (Blueprint $table) {
            $table->index(['date', 'class_id']);
            $table->index(['student_id', 'date']);
            $table->index(['class_id', 'date']);
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->index(['academic_year_id', 'semester']);
            $table->index(['class_id', 'id']);
        });

        Schema::table('registrations', function (Blueprint $table) {
            $table->index(['status', 'id']);
            $table->index(['academic_year_id', 'id']);
        });

        Schema::table('school_agendas', function (Blueprint $table) {
            $table->index(['start_date', 'id']);
        });

        Schema::table('announcements', function (Blueprint $table) {
            $table->index(['published_at', 'id']);
        });

        Schema::table('montessori_milestones', function (Blueprint $table) {
            $table->index(['area_id', 'sort_order']);
            $table->index(['level', 'sort_order']);
        });

        Schema::table('student_milestones', function (Blueprint $table) {
            $table->index(['student_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('student_milestones', function (Blueprint $table) {
            $table->dropIndex(['student_id', 'status']);
        });

        Schema::table('montessori_milestones', function (Blueprint $table) {
            $table->dropIndex(['area_id', 'sort_order']);
            $table->dropIndex(['level', 'sort_order']);
        });

        Schema::table('announcements', function (Blueprint $table) {
            $table->dropIndex(['published_at', 'id']);
        });

        Schema::table('school_agendas', function (Blueprint $table) {
            $table->dropIndex(['start_date', 'id']);
        });

        Schema::table('registrations', function (Blueprint $table) {
            $table->dropIndex(['status', 'id']);
            $table->dropIndex(['academic_year_id', 'id']);
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->dropIndex(['academic_year_id', 'semester']);
            $table->dropIndex(['class_id', 'id']);
        });

        Schema::table('journals', function (Blueprint $table) {
            $table->dropIndex(['date', 'class_id']);
            $table->dropIndex(['student_id', 'date']);
            $table->dropIndex(['class_id', 'date']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex(['date', 'status']);
            $table->dropIndex(['class_id', 'date']);
            $table->dropIndex(['student_id', 'date']);
        });

        Schema::table('student_classes', function (Blueprint $table) {
            $table->dropIndex(['class_id', 'status']);
            $table->dropIndex(['student_id', 'class_id']);
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->dropIndex(['level', 'id']);
            $table->dropIndex(['academic_year_id', 'id']);
            $table->dropIndex(['teacher_id', 'id']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropIndex(['status', 'id']);
            $table->dropIndex(['full_name']);
        });
    }
};
