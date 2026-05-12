<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->unique()->after('photo_url');
            $table->string('google_avatar_url')->nullable()->after('google_id');
            $table->timestamp('google_linked_at')->nullable()->after('last_login_at');
            $table->timestamp('password_changed_at')->nullable()->after('google_linked_at');
            $table->string('last_login_ip', 45)->nullable()->after('password_changed_at');
            $table->text('last_login_user_agent')->nullable()->after('last_login_ip');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->string('program_type', 30)->default('regular')->after('join_date')->index();
        });

        Schema::table('student_classes', function (Blueprint $table) {
            $table->string('program_type', 30)->nullable()->after('academic_year_id')->index();
        });

        Schema::table('registrations', function (Blueprint $table) {
            $table->string('program_type', 30)->default('regular')->after('program_applied')->index();
        });
    }

    public function down(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->dropColumn('program_type');
        });

        Schema::table('student_classes', function (Blueprint $table) {
            $table->dropColumn('program_type');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('program_type');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_id']);
            $table->dropColumn([
                'google_id',
                'google_avatar_url',
                'google_linked_at',
                'password_changed_at',
                'last_login_ip',
                'last_login_user_agent',
            ]);
        });
    }
};
